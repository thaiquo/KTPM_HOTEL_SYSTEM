import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineCash, HiOutlineClipboardCheck, HiOutlineSearch, HiOutlineUserGroup, HiX } from 'react-icons/hi';
import * as QRCode from 'qrcode';
import { paymentApi, staffBookingApi, vietnamTodayISO, type CheckinQrPayment, type CheckoutResponse } from '../../../services/api';
import { roomApi } from '../../../services/roomApi';
import type { Booking, BookingGuest, BookingItem, Room } from '../../../types';

type BookingRoomRow = BookingItem & { room?: Room };
type StaffStayTab = 'CHECK_IN' | 'IN_HOUSE' | 'CHECK_OUT' | 'BOOKINGS';
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';
type QrStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
type CheckoutDraft = {
  serviceCharge: string;
  damageFee: string;
  note: string;
  selectedServiceName: string;
  selectedServiceQty: number;
  serviceLines: Array<{ name: string; quantity: number; unitPrice: number }>;
};

const SERVICE_CATALOG = [
  { group: 'Đồ ăn & thức uống', name: 'Minibar', price: 80000 },
  { group: 'Đồ ăn & thức uống', name: 'Nước suối', price: 15000 },
  { group: 'Đồ ăn & thức uống', name: 'Bia / nước ngọt', price: 35000 },
  { group: 'Đồ ăn & thức uống', name: 'Snack', price: 30000 },
  { group: 'Room Service', name: 'Đồ ăn', price: 180000 },
  { group: 'Room Service', name: 'Cà phê', price: 45000 },
  { group: 'Giặt ủi', name: 'Giặt thường', price: 70000 },
  { group: 'Giặt ủi', name: 'Giặt nhanh', price: 120000 },
  { group: 'Hư hỏng', name: 'Vỡ ly', price: 80000 },
  { group: 'Hư hỏng', name: 'Mất khăn', price: 150000 },
  { group: 'Hư hỏng', name: 'Hỏng remote', price: 300000 },
];

const tabs: Array<{ id: StaffStayTab; label: string }> = [
  { id: 'CHECK_IN', label: 'Hôm nay check-in' },
  { id: 'IN_HOUSE', label: 'Đang lưu trú' },
  { id: 'CHECK_OUT', label: 'Hôm nay check-out' },
  { id: 'BOOKINGS', label: 'Tất cả booking' },
];

const emptyDraft = (): CheckoutDraft => ({
  serviceCharge: '',
  damageFee: '',
  note: '',
  selectedServiceName: SERVICE_CATALOG[0]?.name || '',
  selectedServiceQty: 1,
  serviceLines: [],
});

