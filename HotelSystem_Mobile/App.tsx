import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

type PaymentRow = {
  paymentCode: string;
  bookingId: string;
  bookingCode: string;
  amount: number;
  status: string;
};

type Screen = 'home' | 'scan' | 'detail';

function extractPaymentCode(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s);
      const c = u.searchParams.get('code');
      if (c) return decodeURIComponent(c).trim();
    }
  } catch {
    /* ignore */
  }
  if (/^PAY-/i.test(s)) return s;
  return s.length >= 6 ? s : null;
}

function buildWsUrl(apiOrigin: string): string {
  const origin = apiOrigin.replace(/\/$/, '');
  const ws =
    origin.startsWith('https://') ? `wss://${origin.slice('https://'.length)}` : `ws://${origin.slice('http://'.length)}`;
  return `${ws}/payment-api/ws/payments`;
}

async function fetchPayment(apiOrigin: string, paymentCode: string): Promise<PaymentRow> {
  const url = `${apiOrigin.replace(/\/$/, '')}/payment-api/payments/checkin-qr?code=${encodeURIComponent(paymentCode)}`;
  const res = await fetch(url);
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Phản hồi không phải JSON');
  }
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : `HTTP ${res.status}`);
  }
  return {
    paymentCode: String(body.paymentCode ?? paymentCode),
    bookingId: String(body.bookingId ?? ''),
    bookingCode: String(body.bookingCode ?? body.bookingId ?? ''),
    amount: Number(body.amount ?? 0),
    status: String(body.status ?? ''),
  };
}

async function postConfirm(apiOrigin: string, paymentCode: string): Promise<PaymentRow> {
  const url = `${apiOrigin.replace(/\/$/, '')}/payment-api/payments/${encodeURIComponent(paymentCode)}/confirm`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Phản hồi không phải JSON');
  }
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : `HTTP ${res.status}`);
  }
  return {
    paymentCode: String(body.paymentCode ?? paymentCode),
    bookingId: String(body.bookingId ?? ''),
    bookingCode: String(body.bookingCode ?? body.bookingId ?? ''),
    amount: Number(body.amount ?? 0),
    status: String(body.status ?? ''),
  };
}

function formatMoney(v: number) {
  return `${Math.round(Number(v || 0)).toLocaleString('vi-VN')}đ`;
}

