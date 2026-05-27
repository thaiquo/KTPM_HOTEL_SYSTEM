import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import { paymentApi } from '../../../services/api';

type ResultStatus = 'loading' | 'success' | 'failed';

const FALLBACK_ERROR = 'Khong the tai ket qua thanh toan. Vui long kiem tra ket noi hoac thu lai.';

const SUCCESS_HINTS = /success|paid|completed|approved/i;

const firstParam = (searchParams: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) return value;
  }
  return '';
};

export default function PaymentResultPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const hasFetched = useRef(false);
  const hasCleared = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');

  const code = firstParam(searchParams, ['code', 'resultCode', 'vnp_ResponseCode', 'responseCode']);
  const message = firstParam(searchParams, ['message', 'orderInfo', 'errorMessage']);
  const bookingId = firstParam(searchParams, ['bookingId', 'booking_id']);
  const paymentType = firstParam(searchParams, ['paymentType', 'type']);
  const paymentStatus = firstParam(searchParams, ['paymentStatus', 'status']);
  const normalizedGatewayState = `${code} ${message} ${paymentStatus}`.trim();
  const successFromGateway = ['00', '0'].includes(code) || SUCCESS_HINTS.test(normalizedGatewayState);

  const loadResult = async () => {
    setError('');
    setSyncWarning('');

    if (!successFromGateway) {
      setStatus('failed');
      setError(message || 'Thanh toan chua thanh cong. Vui long thu lai.');
      return;
    }

    setStatus('success');

    if (!hasCleared.current) {
      clearCart();
      hasCleared.current = true;
    }

    try {
      if (bookingId) {
        await paymentApi.getByBooking(bookingId);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const messageText = err?.userMessage || err?.response?.data?.message || err?.message || FALLBACK_ERROR;
      console.error('[PaymentResultPage] Failed to verify payment record', {
        bookingId,
        code,
        paymentType,
        paymentStatus,
        message,
        error: messageText,
      });
      setSyncWarning(messageText);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!hasFetched.current) {
      hasFetched.current = true;
      void loadResult();
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const retry = () => {
    hasFetched.current = true;
    void loadResult();
  };

  const success = status === 'success';
  const loading = status === 'loading';

  return (
    <div className="min-h-screen bg-background py-16 pb-32">
      <div className="mx-auto max-w-2xl px-6">
        <Card className="p-10 text-center border-outline-variant/10 shadow-xl">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              loading
                ? 'bg-primary/10 text-primary'
                : success
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-error/10 text-error'
            }`}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={34} />
            ) : success ? (
              <CheckCircle2 size={36} />
            ) : (
              <XCircle size={36} />
            )}
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-on-surface font-headline">
            {loading ? 'Dang tai ket qua thanh toan...' : success ? 'Thanh toan thanh cong!' : 'Thanh toan chua hoan tat'}
          </h1>
          <p className="mt-3 text-on-surface-variant font-medium">
            {loading
              ? 'He thong dang xac minh trang thai thanh toan. Neu API qua cham, trang se dung loading va cho phep thu lai.'
              : success
                ? paymentType === 'DEPOSIT'
                  ? 'Booking cua ban da duoc ghi nhan da coc 50%. Vui long thanh toan phan con lai khi nhan phong.'
                  : 'Booking cua ban da duoc xac nhan thanh toan.'
                : error || FALLBACK_ERROR}
          </p>

          {success && syncWarning && (
            <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-left text-sm font-medium text-amber-900">
              Da xac nhan ket qua thanh toan, nhung he thong chua dong bo xong danh sach booking: {syncWarning}
            </div>
          )}

          {bookingId && (
            <div className="mt-6 rounded-2xl bg-surface-container-high px-5 py-4 text-sm font-bold text-on-surface-variant">
              Booking #{bookingId}
            </div>
          )}

          {success && bookingId && (
            <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-left">
              <div className="text-sm font-black text-on-surface">Thong tin thanh toan da duoc ghi nhan</div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-on-surface-variant">
                Neu danh sach booking chua cap nhat ngay, vui long lam moi trang sau vai giay de cho backend dong bo trang thai.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!loading && !success && (
              <Button onClick={retry} className="w-full sm:w-auto rounded-2xl px-8">
                Thu lai
              </Button>
            )}
            <Link to="/my-bookings">
              <Button className="w-full sm:w-auto rounded-2xl px-8">Xem booking cua toi</Button>
            </Link>
            <Link to="/rooms">
              <Button variant="outline" className="w-full sm:w-auto rounded-2xl px-8">Tim phong khac</Button>
            </Link>
            {!user && (
              <Link to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}>
                <Button variant="outline" className="w-full sm:w-auto rounded-2xl px-8">Dang nhap</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