const formatCurrency = (value?: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : '-';
const normalizeId = (value?: string | number | null) => (value == null ? '' : String(value));

const roomKeyOfGuest = (guest: BookingGuest) => normalizeId(guest.bookingRoomId || guest.roomId);

const representativeOf = (row: BookingRoomRow) =>
  row.guests?.find((guest) => guest.id === row.representativeGuestId)
  || row.guests?.find((guest) => guest.role === 'REPRESENTATIVE')
  || row.guests?.find((guest) => guest.primaryGuest)
  || row.guests?.[0];

const companionsOf = (row: BookingRoomRow) => (row.guests || []).filter((guest) => guest.id !== representativeOf(row)?.id);

const roomNameLabel = (room?: Room, fallbackId?: string | number) => {
  if (room?.name) return `${room.name} (${room.roomNumber || ''})`;
  if (room?.roomType?.type && room?.roomNumber) return `${room.roomType.type} - ${room.roomNumber}`;
  if (room?.roomNumber) return `Phòng ${room.roomNumber}`;
  return `Phòng #${fallbackId || 'chưa xếp'}`;
};

const paymentLabel = (booking?: Booking) => {
  const status = (booking?.paymentStatus || '').toUpperCase();
  if (status === 'PAID') return 'Đã thanh toán';
  if (status === 'DEPOSITED' || status === 'PARTIALLY_PAID') return 'Đã cọc';
  if (['DEPOSIT_PAID', 'CONFIRMED', 'BOOKED'].includes((booking?.status || '').toUpperCase())) return 'Đã cọc';
  return status || 'Chờ thanh toán';
};

const roomStatusLabel = (status?: string) => {
  switch ((status || '').toUpperCase()) {
    case 'BOOKED': return 'Đã đặt';
    case 'ACTIVE': return 'Đã đặt';
    case 'CHECKED_IN': return 'Đang lưu trú';
    case 'CHECKED_OUT': return 'Đã checkout';
    case 'CANCELLED': return 'Đã hủy';
    case 'NO_SHOW': return 'No-show';
    default: return status || '-';
  }
};

const attachGuestsToRooms = (rows: BookingRoomRow[], guests: readonly BookingGuest[]) => {
  const guestsByRoom = new Map<string, BookingGuest[]>();
  for (const guest of guests) {
    const key = roomKeyOfGuest(guest);
    if (!key) continue;
    guestsByRoom.set(key, [...(guestsByRoom.get(key) || []), guest]);
  }
  return rows.map((row) => ({
    ...row,
    guests: guestsByRoom.get(normalizeId(row.id)) || guestsByRoom.get(normalizeId(row.roomId)) || row.guests || [],
  }));
};

const lateCheckoutFeeOf = (row: BookingRoomRow, now = new Date()) => {
  if (!row.checkOut) return 0;
  const checkoutDeadline = new Date(`${row.checkOut}T12:00:00`);
  if (Number.isNaN(checkoutDeadline.getTime()) || now <= checkoutDeadline) return 0;
  return Math.round(Number(row.priceSnapshot || 0) * 0.2);
};

export default function StaffCheckInPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StaffStayTab>('CHECK_IN');
  const [rooms, setRooms] = useState<BookingRoomRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [documentByRoom, setDocumentByRoom] = useState<Record<string, string>>({});
  const [roomDetail, setRoomDetail] = useState<BookingRoomRow | null>(null);
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [checkInPreviewBooking, setCheckInPreviewBooking] = useState<Booking | null>(null);
  const [checkInPreviewRows, setCheckInPreviewRows] = useState<BookingRoomRow[]>([]);
  const [checkoutRows, setCheckoutRows] = useState<BookingRoomRow[]>([]);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft>(emptyDraft);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [cashReceived, setCashReceived] = useState('');
  const [qrPayment, setQrPayment] = useState<CheckinQrPayment | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus>('PENDING');
  const [checkoutCalc, setCheckoutCalc] = useState<CheckoutResponse | null>(null);
  const [checkoutCalcLoading, setCheckoutCalcLoading] = useState(false);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const qrPollRef = useRef<number | null>(null);
  const qrStartedAtRef = useRef<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      setSelectedIds([]);
      if (activeTab === 'BOOKINGS') {
        const data = await staffBookingApi.getStaffBookings();
        setBookings(data);
        setRooms([]);
        return;
      }

      const data = activeTab === 'CHECK_IN'
        ? await staffBookingApi.getTodayCheckInRooms(vietnamTodayISO())
        : activeTab === 'IN_HOUSE'
          ? await staffBookingApi.getInHouseRooms()
          : await staffBookingApi.getTodayCheckoutRooms(vietnamTodayISO());

      const roomIds = Array.from(new Set(data.map((item) => item.roomId).filter(Boolean)));
      const CHUNK_SIZE = 4;

      const roomEntries: (readonly [string, Room | undefined])[] = [];
      for (let i = 0; i < roomIds.length; i += CHUNK_SIZE) {
        const chunk = roomIds.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (roomId) => [roomId, await roomApi.getById(roomId).catch(() => undefined)] as const));
        roomEntries.push(...results);
      }
      const roomById = new Map(roomEntries.filter((entry): entry is readonly [string, Room] => Boolean(entry[1])));

      const bookingIds = Array.from(new Set(data.map((item) => normalizeId(item.booking?.id || item.bookingId)).filter(Boolean)));

      const guestEntries: (readonly [string, { detail: any, guests: any[] }])[] = [];
      for (let i = 0; i < bookingIds.length; i += CHUNK_SIZE) {
        const chunk = bookingIds.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (bookingId) => {
          const [detail, guests] = await Promise.all([
            staffBookingApi.getBooking(bookingId).catch(() => null),
            staffBookingApi.getGuests(bookingId).catch(() => []),
          ]);
          const detailGuests = (detail?.items || []).flatMap((item: any) => item.guests || []);
          return [bookingId, { detail, guests: [...guests, ...detailGuests] }] as const;
        }));
        guestEntries.push(...results);
      }
      const guestsByBooking = new Map(guestEntries);

      setRooms(data.map((item) => {
        const bookingId = normalizeId(item.booking?.id || item.bookingId);
        const hydrated = guestsByBooking.get(bookingId);
        const row = { ...item, booking: hydrated?.detail ? { ...item.booking, ...hydrated.detail } : item.booking, room: roomById.get(item.roomId) };
        return attachGuestsToRooms([row], hydrated?.guests || [])[0];
      }));
      setBookings([]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải dashboard lưu trú');
      setRooms([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (!qrPayment?.confirmUrl || !qrRef.current) return;
    QRCode.toCanvas(qrRef.current, qrPayment.confirmUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => undefined);
  }, [qrPayment?.confirmUrl]);

  useEffect(() => {
    if (qrPollRef.current) {
      window.clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    if (!qrPayment?.paymentCode || ['SUCCESS', 'FAILED', 'EXPIRED'].includes(qrStatus)) {
      return;
    }
    if (!qrStartedAtRef.current) {
      qrStartedAtRef.current = Date.now();
    }
    qrPollRef.current = window.setInterval(async () => {
      if (Date.now() - qrStartedAtRef.current > 60000) {
        setQrStatus('EXPIRED');
        toast.error('Mã QR đã hết hạn, vui lòng tạo lại mã mới');
        if (qrPollRef.current) window.clearInterval(qrPollRef.current);
        qrPollRef.current = null;
        return;
      }
      try {
        const status = await paymentApi.getCheckinQr(qrPayment.paymentCode);
        const normalized = (status.status as QrStatus) || 'PENDING';
        setQrStatus(normalized);
        if (['SUCCESS', 'FAILED', 'EXPIRED'].includes(normalized)) {
          if (normalized === 'SUCCESS') toast.success('Thanh toán QR thành công.');
          if (qrPollRef.current) window.clearInterval(qrPollRef.current);
          qrPollRef.current = null;
        }
      } catch {
        setQrStatus('FAILED');
        toast.error('Không thể kết nối đến máy chủ. Kiểm tra cùng mạng WiFi hoặc IP server.');
        if (qrPollRef.current) window.clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
    }, 3000);
    return () => {
      if (qrPollRef.current) {
        window.clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
    };
  }, [qrPayment?.paymentCode, qrStatus]);

  const selectedService = SERVICE_CATALOG.find((item) => item.name === checkoutDraft.selectedServiceName) || SERVICE_CATALOG[0];
  const catalogGroups = useMemo(() => SERVICE_CATALOG.reduce<Record<string, typeof SERVICE_CATALOG>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item];
    return groups;
  }, {}), []);
  const checkoutSummary = useMemo(() => {
    // Extra fees entered by staff (draft) — sent to backend on confirm
    const serviceCatalogAmount = checkoutDraft.serviceLines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Math.max(1, Number(line.quantity || 1)), 0);
    const manualServiceAmount = Number(checkoutDraft.serviceCharge || 0);
    const damageAmount = Number(checkoutDraft.damageFee || 0);
    const extraService = serviceCatalogAmount + manualServiceAmount;

    // Use backend calculation when available, otherwise fall back to local estimates
    if (checkoutCalc) {
      const originalRoomCharge = Number(checkoutCalc.roomCharge ?? 0);
      const roomCharge = Number(checkoutCalc.actualRoomCharge ?? originalRoomCharge);
      const serverServiceTotal = Number(checkoutCalc.serviceTotal ?? 0);
      const lateAmount = Number(checkoutCalc.lateCheckoutFee ?? 0);
      const paidAmount = Number(checkoutCalc.amountPaid ?? 0);
      const refundFromEarlyCheckout = Number(checkoutCalc.refundAmount ?? 0);
      // Grand total = actual room charge (after refund) + services + extra fees + late fee
      const grandTotal = roomCharge + serverServiceTotal + extraService + damageAmount + lateAmount;
      const remainingAmount = grandTotal - paidAmount;
      return {
        originalRoomCharge,
        roomAmount: roomCharge,
        serviceCatalogAmount,
        manualServiceAmount,
        serviceAmount: serverServiceTotal + extraService,
        damageAmount,
        lateAmount,
        paidAmount,
        refundFromEarlyCheckout,
        finalAmount: grandTotal,
        remainingAmount,
        checkoutType: checkoutCalc.checkoutType,
        usedNights: checkoutCalc.usedNights,
        unusedNights: checkoutCalc.unusedNights,
        refundRate: checkoutCalc.refundRate,
      };
    }

    // Fallback (before calc loaded)
    const roomAmount = checkoutRows.reduce((sum, row) => sum + Number(row.priceSnapshot || 0) * Math.max(1, Number(row.nights || 1)), 0);
    const lateAmount = checkoutRows.reduce((sum, row) => sum + lateCheckoutFeeOf(row), 0);
    const paidAmount = checkoutRows.length > 0
      ? Number(checkoutRows[0].booking?.paidAmount || 0)
      : 0;
    const finalAmount = roomAmount + extraService + damageAmount + lateAmount;
    return {
      originalRoomCharge: roomAmount,
      roomAmount,
      serviceCatalogAmount,
      manualServiceAmount,
      serviceAmount: extraService,
      damageAmount,
      lateAmount,
      paidAmount,
      refundFromEarlyCheckout: 0,
      finalAmount,
      remainingAmount: finalAmount - paidAmount,
      checkoutType: undefined,
      usedNights: undefined,
      unusedNights: undefined,
      refundRate: undefined,
    };
  }, [checkoutRows, checkoutDraft, selectedService, checkoutCalc]);

  const filteredRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return rooms;
    return rooms.filter((row) => {
      const rep = representativeOf(row);
      return [
        row.booking?.bookingCode,
        row.bookingCode,
        row.room?.roomNumber,
        row.room?.roomType?.type,
        rep?.fullName,
        rep?.phone,
        rep?.cccd,
        rep?.passport,
        row.status,
      ].join(' ').toLowerCase().includes(keyword);
    });
  }, [rooms, searchTerm]);

  const filteredBookings = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return bookings;
    return bookings.filter((booking) => [
      booking.bookingCode,
      booking.id,
      booking.userId,
      booking.status,
      booking.paymentStatus,
    ].join(' ').toLowerCase().includes(keyword));
  }, [bookings, searchTerm]);

  const openCheckoutModal = async (rows: BookingRoomRow[]) => {
    if (rows.length === 0) return;
    const bookingId = String(rows[0].booking?.id || rows[0].bookingId || '');
    if (!bookingId) { toast.error('Không xác định được booking'); return; }
    setCheckoutRows(rows);
    setCheckoutDraft(emptyDraft());
    setCheckoutMethod('BANK_TRANSFER');
    setCashReceived('');
    setQrPayment(null);
    setQrStatus('PENDING');
    setCheckoutCalc(null);
    qrStartedAtRef.current = 0;
    setCheckoutCalcLoading(true);
    try {
      const calc = await staffBookingApi.calculateCheckout(bookingId);
      setCheckoutCalc(calc);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tính toán hóa đơn checkout');
    } finally {
      setCheckoutCalcLoading(false);
    }
  };

  const closeCheckoutModal = () => {
    setCheckoutRows([]);
    setCheckoutDraft(emptyDraft());
    setCashReceived('');
    setQrPayment(null);
    setQrStatus('PENDING');
    setCheckoutCalc(null);
    qrStartedAtRef.current = 0;
  };

  const selectedRows = () => rooms.filter((row) => row.id && selectedIds.includes(row.id));
  const selectedBookingId = () => {
    const ids = Array.from(new Set(selectedRows().map((row) => row.booking?.id || row.bookingId).filter(Boolean)));
    return ids.length === 1 ? String(ids[0]) : '';
  };

  const addCheckoutServiceLine = () => {
    if (!selectedService) return;
    setCheckoutDraft((draft) => ({
      ...draft,
      serviceLines: [
        ...draft.serviceLines,
        {
          name: selectedService.name,
          quantity: Math.max(1, Number(draft.selectedServiceQty || 1)),
          unitPrice: Number(selectedService.price || 0),
        },
      ],
      selectedServiceQty: 1,
    }));
  };

  const removeCheckoutServiceLine = (index: number) => {
    setCheckoutDraft((draft) => ({
      ...draft,
      serviceLines: draft.serviceLines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const toggleSelected = (id?: string) => {
    if (!id) return;
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const openCheckInConfirm = async (rows: BookingRoomRow[]) => {
    const bookingId = normalizeId(rows[0]?.booking?.id || rows[0]?.bookingId);
    if (!bookingId) {
      toast.error('Không xác định được booking');
      return;
    }

    try {
      const [detail, guests] = await Promise.all([
        staffBookingApi.getBooking(bookingId),
        staffBookingApi.getGuests(bookingId).catch(() => []),
      ]);
      const hydratedItems = attachGuestsToRooms((detail.items || []) as BookingRoomRow[], guests);
      const selectedRowIds = new Set(rows.map((row) => normalizeId(row.id)));
      const selectedRows = hydratedItems.filter((item) => item.id && selectedRowIds.has(String(item.id)));
      setCheckInPreviewBooking({ ...detail, items: hydratedItems });
      setCheckInPreviewRows(selectedRows.length > 0 ? selectedRows : rows);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu xác nhận check-in');
    }
  };

  const closeCheckInConfirm = () => {
    setCheckInPreviewBooking(null);
    setCheckInPreviewRows([]);
  };

  const confirmCheckIn = async () => {
    if (checkInPreviewRows.length === 0) return;
    const bookingId = normalizeId(checkInPreviewBooking?.id || checkInPreviewRows[0]?.booking?.id || checkInPreviewRows[0]?.bookingId);
    if (!bookingId) {
      toast.error('Không xác định được booking');
      return;
    }

    setProcessing(true);
    try {
      const result = await staffBookingApi.checkInMultipleBookingRooms(
        bookingId,
        checkInPreviewRows.map((row) => row.id!).filter(Boolean),
        checkInPreviewRows.map((row) => {
          const rep = representativeOf(row);
          return {
            bookingRoomId: row.id!,
            representativeGuestId: rep?.id,
            representativePhone: rep?.phone,
            representativeCccd: documentByRoom[row.id!] || rep?.cccd || rep?.passport || '',
          };
        }),
      );
      if (result.errors.length) {
        toast.error(result.errors[0]);
      } else {
        toast.success(checkInPreviewRows.length > 1 ? 'Đã check-in các phòng đã chọn' : 'Đã check-in phòng đã chọn');
      }
      closeCheckInConfirm();
      setSelectedIds([]);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Check-in phòng thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const checkInOne = async (row: BookingRoomRow) => {
    if (!row.id) return;
    await openCheckInConfirm([row]);
  };

  const checkInSelected = async () => {
    const bookingId = selectedBookingId();
    if (!bookingId) {
      toast.error('Chỉ chọn nhiều phòng trong cùng một booking');
      return;
    }
    const rows = selectedRows();
    await openCheckInConfirm(rows);
  };

  const checkoutSelected = () => {
    if (!selectedBookingId()) {
      toast.error('Chỉ checkout nhiều phòng trong cùng một booking');
      return;
    }
    openCheckoutModal(selectedRows());
  };

  const completeCheckout = async (skipPayment = false) => {
    if (checkoutRows.length === 0) return;
    const bookingId = checkoutRows[0].booking?.id || checkoutRows[0].bookingId;
    if (!bookingId) {
      toast.error('Không xác định được booking');
      return;
    }
    const amountToCollect = Math.max(0, checkoutSummary.remainingAmount);
    if (!skipPayment && amountToCollect > 0) {
      if (checkoutMethod === 'CASH') {
        if (Number(cashReceived || 0) < amountToCollect) {
          toast.error('Số tiền khách đưa chưa đủ');
          return;
        }
        await paymentApi.markLateCheckoutPaid(String(bookingId), 'CASH', {
          payerName: representativeOf(checkoutRows[0])?.fullName,
          payerPhone: representativeOf(checkoutRows[0])?.phone,
          payerGuestId: representativeOf(checkoutRows[0])?.id ? Number(representativeOf(checkoutRows[0])?.id) : undefined,
          payerCccd: representativeOf(checkoutRows[0])?.cccd || representativeOf(checkoutRows[0])?.passport,
          receivedAmount: Number(cashReceived || 0),
          changeAmount: Math.max(0, Number(cashReceived || 0) - amountToCollect),
        } as any);
      } else {
        if (qrPayment) {
          if (qrStatus !== 'SUCCESS') {
            toast.error(qrStatus === 'EXPIRED' ? 'Mã QR đã hết hạn, vui lòng tạo lại mã mới' : 'Thanh toán QR chưa hoàn tất, không thể checkout.');
            return;
          }
          const status: any = { status: 'SUCCESS' };
          if (status.status === 'SUCCESS' || status.status === 'PAID') {
            setQrStatus('SUCCESS');
            toast.success('Thanh toán QR thành công.');
            await completeCheckout(true);
          } else {
            setQrStatus((status.status as QrStatus) || 'PENDING');
            toast.error('QR chưa thanh toán');
          }
          return;
        }
        setProcessing(true);
        try {
          const qr = await paymentApi.createCheckinQr({
            bookingId: String(bookingId),
            amount: amountToCollect,
            method: 'BANK_TRANSFER',
            type: 'LATE_CHECKOUT_FEE',
          });
          setQrPayment(qr);
          setQrStatus('PENDING');
          qrStartedAtRef.current = Date.now();
          toast.success('Đã tạo QR thanh toán checkout');
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Không thể tạo QR thanh toán');
        } finally {
          setProcessing(false);
        }
        return;
      }
    }

    setProcessing(true);
    try {
      const extraFees = checkoutRows.map((row, index) => ({
        bookingRoomId: row.id!,
        serviceCharge: index === 0 ? checkoutSummary.serviceAmount : 0,
        surcharge: 0,
        damageFee: index === 0 ? checkoutSummary.damageAmount : 0,
        note: checkoutDraft.note,
      }));
      const result = await staffBookingApi.checkOutMultipleBookingRooms(
        String(bookingId),
        checkoutRows.map((row) => row.id!).filter(Boolean),
        extraFees,
        {
          paymentMethod: checkoutMethod,
          receivedAmount: checkoutMethod === 'CASH' ? Number(cashReceived || 0) : amountToCollect,
          changeAmount: checkoutMethod === 'CASH' ? Math.max(0, Number(cashReceived || 0) - amountToCollect) : 0,
        },
      );
      if (result.errors.length) {
        toast.error(result.errors[0]);
        return;
      }
      if (!result.invoiceId) {
        toast.error('Checkout đã xử lý nhưng chưa tạo được hóa đơn. Vui lòng kiểm tra lại.');
        return;
      }
      toast.success(checkoutRows.length > 1
        ? `Checkout thành công ${checkoutRows.length} phòng. Hóa đơn ${result.invoiceCode} đã được tạo.`
        : `Checkout thành công. Hóa đơn ${result.invoiceCode} đã được tạo.`);
      closeCheckoutModal();
      await fetchData();
      navigate('/staff/invoices');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Checkout thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const openBookingDetail = async (booking: Booking) => {
    try {
      const [detail, guests] = await Promise.all([
        staffBookingApi.getBooking(booking.id),
        staffBookingApi.getGuests(booking.id).catch(() => []),
      ]);
      setBookingDetail({
        ...detail,
        items: attachGuestsToRooms((detail.items || []) as BookingRoomRow[], guests),
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết booking');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-4xl bg-slate-950 p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-sky-300">Staff stay operations</p>
        <h1 className="mt-2 text-3xl font-black">Vận hành lưu trú theo từng phòng</h1>
        <p className="mt-2 text-sm font-medium text-slate-300">Booking là đơn tổng. Check-in/check-out xử lý theo từng BookingRoom.</p>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-4 py-2 text-sm font-black transition ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[320px]">
              <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm booking, phòng, đại diện, SĐT, CCCD..." className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-sky-400" />
            </div>
            {activeTab === 'CHECK_IN' && (
              <button disabled={processing || selectedIds.length === 0} onClick={checkInSelected} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50">Check-in các phòng đã chọn</button>
            )}
            {(activeTab === 'IN_HOUSE' || activeTab === 'CHECK_OUT') && (
              <button disabled={processing || selectedIds.length === 0} onClick={checkoutSelected} className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">Checkout các phòng đã chọn</button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'BOOKINGS' ? (
        <BookingTable loading={loading} bookings={filteredBookings} onOpen={openBookingDetail} />
      ) : (
        <RoomTable
          loading={loading}
          rows={filteredRooms}
          selectedIds={selectedIds}
          activeTab={activeTab}
          processing={processing}
          documentByRoom={documentByRoom}
          setDocumentByRoom={setDocumentByRoom}
          toggleSelected={toggleSelected}
          onOpenRow={setRoomDetail}
          onCheckIn={checkInOne}
          onCheckout={(row) => openCheckoutModal([row])}
        />
      )}

      {checkoutRows.length > 0 && (
        <CheckoutModal
          rows={checkoutRows}
          draft={checkoutDraft}
          setDraft={setCheckoutDraft}
          method={checkoutMethod}
          setMethod={setCheckoutMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          qrPayment={qrPayment}
          qrStatus={qrStatus}
          qrRef={qrRef}
          processing={processing}
          calcLoading={checkoutCalcLoading}
          summary={checkoutSummary}
          catalogGroups={catalogGroups}
          selectedService={selectedService}
          onAddServiceLine={addCheckoutServiceLine}
          onRemoveServiceLine={removeCheckoutServiceLine}
          onClose={closeCheckoutModal}
          onConfirm={() => completeCheckout()}
          onRefreshQr={() => completeCheckout()}
        />
      )}

      {roomDetail && <RoomDetailModal row={roomDetail} onClose={() => setRoomDetail(null)} onCheckIn={checkInOne} onCheckout={(row) => openCheckoutModal([row])} />}
      {bookingDetail && <BookingDetailModal booking={bookingDetail} onClose={() => setBookingDetail(null)} onCheckIn={checkInOne} onCheckout={(row) => openCheckoutModal([row])} />}
      {checkInPreviewBooking && checkInPreviewRows.length > 0 && (
        <CheckInConfirmModal
          booking={checkInPreviewBooking}
          rows={checkInPreviewRows}
          processing={processing}
          onClose={closeCheckInConfirm}
          onConfirm={confirmCheckIn}
        />
      )}
    </div>
  );
}

function CheckInConfirmModal(props: {
  booking: Booking;
  rows: BookingRoomRow[];
  processing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const totalRooms = props.rows.length;
  const status = paymentLabel(props.booking);
  const isMultiRoom = totalRooms > 1;

  // Nghiệp vụ Check-in sớm
  const now = new Date();
  const checkInDate = props.rows[0]?.checkIn || new Date().toISOString().split('T')[0];
  const standardCheckInTime = new Date(`${checkInDate}T14:00:00`);
  const isEarlyCheckIn = now < standardCheckInTime && now.toDateString() === standardCheckInTime.toDateString();

  // Tính phụ thu check-in sớm (50% giá phòng), nhưng sẽ thu vào lúc Check-out
  const calculateEarlyFee = (price?: number) => Math.round((Number(price || 0) * 0.5));

  const roomSummaries = props.rows.map(row => {
    const earlyFee = isEarlyCheckIn ? calculateEarlyFee(row.priceSnapshot) : 0;
    // Map payment (hiện tại booking-level ngầm hiểu chia đều, nếu backend chưa có phân bổ)
    const proportion = 1 / Math.max(1, props.booking.items?.length || totalRooms);
    const roomPaid = Math.round(Number(props.booking.paidAmount || 0) * proportion);
    const roomTotal = Math.round(Number(props.booking.totalPrice || 0) * proportion);

    return {
      ...row,
      earlyFee,
      roomPaid,
      roomTotal,
      roomRemaining: Math.max(0, roomTotal - roomPaid),
    };
  });

  const totalEarlyFee = roomSummaries.reduce((sum, r) => sum + r.earlyFee, 0);
  const totalBookingRemaining = Math.max(0, Number(props.booking.totalPrice || 0) - Number(props.booking.paidAmount || 0));
  // Tiền phụ thu sớm sẽ thu lúc check-out, không cộng vào số cần thu ngay!
  const amountToCollectNow = totalBookingRemaining;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-4xl bg-white shadow-2xl flex flex-col">
        <div className="flex-shrink-0 flex items-start justify-between border-b border-slate-100 bg-slate-950 p-6 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-300">Xác nhận check-in</p>
            <h2 className="mt-2 text-3xl font-black">Booking {props.booking.bookingCode || `#${props.booking.id}`}</h2>
            <div className="mt-2 text-sm font-bold text-slate-300">{totalRooms} phòng được chọn · {status}</div>
          </div>
          <button onClick={props.onClose} className="rounded-full p-2 text-slate-300 hover:bg-white/10"><HiX size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Tổng Booking (Phòng)" value={formatCurrency(props.booking.totalPrice)} />
            <InfoCard label="Đã thanh toán/cọc" value={formatCurrency(props.booking.paidAmount)} />
            <InfoCard label="Còn lại (Tiền phòng)" value={formatCurrency(totalBookingRemaining)} />
            <div className="rounded-2xl bg-sky-100 p-4 border border-sky-200">
              <div className="text-xs font-black uppercase tracking-widest text-sky-600">Tổng cần thu ngay</div>
              <div className="mt-1 text-xl font-black text-slate-950">{formatCurrency(amountToCollectNow)}</div>
            </div>
          </div>

          {isEarlyCheckIn && (
            <div className="mt-6 rounded-3xl border-2 border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800 flex items-center gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <div className="text-base font-black uppercase tracking-widest text-rose-600">Khách đang check-in sớm</div>
                <div className="mt-1">Giờ check-in chuẩn: 14:00. <br className="md:hidden" />
                  Dự kiến phụ thu: {formatCurrency(totalEarlyFee)} ({formatCurrency(calculateEarlyFee(props.rows[0]?.priceSnapshot))} / phòng)
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Chi tiết phòng được xác nhận</div>
            <div className="space-y-4">
              {roomSummaries.map((row) => {
                const rep = representativeOf(row);
                const companions = companionsOf(row);
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-lg font-black text-slate-950 text-sky-700">{roomNameLabel(row.room, row.roomId)}</div>
                        <div className="text-xs font-semibold text-slate-500 mt-1">{row.room?.roomType?.type || '-'} · {roomStatusLabel(row.status)}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-right">
                        <div className="rounded-xl bg-white px-3 py-2 border border-slate-200">
                          <span className="text-[10px] block font-black uppercase tracking-widest text-slate-400">Giá phòng</span>
                          <span className="text-sm font-black">{formatCurrency(row.roomTotal)}</span>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 border border-slate-200">
                          <span className="text-[10px] block font-black uppercase tracking-widest text-slate-400">Đã cọc</span>
                          <span className="text-sm font-black text-emerald-600">{formatCurrency(row.roomPaid)}</span>
                        </div>
                        {row.earlyFee > 0 && (
                          <div className="rounded-xl bg-rose-100 px-3 py-2 border border-rose-200">
                            <span className="text-[10px] block font-black uppercase tracking-widest text-rose-500">Phụ thu check-in sớm</span>
                            <span className="text-sm font-black text-rose-700">{formatCurrency(row.earlyFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm font-bold text-slate-700">
                      <div className="col-span-full border-t border-slate-100 pt-3 flex gap-4 overflow-x-auto">
                        <div><span className="text-slate-400">Đại diện: </span>{rep?.fullName || '-'}</div>
                        <div><span className="text-slate-400">SĐT: </span>{rep?.phone || '-'}</div>
                        <div><span className="text-slate-400">CCCD/PP: </span>{rep?.cccd || rep?.passport || '-'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-5">
          <div className="text-sm font-bold text-slate-500 hidden md:block">
            {amountToCollectNow > 0
              ? `Phần tiền ${formatCurrency(amountToCollectNow)} còn lại sẽ được thành toán khi quý khách trả phòng.`
              : 'Khách đã thanh toán đủ hoặc không phát sinh chi phí.'}
          </div>
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <button onClick={props.onClose} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Đóng</button>
            <button onClick={props.onConfirm} disabled={props.processing} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50">
              {props.processing ? 'Đang xác nhận...' : 'Hoàn tất Check-in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomTable(props: {
  loading: boolean;
  rows: BookingRoomRow[];
  selectedIds: string[];
  activeTab: StaffStayTab;
  processing: boolean;
  documentByRoom: Record<string, string>;
  setDocumentByRoom: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  toggleSelected: (id?: string) => void;
  onOpenRow: (row: BookingRoomRow) => void;
  onCheckIn: (row: BookingRoomRow) => void;
  onCheckout: (row: BookingRoomRow) => void;
}) {
  if (props.loading) return <EmptyState text="Đang tải dữ liệu..." />;
  if (props.rows.length === 0) return <EmptyState text="Không có dữ liệu phù hợp" />;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4" />
              <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Mã booking</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Phòng</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Người đại diện</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">{props.activeTab === 'CHECK_IN' ? 'Thanh toán' : 'Thời gian'}</th>
              <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Trạng thái</th>
              <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-400">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.rows.map((row) => {
              const rep = representativeOf(row);
              return (
                <tr key={row.id} onClick={() => props.onOpenRow(row)} className="cursor-pointer align-top hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <input type="checkbox" checked={Boolean(row.id && props.selectedIds.includes(row.id))} onClick={(event) => event.stopPropagation()} onChange={() => props.toggleSelected(row.id)} />
                  </td>
                  <td className="px-5 py-4 font-black text-slate-900">{row.booking?.bookingCode || row.bookingCode || `#${row.booking?.id || row.bookingId || '-'}`}</td>
                  <td className="px-5 py-4">
                    <div className="font-black text-slate-900">{row.room?.roomNumber || row.roomId}</div>
                    <div className="text-xs font-semibold text-slate-500">{row.room?.roomType?.type || '-'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 font-black text-slate-900"><HiOutlineUserGroup /> {rep?.fullName || '-'}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{rep?.phone || '-'} · {rep?.cccd || rep?.passport || '-'}</div>
                    {props.activeTab === 'CHECK_IN' && (
                      <input value={props.documentByRoom[row.id || ''] ?? rep?.cccd ?? rep?.passport ?? ''} onClick={(event) => event.stopPropagation()} onChange={(event) => row.id && props.setDocumentByRoom((current) => ({ ...current, [row.id!]: event.target.value }))} placeholder="CCCD/passport" className="mt-2 w-56 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-sky-400" />
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">
                    {props.activeTab === 'CHECK_IN' ? paymentLabel(row.booking) : (
                      <>
                        <div>Check-in: {formatDateTime(row.actualCheckInAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Dự kiến checkout: {formatDate(row.checkOut)} 12:00</div>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{roomStatusLabel(row.status)}</span></td>
                  <td className="px-5 py-4 text-right">
                    {props.activeTab === 'CHECK_IN' ? (
                      <button disabled={props.processing} onClick={(event) => { event.stopPropagation(); props.onCheckIn(row); }} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-50"><HiOutlineClipboardCheck /> Check-in</button>
                    ) : (
                      <button disabled={props.processing} onClick={(event) => { event.stopPropagation(); props.onCheckout(row); }} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"><HiOutlineCash /> Checkout</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckoutModal(props: {
  rows: BookingRoomRow[];
  draft: CheckoutDraft;
  setDraft: React.Dispatch<React.SetStateAction<CheckoutDraft>>;
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  cashReceived: string;
  setCashReceived: (value: string) => void;
  qrPayment: CheckinQrPayment | null;
  qrStatus: QrStatus;
  qrRef: React.RefObject<HTMLCanvasElement | null>;
  processing: boolean;
  calcLoading: boolean;
  summary: { originalRoomCharge: number; roomAmount: number; serviceCatalogAmount: number; manualServiceAmount: number; serviceAmount: number; damageAmount: number; lateAmount: number; paidAmount: number; finalAmount: number; remainingAmount: number; refundFromEarlyCheckout: number; checkoutType?: string; usedNights?: number; unusedNights?: number; refundRate?: number };
  catalogGroups: Record<string, typeof SERVICE_CATALOG>;
  selectedService?: typeof SERVICE_CATALOG[number];
  onAddServiceLine: () => void;
  onRemoveServiceLine: (index: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  onRefreshQr: () => void;
}) {
  const first = props.rows[0];
  const rep = first ? representativeOf(first) : undefined;
  const amountToCollect = Math.max(0, props.summary.remainingAmount);
  const refundAmount = Math.max(0, -props.summary.remainingAmount);
  const changeDue = Math.max(0, Number(props.cashReceived || 0) - amountToCollect);
  const cashInsufficient = props.method === 'CASH' && amountToCollect > 0 && Number(props.cashReceived || 0) < amountToCollect;
  const disableConfirm = props.processing || cashInsufficient || props.qrStatus === 'PROCESSING';

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-4xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-950 p-6 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-300">Checkout BookingRoom</p>
            <h2 className="mt-2 text-3xl font-black">{props.rows.length === 1 ? `Phòng ${first?.room?.roomNumber || first?.roomId}` : `${props.rows.length} phòng được chọn`}</h2>
            <div className="mt-2 text-sm font-bold text-slate-300">Tính phí riêng từng phòng, thao tác nhiều phòng chỉ là bulk action.</div>
          </div>
          <button onClick={props.onClose} className="rounded-full p-2 text-slate-300 hover:bg-white/10"><HiX size={24} /></button>
        </div>

        <div className="grid max-h-[76vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 p-6">
            <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Thông tin lưu trú</div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoCard label="Người đại diện" value={rep?.fullName || '-'} />
                <InfoCard label="SĐT" value={rep?.phone || '-'} />
                <InfoCard label="CCCD/PASSPORT" value={rep?.cccd || rep?.passport || '-'} />
                <InfoCard label="Đã thanh toán/cọc" value={formatCurrency(props.summary.paidAmount)} />
              </div>
              <div className="mt-4 space-y-2">
                {props.rows.map((row) => (
                  <div key={row.id} className="flex flex-col justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 md:flex-row md:items-center">
                    <span>Phòng {row.room?.roomNumber || row.roomId}</span>
                    <span>Check-in: {formatDateTime(row.actualCheckInAt)}</span>
                    <span>Dự kiến checkout: {formatDate(row.checkOut)} 12:00</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Khoản phí</div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <MoneyInput label="Phí dịch vụ nhập tay" value={props.draft.serviceCharge} onChange={(value) => props.setDraft((draft) => ({ ...draft, serviceCharge: value }))} />
                <MoneyInput label="Phí hư hỏng" value={props.draft.damageFee} onChange={(value) => props.setDraft((draft) => ({ ...draft, damageFee: value }))} />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Dịch vụ phát sinh</div>
                <div className="grid grid-cols-12 gap-2">
                  <select value={props.draft.selectedServiceName} onChange={(event) => props.setDraft((draft) => ({ ...draft, selectedServiceName: event.target.value }))} className="col-span-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold md:col-span-5">
                    {Object.entries(props.catalogGroups).map(([group, services]) => (
                      <optgroup key={group} label={group}>
                        {services.map((service) => <option key={service.name} value={service.name}>{service.name} - {formatCurrency(service.price)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input type="number" min={1} value={props.draft.selectedServiceQty} onChange={(event) => props.setDraft((draft) => ({ ...draft, selectedServiceQty: Math.max(1, Number(event.target.value || 1)) }))} className="col-span-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold md:col-span-2" />
                  <div className="col-span-4 rounded-xl bg-white px-3 py-2 text-right text-sm font-black text-sky-700 md:col-span-3">{formatCurrency(Number(props.selectedService?.price || 0) * Math.max(1, Number(props.draft.selectedServiceQty || 1)))}</div>
                  <button type="button" onClick={props.onAddServiceLine} className="col-span-4 rounded-xl bg-sky-600 px-3 py-2 text-sm font-black text-white hover:bg-sky-700 md:col-span-2">Thêm</button>
                </div>
                <div className="mt-3 space-y-2">
                  {props.draft.serviceLines.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-center text-xs font-bold text-slate-400">Chưa thêm dịch vụ phát sinh.</div>
                  ) : props.draft.serviceLines.map((line, index) => (
                    <div key={`${line.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
                      <span>{line.name} × {line.quantity}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-950">{formatCurrency(line.unitPrice * line.quantity)}</span>
                        <button type="button" onClick={() => props.onRemoveServiceLine(index)} className="text-xs font-black text-rose-600 hover:text-rose-700">Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Ghi chú</span>
                <textarea rows={3} value={props.draft.note} onChange={(event) => props.setDraft((draft) => ({ ...draft, note: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-rose-400" />
              </label>
            </section>
          </div>

          <div className="space-y-5 border-l border-slate-100 bg-slate-50 p-6">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Kết toán</div>
              {props.calcLoading ? (
                <div className="mt-4 flex items-center gap-3 py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                  <span className="text-sm font-bold text-slate-500">Đang tính toán hóa đơn...</span>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm font-bold">
                  {/* Tiền phòng gốc (trước hoàn) */}
                  <SummaryLine label={`Tiền phòng gốc (${props.summary.usedNights != null ? `${props.summary.usedNights} đêm sử dụng` : 'tiêu chuẩn'})`} value={props.summary.originalRoomCharge} />
                  {/* Khoản hoàn checkout sớm (âm) */}
                  {props.summary.refundFromEarlyCheckout > 0 && (
                    <SummaryLine
                      label={`Hoàn checkout sớm — ${props.summary.unusedNights ?? 0} đêm còn lại × ${Math.round((props.summary.refundRate ?? 0.8) * 100)}%`}
                      value={-props.summary.refundFromEarlyCheckout}
                    />
                  )}
                  {/* Tiền phòng thực thu sau hoàn */}
                  {props.summary.refundFromEarlyCheckout > 0 && (
                    <div className="flex justify-between border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Tiền phòng thực thu</span>
                      <span className="font-black text-slate-900">{formatCurrency(props.summary.roomAmount)}</span>
                    </div>
                  )}
                  {props.summary.lateAmount > 0 && (
                    <SummaryLine label="Phụ thu checkout trễ" value={props.summary.lateAmount} />
                  )}
                  {props.summary.serviceAmount > 0 && (
                    <SummaryLine label="Phí dịch vụ" value={props.summary.serviceAmount} />
                  )}
                  {props.summary.damageAmount > 0 && (
                    <SummaryLine label="Phí hư hỏng" value={props.summary.damageAmount} />
                  )}
                  <div className="my-1 border-t border-slate-200" />
                  <SummaryLine label="Tổng hóa đơn" value={props.summary.finalAmount} strong />
                  <SummaryLine label="Đã thanh toán / cọc" value={props.summary.paidAmount} />
                </div>
              )}
              <div className={`mt-5 rounded-2xl p-4 ${refundAmount > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                <div className="text-xs font-black uppercase tracking-widest">{refundAmount > 0 ? 'Hoàn khách' : 'Còn phải thu'}</div>
                <div className="mt-1 text-3xl font-black">{formatCurrency(refundAmount > 0 ? refundAmount : amountToCollect)}</div>
              </div>
            </section>

            {amountToCollect > 0 && (
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => props.setMethod('BANK_TRANSFER')} className={`rounded-2xl border p-3 text-sm font-black ${props.method === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500'}`}>Chuyển khoản QR</button>
                  <button onClick={() => props.setMethod('CASH')} className={`rounded-2xl border p-3 text-sm font-black ${props.method === 'CASH' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500'}`}>Tiền mặt</button>
                </div>
                {props.method === 'CASH' && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <MoneyInput label="Khách đưa" value={props.cashReceived} onChange={props.setCashReceived} />
                      <InfoCard label="Tiền thối" value={formatCurrency(changeDue)} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[5000, 10000, 20000, 50000, 100000, 200000, 500000].map((amount) => (
                        <button key={amount} type="button" onClick={() => props.setCashReceived(String(Number(props.cashReceived || 0) + amount))} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                          +{formatCurrency(amount)}
                        </button>
                      ))}
                      <button type="button" onClick={() => props.setCashReceived(String(amountToCollect))} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white hover:bg-slate-800">Đủ tiền</button>
                    </div>
                    {cashInsufficient && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Số tiền khách đưa chưa đủ</div>}
                  </div>
                )}
                {props.method === 'BANK_TRANSFER' && props.qrPayment && (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
                    <div className="mb-3 rounded-xl bg-white px-3 py-2 text-left text-xs font-bold text-slate-600">
                      <div>Số tiền: <b>{formatCurrency(amountToCollect)}</b></div>
                      <div>Nội dung chuyển khoản: <b>{props.qrPayment.paymentCode}</b></div>
                    </div>
                    <canvas ref={props.qrRef} className="mx-auto rounded-xl bg-white p-2" />
                    <div className={`mt-3 rounded-xl px-4 py-2 text-sm font-black ${props.qrStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {props.qrStatus === 'SUCCESS' ? 'Thanh toán QR thành công.' : props.qrStatus === 'PROCESSING' ? 'Đang xử lý thanh toán QR' : props.qrStatus === 'FAILED' ? 'Thanh toán QR thất bại' : props.qrStatus === 'EXPIRED' ? 'QR đã hết hạn' : 'Đang chờ thanh toán'}
                    </div>
                  </div>
                )}
              </section>
            )}

            <button disabled={disableConfirm} onClick={props.qrPayment ? props.onRefreshQr : props.onConfirm} className="w-full rounded-3xl bg-rose-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-rose-700 disabled:opacity-50">
              {props.processing ? 'Đang xử lý...' : props.qrPayment ? 'Kiểm tra thanh toán' : amountToCollect > 0 && props.method === 'BANK_TRANSFER' ? 'Tạo QR thanh toán' : 'Xác nhận checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingTable({ loading, bookings, onOpen }: { loading: boolean; bookings: Booking[]; onOpen: (booking: Booking) => void }) {
  if (loading) return <EmptyState text="Đang tải booking..." />;
  if (bookings.length === 0) return <EmptyState text="Không có booking phù hợp" />;
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Booking</th>
            <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Ngày ở</th>
            <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Thanh toán</th>
            <th className="px-5 py-4 text-xs font-black uppercase text-slate-400">Tổng tiền</th>
            <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-400">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-4">
                <div className="font-black text-slate-900">{booking.bookingCode || `#${booking.id}`}</div>
                <div className="text-xs font-semibold text-slate-500">User #{booking.userId} · {booking.totalRooms || booking.items?.length || 0} phòng</div>
              </td>
              <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</td>
              <td className="px-5 py-4 text-sm font-bold text-slate-700">{paymentLabel(booking)}</td>
              <td className="px-5 py-4 font-black text-slate-900">{formatCurrency(booking.totalPrice)}</td>
              <td className="px-5 py-4 text-right"><button onClick={() => onOpen(booking)} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">Xem chi tiết</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoomDetailModal({ row, onClose, onCheckIn, onCheckout }: { row: BookingRoomRow; onClose: () => void; onCheckIn: (row: BookingRoomRow) => void; onCheckout: (row: BookingRoomRow) => void }) {
  const rep = representativeOf(row);
  const companions = companionsOf(row);
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-4xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-500">Chi tiết BookingRoom</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{row.booking?.bookingCode || row.bookingCode || `#${row.booking?.id || row.bookingId || '-'}`} - Phòng {row.room?.roomNumber || row.roomId}</h2>
            <div className="mt-2 text-sm font-bold text-slate-500">{row.room?.roomType?.type || 'Loại phòng'} - {roomStatusLabel(row.status)}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><HiX size={22} /></button>
        </div>
        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoCard label="Ngày nhận" value={formatDate(row.checkIn)} />
            <InfoCard label="Ngày trả" value={formatDate(row.checkOut)} />
            <InfoCard label="Giá phòng" value={formatCurrency(row.priceSnapshot)} />
          </div>
          <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Người đại diện phòng</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoCard label="Họ tên" value={rep?.fullName || '-'} />
              <InfoCard label="SĐT" value={rep?.phone || '-'} />
              <InfoCard label="CCCD/Passport" value={rep?.cccd || rep?.passport || '-'} />
              <InfoCard label="Ngày sinh" value={rep?.dateOfBirth ? formatDate(rep.dateOfBirth) : '-'} />
            </div>
          </section>
          <section className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Khách đi cùng</div>
            {companions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-sm font-bold text-slate-400">Không có khách đi cùng.</div> : companions.map((guest) => <div key={guest.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{guest.fullName}</div>)}
          </section>
          <div className="flex justify-end gap-3">
            {(row.status === 'BOOKED' || row.status === 'ACTIVE') && <button onClick={() => onCheckIn(row)} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Check-in phòng này</button>}
            {row.status === 'CHECKED_IN' && <button onClick={() => onCheckout(row)} className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700">Checkout phòng này</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose, onCheckIn, onCheckout }: { booking: Booking; onClose: () => void; onCheckIn: (row: BookingRoomRow) => void; onCheckout: (row: BookingRoomRow) => void }) {
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-4xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-500">Booking detail</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{booking.bookingCode || `#${booking.id}`}</h2>
            <div className="mt-2 text-sm font-bold text-slate-500">User #{booking.userId} · {booking.status}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><HiX size={22} /></button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            <InfoCard label="Tổng tiền" value={formatCurrency(booking.totalPrice)} />
            <InfoCard label="Đã thanh toán" value={formatCurrency(booking.paidAmount)} />
            <InfoCard label="Còn lại" value={formatCurrency(Math.max(0, Number(booking.totalPrice || 0) - Number(booking.paidAmount || 0)))} />
            <InfoCard label="Thanh toán" value={paymentLabel(booking)} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(booking.items || []).map((item) => {
              const row = item as BookingRoomRow;
              const rep = representativeOf(row);
              return (
                <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-slate-950">Phòng {item.roomId}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{roomStatusLabel(item.status)}</div>
                    </div>
                    {(item.status === 'BOOKED' || item.status === 'ACTIVE') && <button onClick={() => onCheckIn(row)} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white">Check-in</button>}
                    {item.status === 'CHECKED_IN' && <button onClick={() => onCheckout(row)} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white">Checkout</button>}
                  </div>
                  <div className="mt-4 space-y-2 text-sm font-bold text-slate-700">
                    <div>Đại diện: {rep?.fullName || '-'}</div>
                    <div>SĐT: {rep?.phone || '-'}</div>
                    <div>CCCD/Passport: {rep?.cccd || rep?.passport || '-'}</div>
                    <div>Khách đi cùng: {companionsOf(row).map((guest) => guest.fullName).join(', ') || '-'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  const isNegative = value < 0;
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-slate-100 pt-3 text-base font-black text-slate-950' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={isNegative ? 'font-black text-emerald-600' : undefined}>
        {isNegative ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-rose-400" />
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-slate-100 bg-white py-16 text-center text-sm font-black text-slate-400 shadow-sm">{text}</div>;
}