export default function App() {
  const initialOrigin = useMemo(() => {
    const extra = Constants.expoConfig?.extra as { apiOrigin?: string } | undefined;
    return (extra?.apiOrigin || 'http://192.168.1.6:3000').replace(/\/$/, '');
  }, []);

  const [apiOrigin, setApiOrigin] = useState(initialOrigin);
  const [screen, setScreen] = useState<Screen>('home');
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [wsHint, setWsHint] = useState<string>('Socket: chưa bật');
  const scanConsumed = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  const loadDetail = useCallback(
    async (code: string) => {
      setLoadingDetail(true);
      try {
        setPayment(await fetchPayment(apiOrigin, code));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Không tải được giao dịch';
        Alert.alert('Lỗi', msg);
        setScreen('home');
        setPaymentCode(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [apiOrigin]
  );

  useEffect(() => {
    if (screen !== 'detail' || !paymentCode) return;
    loadDetail(paymentCode);
  }, [screen, paymentCode, loadDetail]);

  useEffect(() => {
    if (screen !== 'detail' || !paymentCode) return;
    const wsUrl = buildWsUrl(apiOrigin);
    setWsHint('Socket: đang kết nối…');
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'payment:join', paymentCode }));
      setWsHint('Socket: đã join payment (demo)');
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data?.payload?.paymentCode !== paymentCode) return;
        if (data.event === 'payment:success') {
          setWsHint('Socket: payment:success ✓');
          loadDetail(paymentCode);
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => setWsHint('Socket: lỗi (kiểm tra IP / Vite đang chạy)');
    ws.onclose = () => setWsHint((h) => (h.startsWith('Socket: đã join') ? 'Socket: đã đóng' : h));
    return () => {
      ws.close();
    };
  }, [screen, paymentCode, apiOrigin, loadDetail]);

  const openScan = async () => {
    scanConsumed.current = false;
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Cần quyền camera', 'Bật quyền camera để quét QR.');
        return;
      }
    }
    setScreen('scan');
  };

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanConsumed.current) return;
      const code = extractPaymentCode(data);
      if (!code) {
        Alert.alert('QR không hợp lệ', data.slice(0, 120));
        return;
      }
      scanConsumed.current = true;
      setPaymentCode(code);
      setScreen('detail');
    },
    []
  );

  const submitManualCode = () => {
    const code = extractPaymentCode(manualCode);
    if (!code) {
      Alert.alert('Sai mã', 'Nhập PAY-… hoặc URL có ?code=');
      return;
    }
    setPaymentCode(code);
    setScreen('detail');
  };

  const doConfirm = async () => {
    if (!paymentCode) return;
    setConfirming(true);
    try {
      const row = await postConfirm(apiOrigin, paymentCode);
      setPayment(row);
      Alert.alert('Đã xác nhận', `Trạng thái: ${row.status}`);
    } catch (e: unknown) {
      Alert.alert('Không xác nhận được', e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setConfirming(false);
    }
  };

  const padTop = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) + 8 : 52;

  if (screen === 'scan') {
    return (
      <View style={styles.scanWrap}>
        <ExpoStatusBar style="light" />
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={[styles.scanBar, { paddingTop: padTop }]}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('home')}>
            <Text style={styles.btnGhostText}>← Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.scanTitle}>Đưa QR vào khung</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.root, { paddingTop: padTop }]} contentContainerStyle={styles.scrollInner}>
      <ExpoStatusBar style="dark" />
      <Text style={styles.h1}>HotelSystem · Demo QR</Text>
      <Text style={styles.sub}>Quét mã nhân viên hiển thị (cùng Wi‑Fi). API qua proxy Vite :3000.</Text>

      <Text style={styles.label}>Máy chủ (IP laptop + cổng frontend)</Text>
      <TextInput
        style={styles.input}
        value={apiOrigin}
        onChangeText={(t) => setApiOrigin(t.trim())}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.x.x:3000"
      />

      {screen === 'home' && (
        <>
          <TouchableOpacity style={styles.btnPrimary} onPress={openScan}>
            <Text style={styles.btnPrimaryText}>Quét QR thanh toán</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 16 }]}>Hoặc nhập mã / dán URL</Text>
          <TextInput
            style={[styles.input, { minHeight: 72 }]}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="none"
            multiline
            placeholder="PAY-20260502-123 hoặc http://192.168…/payment/confirm?code=…"
          />
          <TouchableOpacity style={styles.btnSecondary} onPress={submitManualCode}>
            <Text style={styles.btnSecondaryText}>Mở giao dịch</Text>
          </TouchableOpacity>
        </>
      )}

      {screen === 'detail' && paymentCode && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi tiết</Text>
          {loadingDetail || !payment ? (
            <ActivityIndicator size="large" color="#0284c7" />
          ) : (
            <>
              <Row label="Mã" value={payment.paymentCode} />
              <Row label="Booking" value={payment.bookingCode} />
              <Row label="Số tiền" value={formatMoney(payment.amount)} accent />
              <Row label="Trạng thái" value={payment.status} />
              <Text style={styles.ws}>{wsHint}</Text>
              <TouchableOpacity
                style={[styles.btnPrimary, payment.status !== 'PENDING' && styles.btnDisabled]}
                disabled={payment.status !== 'PENDING' || confirming}
                onPress={doConfirm}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Xác nhận đã thanh toán</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.btnGhostMargin}
            onPress={() => {
              setScreen('home');
              setPaymentCode(null);
              setPayment(null);
            }}
          >
            <Text style={styles.link}>← Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && styles.rowAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scrollInner: { paddingHorizontal: 20, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 6, fontSize: 14, color: '#64748b', lineHeight: 20 },
  label: { marginTop: 14, fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  btnPrimary: {
    marginTop: 18,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSecondary: {
    marginTop: 10,
    backgroundColor: '#e0f2fe',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#0369a1', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
  card: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12, color: '#0f172a' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, gap: 12 },
  rowLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', flexShrink: 1, textAlign: 'right' },
  rowAccent: { color: '#0369a1' },
  ws: { marginTop: 12, fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  btnGhostMargin: { marginTop: 16, alignItems: 'center' },
  link: { color: '#0284c7', fontWeight: '700', fontSize: 14 },
  scanWrap: { flex: 1, backgroundColor: '#000' },
  scanBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginTop: 8 },
  btnGhost: { alignSelf: 'flex-start', paddingVertical: 6 },
  btnGhostText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
