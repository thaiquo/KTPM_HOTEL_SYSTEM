import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineFilter, HiOutlineChartBar, HiOutlineSearch, HiOutlineLogout, HiOutlineCalendar } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import * as QRCode from 'qrcode';
import {
  paymentApi,
  buildPaymentSocketUrl,
  staffBookingApi,
  vietnamTodayISO,
  type CheckinQrPayment,
  type CheckInOutStats,
  type CheckoutResponse,
  type RefundAllocationLine,
} from '../../../services/api';
import { roomApi } from '../../../services/roomApi';
import type { Booking, BookingGuest, Room } from '../../../types';

type BookingRow = Booking & { room?: Room; roomList?: Room[]; guestList?: BookingGuest[] };
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';
type ServiceCatalogItem = { group: string; name: string; price: number };

const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { group: 'Đồ ăn & thức uống', name: 'Minibar', price: 80000 },
  { group: 'Đồ ăn & thức uống', name: 'Nước suối', price: 15000 },
  { group: 'Đồ ăn & thức uống', name: 'Bia / nước ngọt', price: 35000 },
  { group: 'Đồ ăn & thức uống', name: 'Snack', price: 30000 },
  { group: 'Đồ ăn & thức uống', name: 'Mì ly', price: 25000 },
  { group: 'Room Service', name: 'Đồ ăn', price: 180000 },
  { group: 'Room Service', name: 'Cà phê', price: 45000 },
  { group: 'Room Service', name: 'Bữa sáng', price: 160000 },
  { group: 'Room Service', name: 'Cocktail', price: 120000 },
  { group: 'Giặt ủi', name: 'Giặt thường', price: 70000 },
  { group: 'Giặt ủi', name: 'Giặt nhanh', price: 120000 },
  { group: 'Giặt ủi', name: 'Ủi đồ', price: 50000 },
  { group: 'Hư hỏng', name: 'Vỡ ly', price: 80000 },
  { group: 'Hư hỏng', name: 'Mất khăn', price: 150000 },
  { group: 'Hư hỏng', name: 'Hỏng remote', price: 300000 },
];

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const formatDateTimeMinute = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const checkoutTypeLabel = (value?: string) => {
  switch (value) {
    case 'EARLY': return 'Checkout sớm (Hoàn tiền)';
    case 'LATE': return 'Checkout trễ (Phụ thu)';
    case 'EARLY_AND_LATE': return 'Checkout sớm + Phụ thu trễ';
    case 'NORMAL': return 'Checkout đúng hạn';
    default: return value || 'Bình thường';
  }
};
const getBookingRoomIds = (booking: Booking) => {
  const roomIds = (booking.items || [])
    .map((item) => item.roomId)
    .filter((roomId): roomId is string => Boolean(roomId?.trim()));

  return Array.from(new Set(roomIds.length > 0 ? roomIds : booking.roomId ? [booking.roomId] : []));
};
const getBookingRoomSummary = (booking: BookingRow) => {
  const roomNumbers = booking.roomList?.map((room) => room.roomNumber).filter((roomNumber): roomNumber is string => Boolean(roomNumber?.trim())) || [];
  if (roomNumbers.length > 0) return roomNumbers.join(', ');
  const roomIds = getBookingRoomIds(booking);
  if (roomIds.length > 0) return roomIds.join(', ');
  return 'Chưa có phòng';
};
const getBookingRoomCount = (booking: BookingRow) => booking.totalRooms || booking.roomList?.length || getBookingRoomIds(booking).length || 1;
const lateCheckoutPercent = (minutes: number) => {
  if (minutes <= 0) return 0;
  if (minutes < 120) return 20;
  if (minutes < 360) return 50;
  const nextDay18hMinutes = 30 * 60;
  if (minutes < nextDay18hMinutes) return 100;
  const extraDays = Math.floor((minutes - nextDay18hMinutes) / (24 * 60)) + 1;
  return 100 + extraDays * 100;
};
const paymentStatusVi = (status?: string) => {
  switch ((status || '').toUpperCase()) {
    case 'PAID': return 'Đã thanh toán';
    case 'PARTIALLY_PAID': return 'Thanh toán một phần';
    case 'REFUNDED': return 'Đã hoàn tiền';
    case 'UNPAID': return 'Chưa thanh toán';
    default: return status || '-';
  }
};
const receiverTypeVi = (t?: string) => {
  switch (t) {
    case 'USER': return 'Người đặt (User)';
    case 'REPRESENTATIVE_GUEST': return 'Khách / đại diện đã thanh toán';
    case 'WALK_IN_GUEST': return 'Khách tại quầy';
    default: return t || '-';
  }
};

const purposeVi = (p?: string) => {
  switch (p) {
    case 'DEPOSIT': return 'Cọc';
    case 'FULL_PAYMENT': return 'Thanh toán 100%';
    case 'REMAINING': return 'Phần còn lại';
    default: return p || '-';
  }
};

const normalizeInvoiceLines = (lines: any) => {
  if (Array.isArray(lines)) {
    return lines.map((line, index) => ({
      key: `line-${index}`,
      name: line.name || line.type || `Dòng ${index + 1}`,
      description: line.type || '',
      quantity: line.quantity,
      amount: Number(line.amount ?? line.lineTotal ?? 0),
    }));
  }
  if (lines && typeof lines === 'object') {
    const result: Array<{ key: string; name: string; description?: string; quantity?: number; amount: number }> = [];
    if (Number(lines.actualRoomCharge ?? lines.roomTotal ?? 0) > 0) {
      result.push({ key: 'room', name: 'Tiền phòng thực tế', description: 'Giá trị lưu trú sau điều chỉnh', amount: Number(lines.actualRoomCharge ?? lines.roomTotal ?? 0) });
    }
    if (Number(lines.lateFee || 0) > 0) {
      result.push({ key: 'lateFee', name: 'Phụ thu checkout trễ', description: 'Theo chính sách trả phòng', amount: Number(lines.lateFee || 0) });
    }
    if (Array.isArray(lines.serviceLines)) {
      lines.serviceLines.forEach((line: any, index: number) => {
        result.push({
          key: `service-${line.id || index}`,
          name: line.name || 'Dịch vụ phát sinh',
          description: 'Dịch vụ',
          quantity: Number(line.quantity || 0),
          amount: Number(line.lineTotal || line.amount || 0),
        });
      });
    } else if (Number(lines.serviceTotal || 0) > 0) {
      result.push({ key: 'serviceTotal', name: 'Dịch vụ phát sinh', description: 'Tổng dịch vụ', amount: Number(lines.serviceTotal || 0) });
    }
    if (Number(lines.earlyCheckoutAdjustment ?? lines.refund ?? 0) > 0) {
      result.push({ key: 'earlyCheckoutAdjustment', name: 'Điều chỉnh checkout sớm', description: 'Đã trừ vào tiền phòng thực tế', amount: 0 });
    }
    return result;
  }
  return [];
};

const StaffCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'STAYING' | 'DONE'>('TODAY');
  const [showStatsFilter, setShowStatsFilter] = useState(false);
  const [statsDate, setStatsDate] = useState(vietnamTodayISO());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [stats, setStats] = useState<CheckInOutStats | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, CheckoutResponse>>({});
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newServiceName, setNewServiceName] = useState(SERVICE_CATALOG[0]?.name || '');
  const [newServiceQty, setNewServiceQty] = useState(1);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);

  const [activeBooking, setActiveBooking] = useState<BookingRow | null>(null);
  const [activeStep, setActiveStep] = useState<'PREVIEW' | 'PAYMENT' | null>(null);
  const [lateFeeMethod, setLateFeeMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [lateFeeCashReceived, setLateFeeCashReceived] = useState('');
  const [lateFeeQrPayment, setLateFeeQrPayment] = useState<CheckinQrPayment | null>(null);
  const [lateFeeQrStatus, setLateFeeQrStatus] = useState<'PENDING' | 'SUCCESS'>('PENDING');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryDate = (activeTab === 'TODAY' || !showAllHistory) ? statsDate : undefined;

      const getListPromise = () => {
        switch (activeTab) {
          case 'TODAY': return staffBookingApi.getTodayCheckoutList(queryDate);
          case 'STAYING': return staffBookingApi.getCheckoutList(); // Staying is based on current guest list
          case 'DONE': return staffBookingApi.getAlreadyCheckedOutTodayList(queryDate);
          default: return staffBookingApi.getCheckoutList();
        }
      };

      const [bookings, todayStats] = await Promise.all([
        getListPromise(),
        staffBookingApi.getTodayStats(statsDate).catch(() => null),
      ]);
      setStats(todayStats);

      const allRoomIds = Array.from(new Set(bookings.flatMap(getBookingRoomIds)));
      const roomEntries = await Promise.all(
        allRoomIds.map(async (roomId) => [roomId, await roomApi.getById(roomId).catch(() => undefined)] as const)
      );
      const roomById = new Map(roomEntries.filter((entry): entry is readonly [string, Room] => Boolean(entry[1])));

      const enriched = bookings.map((booking) => {
        const roomList = getBookingRoomIds(booking)
          .map((roomId) => roomById.get(roomId))
          .filter((room): room is Room => Boolean(room));
        return {
          ...booking,
          room: roomList[0],
          roomList,
        };
      });
      setItems(enriched);
    } catch (error: any) {
      console.error('Fetch checkout data error:', error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || 'Không thể tải danh sách checkout';
      toast.error(status ? `[${status}] ${msg}` : msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statsDate, showAllHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeResult = activeBooking ? checkoutResult[String(activeBooking.id)] : undefined;
  const lateFeeAmount = Number(activeResult?.lateCheckoutFee || 0);
  const checkoutChargeAmount = Math.max(0, Number(activeResult?.remainingBalance ?? activeResult?.finalAmount ?? lateFeeAmount));
  const lateFeeMinutes = Number(activeResult?.lateMinutes || 0);
  const hasLateCheckout = lateFeeAmount > 0 || lateFeeMinutes > 0;
  const hasEarlyCheckout = Boolean(activeResult?.checkoutType?.includes('EARLY'));
  const refundRate = Number(activeResult?.refundRate ?? 0);
  const unusedNights = Number(activeResult?.unusedNights ?? 0);
  const refundAmount = Number(activeResult?.refundAmount ?? 0);
  const apiNightly = Number(activeResult?.effectivePricePerNight ?? 0);
  const refundNightlyAmount = apiNightly > 0 ? apiNightly : (unusedNights > 0 && refundRate > 0 ? refundAmount / unusedNights / refundRate : 0);
  const latePercent = lateCheckoutPercent(lateFeeMinutes);
  const amountPaid = Number(activeResult?.amountPaid ?? activeBooking?.paidAmount ?? 0);
  const roomCount = activeBooking ? getBookingRoomCount(activeBooking) : 1;
  const roomChargeTotal = Number(activeResult?.roomCharge ?? activeResult?.roomTotal ?? activeBooking?.finalTotal ?? activeBooking?.totalPrice ?? 0);
  const actualRoomCharge = Number(activeResult?.actualRoomCharge ?? Math.max(0, roomChargeTotal - Number(activeResult?.refundAmount || 0)));
  const roomChargePerRoom = Math.round(roomChargeTotal / Math.max(1, roomCount));
  const remainingRoomAmount = Math.max(0, actualRoomCharge - amountPaid);
  const remainingBalance = Math.max(0, Number(activeResult?.remainingBalance ?? activeResult?.finalAmount ?? 0));
  const grandTotal = Number(activeResult?.grandTotal ?? roomChargeTotal + Number(activeResult?.serviceTotal || 0) + lateFeeAmount - Number(activeResult?.refundAmount || 0));
  const refundSettlementAmount = Number(activeResult?.refundSettlementAmount ?? Math.max(0, amountPaid - grandTotal));
  const paymentStatus = activeResult?.paymentStatus || (remainingBalance <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
  const numberOfNights = activeBooking?.checkIn && activeBooking?.checkOut
    ? Math.max(1, Math.round((new Date(activeBooking.checkOut).getTime() - new Date(activeBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const paymentStatusClass = paymentStatus === 'PAID'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : paymentStatus === 'REFUNDED'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : paymentStatus === 'PARTIALLY_PAID'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';
  const serviceCatalogGroups = useMemo(() => {
    return SERVICE_CATALOG.reduce<Record<string, ServiceCatalogItem[]>>((groups, item) => {
      groups[item.group] = [...(groups[item.group] || []), item];
      return groups;
    }, {});
  }, []);
  const selectedService = SERVICE_CATALOG.find((item) => item.name === newServiceName) || SERVICE_CATALOG[0];
  const selectedServicePrice = Number(selectedService?.price || 0);
  const selectedServiceLineTotal = Math.max(1, Number(newServiceQty || 1)) * selectedServicePrice;
  const representativeGuest = activeBooking?.guestList?.find((guest) => guest.checkInPerson)
    || activeBooking?.guestList?.find((guest) => guest.primaryGuest)
    || activeBooking?.guestList?.find((guest) => guest.type === 'ADULT')
    || activeBooking?.guestList?.[0];

  const lateFeeChangeDue = useMemo(() => {
    if (lateFeeMethod !== 'CASH') return 0;
    return Math.max(0, Number(lateFeeCashReceived || 0) - checkoutChargeAmount);
  }, [checkoutChargeAmount, lateFeeCashReceived, lateFeeMethod]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((booking) =>
      [`${booking.id}`, booking.room?.roomNumber, booking.roomList?.map((room) => room.roomNumber).join(' '), booking.userId]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, searchTerm]);

  const isReadOnly = activeTab === 'DONE';

  const openCheckoutPreview = async (booking: BookingRow) => {
    try {
      setProcessing(true);
      const [result, guests] = await Promise.all([
        staffBookingApi.calculateCheckout(String(booking.id)),
        booking.guestList ? Promise.resolve(booking.guestList) : staffBookingApi.getGuests(String(booking.id)).catch(() => []),
      ]);
      const bookingWithGuests = { ...booking, guestList: guests };
      setCheckoutResult((prev) => ({ ...prev, [String(booking.id)]: result }));
      setActiveBooking(bookingWithGuests);
      setItems((prev) => prev.map((item) => String(item.id) === String(booking.id) ? bookingWithGuests : item));
      setActiveStep('PREVIEW');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết checkout');
    } finally {
      setProcessing(false);
    }
  };

  const confirmCheckout = async () => {
    if (!activeBooking) return;
    try {
      setProcessing(true);
      const result = await staffBookingApi.confirmCheckout(String(activeBooking.id));
      setCheckoutResult((prev) => ({ ...prev, [String(activeBooking.id)]: result }));

      const amountToCollect = Math.max(0, Number(result.remainingBalance ?? result.finalAmount ?? result.lateCheckoutFee ?? 0));
      if (result.paymentRequired && amountToCollect > 0) {
        setLateFeeMethod('BANK_TRANSFER');
        setLateFeeCashReceived(String(Math.round(amountToCollect)));
        setActiveStep('PAYMENT');
        toast.error('Cần thu khoản phát sinh trước khi hoàn tất checkout');
        return;
      }
      const hasNetRefund = Boolean(result.refundRequired) || Number(result.finalAmount || 0) < 0;
      setActiveBooking(null);
      setActiveStep(null);
      await fetchData();

      if (hasNetRefund) {
        toast.success('Checkout thành công & đã tạo yêu cầu hoàn tiền');
        navigate('/staff/refunds?tab=ASSIGNED&type=EARLY_CHECKOUT');
        return;
      }

      toast.success('Checkout thành công');
    } catch (error: any) {
      console.error('Checkout error:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Hệ thống đang xử lý chậm, vui lòng kiểm tra lại sau giây lát');
      } else {
        toast.error(error?.response?.data?.message || error.message || 'Không thể hoàn tất checkout');
      }
    } finally {
      setProcessing(false);
    }
  };

  const confirmLateFeePaymentAndComplete = async () => {
    if (!activeBooking) return;
    const requiredAmount = checkoutChargeAmount;
    const received = Number(lateFeeCashReceived || 0);
    if (lateFeeMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phí checkout trễ');
      return;
    }
    try {
      setProcessing(true);
      if (lateFeeMethod === 'BANK_TRANSFER') {
        if (lateFeeQrPayment) {
          await refreshLateFeeQrStatus();
          return;
        }
        const qr = await paymentApi.createCheckinQr({
          bookingId: String(activeBooking.id),
          amount: checkoutChargeAmount,
          method: 'BANK_TRANSFER',
          type: 'LATE_CHECKOUT_FEE',
        });
        setLateFeeQrPayment(qr);
        setLateFeeQrStatus('PENDING');
        setProcessing(false);
        return;
      }
      // Try to include payer info (name/phone/cccd) from booking guests if available
      let payerPayload: { payerName?: string; payerPhone?: string; payerGuestId?: number; payerCccd?: string } | undefined;
      try {
        const guests = await staffBookingApi.getGuests(activeBooking.id).catch(() => []);
        const representative = guests?.find((g: any) => g.checkInPerson) || guests?.find((g: any) => g.primaryGuest) || guests?.find((g: any) => g.type === 'ADULT') || guests?.[0];
        if (representative) {
          payerPayload = {
            payerName: representative.fullName || representative.name || '',
            payerPhone: representative.phone || '',
            payerGuestId: representative.id,
            payerCccd: representative.cccd || representative.identityNumber || undefined,
          };
        }
      } catch (e) {
        // ignore and proceed without payer info
      }

      await paymentApi.markLateCheckoutPaid(String(activeBooking.id), lateFeeMethod, payerPayload);
      await staffBookingApi.completeCheckout(String(activeBooking.id));
      toast.success('Đã thu phí trễ và hoàn tất checkout');
      setActiveBooking(null);
      setActiveStep(null);
      fetchData();
    } catch (error: any) {
      console.error('Checkout error:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Hệ thống đang xử lý chậm, vui lòng kiểm tra lại sau giây lát');
      } else {
        toast.error(error?.response?.data?.message || error.message || 'Không thể hoàn tất checkout');
      }
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!lateFeeQrPayment?.confirmUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, lateFeeQrPayment.confirmUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => undefined);
  }, [lateFeeQrPayment?.confirmUrl]);

  const refreshLateFeeQrStatus = async () => {
    if (!lateFeeQrPayment || !activeBooking) return;
    try {
      setProcessing(true);
      const result = await paymentApi.getCheckinQr(lateFeeQrPayment.paymentCode);
      if (result.status === 'SUCCESS' || result.status === 'PAID') {
        setLateFeeQrStatus('SUCCESS');
        try {
          await staffBookingApi.completeCheckout(String(activeBooking.id));
        } catch (completeError: any) {
          toast.error(completeError?.response?.data?.message || 'Thanh toán đã thành công nhưng chưa thể hoàn tất checkout');
          return;
        }
        toast.success('Thanh toán thành công. Đã hoàn tất checkout');
        setLateFeeQrPayment(null);
        setActiveBooking(null);
        setActiveStep(null);
        fetchData();
      } else {
        toast.error('Giao dịch chưa hoàn tất');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!lateFeeQrPayment || !activeBooking || activeStep !== 'PAYMENT') return;
    const timer = window.setInterval(async () => {
      try {
        const result = await paymentApi.getCheckinQr(lateFeeQrPayment.paymentCode);
        if (result.status === 'SUCCESS' || result.status === 'PAID') {
          setLateFeeQrStatus('SUCCESS');
          try {
            await staffBookingApi.completeCheckout(String(activeBooking.id));
          } catch (completeError: any) {
            toast.error(completeError?.response?.data?.message || 'Thanh toán đã thành công nhưng chưa thể hoàn tất checkout');
            return;
          }
          toast.success('Thanh toán thành công. Đã hoàn tất checkout');
          setLateFeeQrPayment(null);
          setActiveBooking(null);
          setActiveStep(null);
          fetchData();
        }
      } catch (error: any) {
        if (lateFeeQrStatus === 'SUCCESS') {
          toast.error(error?.response?.data?.message || 'Không thể hoàn tất checkout sau khi thanh toán');
        }
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [lateFeeQrPayment?.paymentCode, activeBooking?.id, activeStep]);

  const markCheckoutPaymentAndComplete = async (method: PaymentMethod) => {
    if (!activeBooking) return;
    if (method === 'CASH' && Number(lateFeeCashReceived || 0) < checkoutChargeAmount) {
      toast.error('Số tiền khách đưa chưa đủ để hoàn tất checkout');
      return;
    }

    try {
      setProcessing(true);
      const payerPayload = representativeGuest ? {
        payerName: representativeGuest.fullName || '',
        payerPhone: representativeGuest.phone || '',
        payerGuestId: Number(representativeGuest.id || 0),
        payerCccd: representativeGuest.cccd || undefined,
      } : undefined;
      await paymentApi.markLateCheckoutPaid(String(activeBooking.id), method, payerPayload);
      await staffBookingApi.completeCheckout(String(activeBooking.id));
      toast.success('Đã ghi nhận thanh toán và hoàn tất checkout');
      setActiveBooking(null);
      setActiveStep(null);
      setLateFeeQrPayment(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Không thể hoàn tất checkout');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!activeBooking) {
      setLateFeeQrPayment(null);
      setLateFeeQrStatus('PENDING');
    }
  }, [activeBooking]);

  const handleCheckoutPrimaryAction = () => {
    if (activeStep !== 'PAYMENT') {
      confirmCheckout();
      return;
    }
    if (lateFeeMethod === 'BANK_TRANSFER') {
      if (lateFeeQrPayment) {
        refreshLateFeeQrStatus();
      } else {
        confirmLateFeePaymentAndComplete();
      }
      return;
    }
    markCheckoutPaymentAndComplete(lateFeeMethod);
  };

  const getCheckoutPrimaryLabel = () => {
    if (processing) return 'Dang xu ly...';
    if (activeStep !== 'PAYMENT') return remainingBalance > 0 ? 'Bat dau thanh toan' : 'Hoan tat tra phong';
    if (lateFeeMethod === 'BANK_TRANSFER') return lateFeeQrPayment ? 'Kiem tra thanh toan' : 'Tao QR thanh toan';
    return 'Xac nhan thu tien';
  };

  useEffect(() => {
    if (!lateFeeQrPayment?.paymentCode || !activeBooking || activeStep !== 'PAYMENT') return;
    let completed = false;
    const socket = new WebSocket(buildPaymentSocketUrl());

    const completeFromSocket = async () => {
      if (completed) return;
      completed = true;
      setLateFeeQrStatus('SUCCESS');
      try {
        await staffBookingApi.completeCheckout(String(activeBooking.id));
        toast.success('Thanh toan thanh cong. Da hoan tat checkout');
        setLateFeeQrPayment(null);
        setActiveBooking(null);
        setActiveStep(null);
        fetchData();
      } catch (error: any) {
        completed = false;
        toast.error(error?.response?.data?.message || 'Thanh toan da thanh cong nhung chua the hoan tat checkout');
      }
    };

    socket.onopen = () => {
      socket.send(JSON.stringify({ event: 'payment:join', paymentCode: lateFeeQrPayment.paymentCode }));
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event !== 'payment:success') return;
        if (data?.payload?.paymentCode !== lateFeeQrPayment.paymentCode) return;
        completeFromSocket();
      } catch {
        // Ignore malformed socket messages; polling remains the fallback.
      }
    };

    return () => socket.close();
  }, [lateFeeQrPayment?.paymentCode, activeBooking?.id, activeStep, fetchData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isReadOnly ? 'Xem lịch sử các booking đã hoàn tất checkout.' : 'Nhấn Checkout để hệ thống tự tính checkout sớm/trễ và xử lý phí phát sinh.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="TODAY">Checkout hôm nay</option>
            <option value="STAYING">Đang lưu trú</option>
            <option value="DONE">Đã checkout</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l pl-2 border-gray-100">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <button
          onClick={() => setShowStatsFilter(!showStatsFilter)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm ${showStatsFilter ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <HiOutlineChartBar className="w-4 h-4" />
          Bộ lọc & Thống kê
        </button>
      </div>

      <AnimatePresence>
        {stats && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {showStatsFilter && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-sky-700 uppercase tracking-wider mb-2">Ngày thống kê</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        disabled={activeTab === 'STAYING' || (activeTab === 'DONE' && showAllHistory)}
                        value={statsDate}
                        onChange={(e) => setStatsDate(e.target.value)}
                        className="flex-1 bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:bg-gray-100"
                      />
                      {activeTab === 'DONE' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={showAllHistory} onChange={(e) => setShowAllHistory(e.target.checked)} className="w-5 h-5 rounded-lg border-sky-300 text-sky-600" />
                          <span className="text-sm font-bold text-sky-700">Chọn tất cả</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-sky-600 mt-5">Thống kê tự động cập nhật khi bạn thay đổi ngày.</p>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Tổng checkout dự kiến</div><div className="mt-1 text-2xl font-black text-gray-900">{stats.totalCheckOutToday}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Đã checkout</div><div className="mt-1 text-2xl font-black text-emerald-600">{stats.alreadyCheckedOut}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Chưa checkout</div><div className="mt-1 text-2xl font-black text-rose-600">{stats.notYetCheckedOut}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Đang dọn phòng</div><div className="mt-1 text-2xl font-black text-cyan-600">{stats.inCleaningNow}</div></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm booking, phòng, khách..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500" />
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải booking...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking nào khớp với tìm kiếm</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Checkout chuẩn</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thông tin lưu trú</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => {
                  const standardCheckout = new Date(`${booking.checkOut} 12:00`);
                  const checkoutTime = booking.actualCheckOutAt ? new Date(booking.actualCheckOutAt) : new Date();
                  
                  // Checkout trễ: Khi thời gian hiện tại hoặc thực tế checkout VƯỢT QUÁ 12:00 của ngày checkout dự kiến
                  const isLateCheckout = checkoutTime >= standardCheckout;
                  
                  // Checkout sớm: Chỉ khi NGÀY hiện tại < NGÀY dự kiến (không tính giờ)
                  // Nếu cùng ngày mà trước 12h thì coi là Bình thường (Đúng hạn)
                  const plannedDateOnly = new Date(booking.checkOut);
                  plannedDateOnly.setHours(0, 0, 0, 0);
                  const actualDateOnly = new Date(checkoutTime);
                  actualDateOnly.setHours(0, 0, 0, 0);
                  
                  const isEarlyCheckout = actualDateOnly.getTime() < plannedDateOnly.getTime();

                  const lateMinutes = isLateCheckout 
                    ? Math.max(1, Math.floor((checkoutTime.getTime() - standardCheckout.getTime()) / (1000 * 60)))
                    : 0;

                  // Xác định màu nền hàng
                  let rowColorClass = '';
                  if (!isReadOnly) {
                    if (isLateCheckout) rowColorClass = 'bg-rose-50/50';
                    else if (isEarlyCheckout) rowColorClass = 'bg-emerald-50/50';
                  } else {
                    if (isLateCheckout) rowColorClass = 'bg-rose-50/20';
                    else if (isEarlyCheckout) rowColorClass = 'bg-emerald-50/20';
                  }

                  const getRowCheckoutDetail = () => {
                    const totalNights = booking.checkIn && booking.checkOut 
                      ? Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                      : 1;
                    const pricePerNight = (booking.totalPrice || 0) / totalNights;
                    
                    if (isLateCheckout) {
                      const percent = lateCheckoutPercent(lateMinutes);
                      const lateFee = pricePerNight * (percent / 100);
                      return (
                        <div className="text-[11px] font-black text-rose-600 mt-1">
                          Phụ thu trễ ({percent}%): +{formatCurrency(lateFee)}
                        </div>
                      );
                    }
                    if (isEarlyCheckout) {
                      const usedDays = booking.checkIn && booking.actualCheckOutAt
                        ? Math.max(1, Math.round((new Date(booking.actualCheckOutAt).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                        : 1;
                      const chargeNights = Math.max(usedDays, 1);
                      const unusedNights = Math.max(0, totalNights - chargeNights);
                      const refundAmount = unusedNights * pricePerNight * 0.8;
                      return (
                        <div className="text-[11px] font-black text-emerald-600 mt-1">
                          Hoàn trả ({unusedNights} đêm): -{formatCurrency(refundAmount)}
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] font-bold text-gray-500 mt-1">
                        Checkout đúng hạn
                      </div>
                    );
                  };

                  return (
                    <tr 
                      key={booking.id} 
                      className={`hover:bg-gray-50/40 cursor-pointer transition-colors ${rowColorClass}`}
                      onClick={() => openCheckoutPreview(booking)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                          {isLateCheckout && (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700 uppercase animate-pulse">
                              Trễ {lateMinutes > 60 ? `${Math.floor(lateMinutes/60)}h ${lateMinutes%60}p` : `${lateMinutes}p`}
                            </span>
                          )}
                          {isEarlyCheckout && (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase">
                              Checkout Sớm
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">User #{booking.userId}</div>
                        {isReadOnly && getRowCheckoutDetail()}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-700">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {getBookingRoomCount(booking)} phòng
                          </div>
                          <div className="text-xs text-gray-500">
                            {getBookingRoomSummary(booking)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`text-sm font-bold ${isLateCheckout ? 'text-rose-600' : 'text-gray-600'}`}>
                          {booking.checkOut} 12:00
                        </div>
                        {isLateCheckout && (
                          <div className="text-[10px] font-bold text-rose-400 uppercase mt-0.5">Quá hạn trả phòng</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <HiOutlineCalendar className="w-3.5 h-3.5" />
                            In: {formatDateTimeMinute(booking.actualCheckInAt)}
                          </div>
                          {booking.actualCheckOutAt && (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                              <HiOutlineLogout className="w-3.5 h-3.5" />
                              Out: {formatDateTimeMinute(booking.actualCheckOutAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isReadOnly ? (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckoutPreview(booking);
                            }}
                            className="rounded-lg px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          >
                            Xem chi tiết
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            disabled={processing} 
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckoutPreview(booking);
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all ${isLateCheckout ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'} disabled:opacity-60`}
                          >
                            Checkout
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeBooking && activeStep && activeResult && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/45 px-4 py-5 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-white/60" role="dialog">
            <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wide text-sky-600">Trả phòng khách sạn</div>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Xác nhận checkout #{activeBooking.bookingCode || activeBooking.id}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Phòng {getBookingRoomSummary(activeBooking)} · {numberOfNights} đêm · {activeBooking.totalGuests || activeBooking.guestList?.length || 1} khách
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${paymentStatusClass}`}>
                    {paymentStatusVi(paymentStatus)}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setActiveBooking(null); setActiveStep(null); }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Thông tin đặt phòng</h3>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">{checkoutTypeLabel(activeResult.checkoutType)}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Mã booking</div><div className="mt-1 text-sm font-black text-slate-950">{activeBooking.bookingCode || `#${activeBooking.id}`}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Phòng</div><div className="mt-1 text-sm font-black text-slate-950">{getBookingRoomSummary(activeBooking)}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Check-in</div><div className="mt-1 text-sm font-black text-slate-950">{formatDateTimeMinute(activeBooking.actualCheckInAt || `${activeBooking.checkIn}T14:00:00`)}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Check-out</div><div className="mt-1 text-sm font-black text-slate-950">{formatDateTimeMinute(activeResult.actualCheckoutAt || activeBooking.actualCheckOutAt || new Date().toISOString())}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Nhân viên check-in</div><div className="mt-1 text-sm font-black text-slate-950">{activeResult.checkedInByStaffId ? `#${activeResult.checkedInByStaffId}` : '-'}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Nhân viên checkout</div><div className="mt-1 text-sm font-black text-slate-950">{activeResult.checkedOutByStaffId ? `#${activeResult.checkedOutByStaffId}` : 'Sẽ ghi nhận khi hoàn tất'}</div></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(activeBooking.roomList?.length ? activeBooking.roomList : activeBooking.room ? [activeBooking.room] : []).map((room) => (
                      <div key={room.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-black text-slate-950">Phòng {room.roomNumber || room.id}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{room.roomType?.type || 'Loại phòng'} · {room.floorLevel || `Tầng ${room.floorNumber || '-'}`}</div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{room.status || 'ROOM'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Thông tin khách hàng</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2 rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Đại diện</div><div className="mt-1 text-sm font-black text-slate-950">{representativeGuest?.fullName || activeResult.representativeFullName || '-'}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">SĐT</div><div className="mt-1 text-sm font-black text-slate-950">{representativeGuest?.phone || activeResult.representativePhone || '-'}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">CCCD/Passport</div><div className="mt-1 text-sm font-black text-slate-950">{representativeGuest?.cccd || activeResult.representativeCccd || '-'}</div></div>
                  </div>
                </section>

                {hasLateCheckout && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-amber-900">Phụ thu trả phòng trễ</h3>
                        <p className="mt-1 text-sm font-semibold text-amber-700">Trễ {lateFeeMinutes > 60 ? `${Math.floor(lateFeeMinutes / 60)} giờ ${lateFeeMinutes % 60} phút` : `${lateFeeMinutes} phút`} · Mức phụ thu {latePercent}% giá 1 đêm</p>
                      </div>
                      <div className="text-2xl font-black text-amber-900">{formatCurrency(lateFeeAmount)}</div>
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Dịch vụ phát sinh</h3>
                    <div className="text-sm font-black text-slate-700">{formatCurrency(Number(activeResult.serviceTotal || 0))}</div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(activeResult.serviceLines || []).length === 0 && <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Chưa có dịch vụ phát sinh.</div>}
                    {(activeResult.serviceLines || []).map((line) => (
                      <div key={line.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                        <div><div className="text-sm font-black text-slate-900">{line.name}</div><div className="text-xs font-semibold text-slate-500">Số lượng {line.quantity || 1}</div></div>
                        <div className="text-sm font-black text-slate-950">{formatCurrency(Number(line.lineTotal || 0))}</div>
                        {!isReadOnly && <button type="button" onClick={async () => { await staffBookingApi.deleteServiceLine(String(activeBooking.id), String(line.id)); const refreshed = await staffBookingApi.calculateCheckout(String(activeBooking.id)); setCheckoutResult((p) => ({ ...p, [String(activeBooking.id)]: refreshed })); }} className="rounded-lg px-2 py-1 text-xs font-black text-rose-600 hover:bg-rose-50">Xóa</button>}
                      </div>
                    ))}
                  </div>
                  {!isReadOnly && (
                    <div className="mt-4 grid grid-cols-12 gap-2 border-t border-slate-100 pt-4">
                      <select value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className="col-span-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold md:col-span-5">
                        {Object.entries(serviceCatalogGroups).map(([group, services]) => <optgroup key={group} label={group}>{services.map((service) => <option key={service.name} value={service.name}>{service.name} - {formatCurrency(service.price)}</option>)}</optgroup>)}
                      </select>
                      <input type="number" min={1} value={newServiceQty} onChange={(e) => setNewServiceQty(Math.max(1, Number(e.target.value || 1)))} className="col-span-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold md:col-span-2" />
                      <div className="col-span-5 rounded-xl bg-slate-50 px-3 py-2 text-right text-sm font-black text-slate-700 md:col-span-2">{formatCurrency(selectedServiceLineTotal)}</div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setProcessing(true);
                            await staffBookingApi.addServiceLine(String(activeBooking.id), { name: newServiceName, quantity: newServiceQty, unitPrice: selectedServicePrice });
                            const refreshed = await staffBookingApi.calculateCheckout(String(activeBooking.id));
                            setCheckoutResult((p) => ({ ...p, [String(activeBooking.id)]: refreshed }));
                            toast.success('Đã thêm dịch vụ phát sinh');
                          } catch (error: any) {
                            toast.error(error?.code === 'ECONNABORTED' ? 'Kết nối quá thời gian, vui lòng thử lại' : error?.response?.data?.message || error.message || 'Không thể thêm dịch vụ');
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                        className="col-span-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50 md:col-span-3"
                      >
                        Thêm dịch vụ
                      </button>
                    </div>
                  )}
                </section>

                {invoiceData && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Chi tiết hóa đơn</h3>
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                      {normalizeInvoiceLines(invoiceData.lines).map((line) => (
                        <div key={line.key} className="grid grid-cols-[1fr_auto] border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div><div className="text-sm font-black text-slate-900">{line.name}</div><div className="text-xs font-semibold text-slate-500">{line.description}</div></div>
                          <div className={`text-sm font-black ${line.amount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>{line.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(line.amount))}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="xl:sticky xl:top-0 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Tổng hợp thanh toán</h3>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${paymentStatusClass}`}>{paymentStatusVi(paymentStatus)}</span>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="font-semibold text-slate-500">Tiền phòng thực tế</span><span className="font-black text-slate-950">{formatCurrency(actualRoomCharge)}{roomCount > 1 ? ` · ${roomCount} phòng` : ''}</span></div>
                  {Number(activeResult.refundAmount || 0) > 0 && (
                    <div className="flex justify-between text-xs"><span className="font-semibold text-slate-400">Giá phòng ban đầu</span><span className="font-black text-slate-400 line-through">{formatCurrency(roomChargeTotal)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="font-semibold text-slate-500">Tiền dịch vụ</span><span className="font-black text-slate-950">{formatCurrency(Number(activeResult.serviceTotal || 0))}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-slate-500">Phụ thu trả phòng trễ</span><span className="font-black text-amber-700">{formatCurrency(lateFeeAmount)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-slate-500">Thuế</span><span className="font-black text-slate-950">{formatCurrency(Number(activeResult.taxAmount || 0))}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-slate-500">Giảm giá</span><span className="font-black text-emerald-700">-{formatCurrency(Number(activeResult.discountAmount || 0))}</span></div>
                  {Number(activeResult.refundAmount || 0) > 0 && <div className="flex justify-between"><span className="font-semibold text-slate-500">Điều chỉnh checkout sớm</span><span className="font-black text-emerald-700">-{formatCurrency(Number(activeResult.refundAmount || 0))}</span></div>}
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-sm"><span className="font-black text-slate-700">Tổng hóa đơn</span><span className="font-black text-slate-950">{formatCurrency(grandTotal)}</span></div>
                  <div className="mt-3 flex justify-between text-sm"><span className="font-black text-slate-700">Đã thanh toán</span><span className="font-black text-emerald-700">{formatCurrency(amountPaid)}</span></div>
                  {remainingRoomAmount > 0 && <div className="mt-3 flex justify-between text-sm"><span className="font-black text-slate-700">Còn thiếu tiền phòng</span><span className="font-black text-amber-700">{formatCurrency(remainingRoomAmount)}</span></div>}
                  {roomCount > 1 && (
                    <div className="mt-2 text-xs text-gray-500">Mỗi phòng (tạm tính): {formatCurrency(roomChargePerRoom)}</div>
                  )}
                  <div className="mt-4 rounded-2xl bg-sky-600 p-4 text-white">
                    <div className="text-xs font-black uppercase text-sky-100">Còn phải thu</div>
                    <div className="mt-1 text-3xl font-black">{formatCurrency(remainingBalance)}</div>
                  </div>
                  {refundSettlementAmount > 0 && (
                    <div className="mt-3 rounded-2xl bg-emerald-600 p-4 text-white">
                      <div className="text-xs font-black uppercase text-emerald-100">Cần hoàn cho khách</div>
                      <div className="mt-1 text-3xl font-black">{formatCurrency(refundSettlementAmount)}</div>
                      <div className="mt-1 text-xs font-bold text-emerald-50">Đã thanh toán - Tổng hóa đơn</div>
                    </div>
                  )}
                </div>

                {remainingBalance > 0 && activeStep === 'PAYMENT' && (
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['CASH', 'Tiền mặt'],
                        ['BANK_TRANSFER', 'Chuyển khoản'],
                      ] as const).map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setLateFeeMethod(value)} className={`rounded-xl border px-2 py-2 text-xs font-black ${lateFeeMethod === value ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                      ))}
                    </div>
                    {lateFeeMethod === 'CASH' && (
                      <div className="space-y-3">
                        <input type="number" min={0} value={lateFeeCashReceived} onChange={(e) => setLateFeeCashReceived(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-black" />
                        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Tiền thối lại: {formatCurrency(lateFeeChangeDue)}</div>
                      </div>
                    )}
                    {lateFeeMethod !== 'CASH' && (
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                        {lateFeeQrPayment ? <canvas ref={qrCanvasRef} className="mx-auto h-[220px] w-[220px] rounded-xl bg-white p-2" /> : <div className="rounded-xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">Tạo mã QR để khách quét thanh toán</div>}
                        <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                          <div>Ngân hàng: VietQR / Hotel Demo</div>
                          <div>Số tài khoản: 9704220000000001</div>
                          <div>Nội dung: CHECKOUT {activeBooking.id}</div>
                          <div>Số tiền: {formatCurrency(remainingBalance)}</div>
                        </div>
                        {!lateFeeQrPayment && <button type="button" onClick={confirmLateFeePaymentAndComplete} disabled={processing} className="mt-3 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Tạo QR thanh toán</button>}
                        {lateFeeQrPayment && (
                          <div className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-black ${lateFeeQrStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {lateFeeQrStatus === 'SUCCESS' ? 'Thanh toán thành công, đang hoàn tất checkout...' : 'Đang chờ mobile xác nhận thanh toán'}
                          </div>
                        )}
                        {lateFeeQrPayment && <button type="button" onClick={refreshLateFeeQrStatus} disabled={processing} className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-black text-sky-700 disabled:opacity-50">Kiểm tra thanh toán</button>}
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>

            <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button type="button" onClick={() => { setActiveBooking(null); setActiveStep(null); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Hủy</button>
              <button
                type="button"
                disabled={processing || (activeStep === 'PAYMENT' && remainingBalance > 0 && lateFeeMethod === 'CASH' && Number(lateFeeCashReceived || 0) < remainingBalance)}
                onClick={handleCheckoutPrimaryAction}
                className="rounded-xl bg-sky-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getCheckoutPrimaryLabel()}
              </button>
            </div>
          </div>
        </div>
      )}

      {false && activeBooking && activeStep && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 px-4 py-5">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" role="dialog">
            <div className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{activeStep === 'PAYMENT' ? 'Thu phí checkout trễ' : 'Xác nhận Checkout'}</h2>
                  <p className="mt-1 text-sm text-gray-500">Booking #{activeBooking.id} · {getBookingRoomCount(activeBooking)} phòng · {getBookingRoomSummary(activeBooking)}</p>
                </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!activeBooking) return;
                      try {
                        setProcessing(true);
                        const inv = await staffBookingApi.getInvoice(String(activeBooking.id));
                        setInvoiceData(inv);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Không tìm thấy hoá đơn');
                      } finally { setProcessing(false); }
                    }} className="rounded-xl border px-3 py-2 text-sm font-bold">Xem hoá đơn</button>
                  </div>
                {activeResult?.checkoutType && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${
                    activeResult.checkoutType === 'LATE' ? 'bg-rose-600 text-white' :
                    activeResult.checkoutType === 'EARLY' ? 'bg-emerald-600 text-white' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {checkoutTypeLabel(activeResult.checkoutType)}
                  </span>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {activeResult && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm space-y-2">
                    
                    {/* ĐỐI TƯỢNG VÀ THỜI GIAN GIAO DỊCH GHI NHẬN TỪ DỮ LIỆU */}
                    <div className="p-3 bg-white rounded-xl border border-sky-100/50 space-y-2 text-xs">
                      {activeResult.checkoutType === 'EARLY' ? (
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Khách nhận hoàn tiền (Đại diện)</span>
                          <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                            👤 {activeResult.representativeFullName || '—'}
                          </span>
                          {activeResult.representativeCccd && (
                            <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                              🆔 CCCD: {activeResult.representativeCccd}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Khách thanh toán phụ thu (Đại diện)</span>
                          <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                            👤 {activeResult.representativeFullName || '—'}
                          </span>
                          {activeResult.representativeCccd && (
                            <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                              🆔 CCCD: {activeResult.representativeCccd}
                            </span>
                          )}
                        </div>
                      )}

                      {activeBooking.actualCheckOutAt && (
                        <div className="border-t border-gray-100 pt-2 mt-2">
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Thời gian Checkout ghi nhận thực tế</span>
                          <span className="text-sky-600 font-extrabold block mt-0.5">
                            ⏰ {formatDateTimeMinute(activeBooking.actualCheckOutAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between font-bold text-gray-900"><span>Loại checkout</span><span>{checkoutTypeLabel(activeResult.checkoutType)}</span></div>
                  <div className="rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-500 leading-relaxed">
                    Đại diện check-in: <span className="font-bold text-gray-900">{activeResult.representativeFullName || '—'}</span><br/>
                    CCCD: <span className="font-bold text-gray-900">{activeResult.representativeCccd || '—'}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Thông tin khách hàng</div>
                        <div className="mt-1 text-base font-black text-slate-950">{representativeGuest?.fullName || activeResult.representativeFullName || 'Chưa có đại diện'}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                        {representativeGuest?.checkInPerson ? 'Đại diện check-in' : representativeGuest?.primaryGuest ? 'Khách chính' : 'Khách lưu trú'}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Số điện thoại</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{representativeGuest?.phone || activeResult.representativePhone || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">CCCD</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{representativeGuest?.cccd || activeResult.representativeCccd || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Email</div>
                        <div className="mt-1 truncate text-sm font-bold text-slate-900">{representativeGuest?.email || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Loại khách</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{representativeGuest?.type || '-'}</div>
                      </div>
                    </div>
                    {activeBooking.guestList && activeBooking.guestList.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeBooking.guestList.map((guest) => (
                          <span key={guest.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                            {guest.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeResult.refundAllocations && activeResult.refundAllocations.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3"><div className="text-emerald-900 font-black mb-2">Phân bổ hoàn tiền</div>
                      <ul className="space-y-2">{activeResult.refundAllocations.map((line, idx) => <li key={idx} className="rounded-lg bg-white/90 px-3 py-2 text-[11px] font-bold text-gray-800">{line.recipientSummaryVi || `${formatCurrency(line.amount || 0)} → ${receiverTypeVi(line.receiverType)}`}</li>)}</ul>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                    <span className="font-bold text-gray-900">Tổng kết (Net)</span>
                    <span className={`font-black ${Number(activeResult.finalAmount || 0) < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(activeResult.finalAmount || 0) < 0 ? 'Hoàn trả: ' : 'Thu thêm: '}
                      {formatCurrency(Math.abs(Number(activeResult.finalAmount || 0)))}
                    </span>
                  </div>
                  
                  {hasLateCheckout && (
                    <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-sm font-black text-rose-700 uppercase">Phát sinh phí Checkout trễ</span>
                        </div>
                        <div className="text-lg font-black text-rose-700">{formatCurrency(Number(activeResult.lateCheckoutFee || 0))}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rose-100">
                        <div>
                          <div className="text-[10px] font-bold text-rose-400 uppercase">Thời gian trễ</div>
                          <div className="text-sm font-bold text-rose-900">
                            {activeResult.lateMinutes && activeResult.lateMinutes > 60 
                              ? `${Math.floor(activeResult.lateMinutes / 60)} giờ ${activeResult.lateMinutes % 60} phút`
                              : `${activeResult.lateMinutes || 0} phút`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-rose-400 uppercase">Mức phụ thu</div>
                          <div className="text-sm font-bold text-rose-900">
                            {activeResult.lateMinutes ? `${lateCheckoutPercent(activeResult.lateMinutes)}%` : '0%'} giá phòng
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasEarlyCheckout && refundAmount > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black uppercase text-emerald-800">Hoan tien checkout som</div>
                          <div className="mt-1 text-xs font-bold text-emerald-700">
                            Hoan {Math.round(refundRate * 100)}% cho {unusedNights} dem chua su dung
                          </div>
                        </div>
                        <div className="text-lg font-black text-emerald-800">-{formatCurrency(refundAmount)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 border-t border-emerald-100 pt-3 text-xs">
                        <div>
                          <div className="font-bold uppercase text-emerald-500">Gia 1 dem</div>
                          <div className="mt-1 font-black text-emerald-900">{formatCurrency(refundNightlyAmount)}</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-emerald-500">Dem chua o</div>
                          <div className="mt-1 font-black text-emerald-900">{unusedNights} dem</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold uppercase text-emerald-500">Ty le</div>
                          <div className="mt-1 font-black text-emerald-900">{Math.round(refundRate * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {invoiceData && (
                    <div className="mt-4 rounded-xl bg-white border p-3 text-sm">
                      <div className="font-black">Hóa đơn</div>
                      <div className="text-xs text-gray-500">Số tiền: {formatCurrency(Number(invoiceData.amount || 0))} · {invoiceData.currency}</div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                        {normalizeInvoiceLines(invoiceData.lines).length > 0 ? (
                          normalizeInvoiceLines(invoiceData.lines).map((line) => (
                            <div key={line.key} className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
                              <div>
                                <div className="font-black text-slate-900">{line.name}</div>
                                <div className="mt-0.5 text-xs font-semibold text-slate-500">
                                  {[line.description, line.quantity ? `SL: ${line.quantity}` : ''].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              <div className={`text-right font-black ${line.amount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>
                                {line.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(line.amount))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm font-bold text-slate-500">Chưa có dòng hóa đơn chi tiết.</div>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-2">Ngày tạo: {invoiceData.createdAt || ''}</div>
                    </div>
                  )}
                  {/* Service lines */}
                  <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-sm">Dịch vụ phát sinh</div>
                      <div className="text-sm font-bold text-gray-600">Tổng: {formatCurrency(Number(activeResult.serviceTotal || 0))}</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(activeResult.serviceLines || []).map((line: any) => (
                        <div key={line.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-sm font-bold">{line.name} × {line.quantity}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-black text-gray-800">{formatCurrency(Number(line.lineTotal || 0))}</div>
                            {!isReadOnly && (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  setProcessing(true);
                                  await staffBookingApi.deleteServiceLine(String(activeBooking.id), String(line.id));
                                  const refreshed = await staffBookingApi.calculateCheckout(String(activeBooking.id));
                                  setCheckoutResult((prev) => ({ ...prev, [String(activeBooking.id)]: refreshed }));
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || 'Xóa dịch vụ thất bại');
                                } finally { setProcessing(false); }
                              }} className="text-xs text-rose-600 font-bold">Xóa</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isReadOnly && (
                      <div className="mt-3 border-t pt-3">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <select
                            value={newServiceName}
                            onChange={(e) => {
                              setNewServiceName(e.target.value);
                            }}
                            className="col-span-12 md:col-span-5 rounded-xl border px-3 py-2 text-sm font-bold"
                          >
                            {Object.entries(serviceCatalogGroups).map(([group, services]) => (
                              <optgroup key={group} label={group}>
                                {services.map((service) => (
                                  <option key={service.name} value={service.name}>
                                    {service.name} - {formatCurrency(service.price)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={String(newServiceQty)}
                            onChange={(e) => setNewServiceQty(Math.max(1, Number(e.target.value || 1)))}
                            className="col-span-3 md:col-span-2 rounded-xl border px-3 py-2 text-sm"
                          />
                          <div className="col-span-5 md:col-span-2 rounded-xl bg-gray-50 px-3 py-2 text-right text-sm font-black text-gray-800">
                            {formatCurrency(selectedServicePrice)}
                          </div>
                          <div className="col-span-4 md:col-span-2 rounded-xl bg-sky-50 px-3 py-2 text-right text-sm font-black text-sky-800">
                            {formatCurrency(selectedServiceLineTotal)}
                          </div>
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            if (!newServiceName || Number(newServiceQty) <= 0) {
                              toast.error('Tên dịch vụ và số lượng hợp lệ là bắt buộc');
                              return;
                            }
                            try {
                              setProcessing(true);
                              await staffBookingApi.addServiceLine(String(activeBooking.id), { name: newServiceName, quantity: Number(newServiceQty), unitPrice: selectedServicePrice });
                              const refreshed = await staffBookingApi.calculateCheckout(String(activeBooking.id));
                              setCheckoutResult((prev) => ({ ...prev, [String(activeBooking.id)]: refreshed }));
                              setNewServiceName(SERVICE_CATALOG[0]?.name || '');
                              setNewServiceQty(1);
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Thêm dịch vụ thất bại');
                            } finally { setProcessing(false); }
                          }} className="col-span-12 md:col-span-1 rounded-xl bg-sky-600 text-white px-3 py-2 text-sm font-black">Thêm</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeStep === 'PAYMENT' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-rose-50 p-4"><div className="text-xs font-bold text-rose-600 uppercase">Số tiền cần thu</div><div className="text-2xl font-black text-rose-700">{formatCurrency(checkoutChargeAmount)}</div></div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setLateFeeMethod('BANK_TRANSFER')} className={`rounded-xl border p-4 text-left ${lateFeeMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Chuyển khoản</div></button>
                    <button onClick={() => setLateFeeMethod('CASH')} className={`rounded-xl border p-4 text-left ${lateFeeMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Tiền mặt</div></button>
                  </div>
                  {lateFeeMethod === 'CASH' && <input type="number" value={lateFeeCashReceived} onChange={(e) => setLateFeeCashReceived(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-black" />}
                  {lateFeeMethod === 'BANK_TRANSFER' && (
                    <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                      <div className="text-sm font-black text-sky-700">Tạo QR cho khách quét chuyển khoản</div>
                      {lateFeeQrPayment ? (
                        <>
                          <div className="rounded-2xl border border-white bg-white p-4 text-center">
                            <canvas ref={qrCanvasRef} className="mx-auto h-55 w-55 rounded-xl bg-white p-2" />
                          </div>
                          <div className={`rounded-2xl px-4 py-3 text-center text-sm font-black ${lateFeeQrStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {lateFeeQrStatus === 'SUCCESS' ? 'Thanh toán thành công' : 'Đang chờ thanh toán'}
                          </div>
                          <button
                            type="button"
                            onClick={refreshLateFeeQrStatus}
                            disabled={processing}
                            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            Kiểm tra trạng thái thanh toán
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={confirmLateFeePaymentAndComplete}
                          disabled={processing}
                          className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                          Tạo QR thanh toán
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-5 py-4">
              {isReadOnly ? (
                <button 
                  onClick={() => { setActiveBooking(null); setActiveStep(null); }} 
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 px-6 py-2 text-sm font-black text-gray-700 transition-all shadow-sm"
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button 
                    disabled={processing} 
                    onClick={() => { setActiveBooking(null); setActiveStep(null); }} 
                    className="rounded-xl border px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={processing} 
                    onClick={activeStep === 'PAYMENT' ? confirmLateFeePaymentAndComplete : confirmCheckout} 
                    className="min-w-30 rounded-xl bg-sky-600 px-6 py-2 text-sm font-black text-white shadow-lg shadow-sky-100 hover:bg-sky-700 disabled:opacity-70 transition-all"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xử lý...
                      </div>
                    ) : (
                      activeStep === 'PAYMENT'
                        ? lateFeeMethod === 'BANK_TRANSFER'
                          ? (lateFeeQrPayment ? 'Kiểm tra thanh toán' : 'Tạo QR')
                          : 'Xác nhận thu tiền'
                        : 'Xác nhận'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckoutPage;
