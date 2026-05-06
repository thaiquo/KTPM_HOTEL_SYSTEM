import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch, HiOutlineClipboardCheck, HiOutlineCash, HiOutlineCreditCard, HiOutlineUserGroup, HiOutlineIdentification, HiOutlinePhone, HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as QRCode from 'qrcode';
import { buildPaymentSocketUrl, paymentApi, roomApi, staffBookingApi, type CheckinQrPayment } from '../../../services/api';
import type { Booking, BookingGuest, Room } from '../../../types';

type BookingRow = Booking & { room?: Room; guestList?: BookingGuest[]; remainingAmount: number };
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const isValidCccd = (value: string | undefined) => /^\d{12}$/.test((value || '').trim());
const ageOn = (dateOfBirth?: string) => {
  if (!dateOfBirth) return -1;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};
const isAdultGuest = (guest: BookingGuest) => guest.type === 'ADULT' || ageOn(guest.dateOfBirth) >= 18;

const StaffCheckInPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cccdByBooking, setCccdByBooking] = useState<Record<string, string>>({});
  const [representativeByBooking, setRepresentativeByBooking] = useState<Record<string, string>>({});
  const [phoneByBooking, setPhoneByBooking] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [earlyFeeBooking, setEarlyFeeBooking] = useState<BookingRow | null>(null);
  const [earlyFeeAmount, setEarlyFeeAmount] = useState<number>(0);
  const [earlyFeeMethod, setEarlyFeeMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [earlyFeeCashReceived, setEarlyFeeCashReceived] = useState('');
  const [qrPayment, setQrPayment] = useState<CheckinQrPayment | null>(null);
  const [qrStatus, setQrStatus] = useState<'PENDING' | 'SUCCESS'>('PENDING');
  const [nowTick, setNowTick] = useState(Date.now());
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const bookings = await staffBookingApi.getCheckInList();
      const enriched = await Promise.all(bookings.map(async (booking) => {
        const [room, payments, guests] = await Promise.all([
          roomApi.getById(booking.roomId).catch(() => undefined),
          paymentApi.getByBooking(booking.id).catch(() => []),
          staffBookingApi.getGuests(booking.id).catch(() => []),
        ]);
        const successfulPaymentAmount = payments
          .filter((payment) => payment.status === 'SUCCESS')
          .reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
        const paidAmount = successfulPaymentAmount > 0 ? successfulPaymentAmount : (booking.paidAmount || 0);
        return {
          ...booking,
          room,
          guestList: guests,
          remainingAmount: Math.max(0, (booking.totalPrice || 0) - paidAmount),
          paidAmount: Math.max(booking.paidAmount || 0, paidAmount),
        };
      }));
      setRepresentativeByBooking((prev) => {
        const next = { ...prev };
        enriched.forEach((booking) => {
          const selected = booking.guestList?.find((guest) => guest.checkInPerson && isAdultGuest(guest))
            || booking.guestList?.find((guest) => guest.primaryGuest && isAdultGuest(guest))
            || booking.guestList?.find(isAdultGuest);
          if (selected && !next[booking.id]) next[booking.id] = selected.id;
        });
        return next;
      });
      setItems(enriched);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách check-in');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!qrPayment) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [qrPayment]);

  useEffect(() => {
    if (!qrPayment?.confirmUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, qrPayment.confirmUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch(() => toast.error('Không thể tạo mã QR'));
  }, [qrPayment?.confirmUrl]);

  useEffect(() => {
    if (!qrPayment?.paymentCode) return;
    const socket = new WebSocket(buildPaymentSocketUrl());
    socket.onopen = () => {
      socket.send(JSON.stringify({ event: 'payment:join', paymentCode: qrPayment.paymentCode }));
    };
    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data?.payload?.paymentCode !== qrPayment.paymentCode) return;
        if (data.event === 'payment:success') {
          setQrStatus('SUCCESS');
          toast.success('Check-in thành công');
          window.setTimeout(() => {
            setQrPayment(null);
            setSelectedBooking(null);
            fetchData();
          }, 1500);
        }
        if (data.event === 'payment:cancelled') {
          setQrPayment(null);
          setQrStatus('PENDING');
          toast.error('Giao dịch đã hủy');
        }
      } catch {
        // Ignore invalid socket messages.
      }
    };
    return () => socket.close();
  }, [qrPayment?.paymentCode]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((booking) =>
      [`${booking.id}`, booking.room?.roomNumber, booking.room?.name, booking.userId]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, searchTerm]);

  const getSelectedRepresentative = (booking: BookingRow) => {
    const selectedId = representativeByBooking[booking.id];
    return booking.guestList?.find((guest) => guest.id === selectedId && isAdultGuest(guest));
  };

  const getRepresentativePhone = (booking: BookingRow) => {
    const selected = getSelectedRepresentative(booking);
    return (phoneByBooking[booking.id] || selected?.phone || '').trim();
  };

  const openCheckInFlow = (booking: BookingRow, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    
    // Khởi tạo các giá trị mặc định cho modal
    const currentRepId = representativeByBooking[booking.id];
    const currentPhone = phoneByBooking[booking.id];
    const currentCccd = cccdByBooking[booking.id];

    // Nếu chưa có thông tin trong state local, thử tìm từ guestList
    if (!currentRepId) {
      const selected = booking.guestList?.find((guest) => guest.checkInPerson && isAdultGuest(guest))
        || booking.guestList?.find((guest) => guest.primaryGuest && isAdultGuest(guest))
        || booking.guestList?.find(isAdultGuest);
      
      if (selected) {
        setRepresentativeByBooking(prev => ({ ...prev, [booking.id]: selected.id }));
        if (!currentPhone) setPhoneByBooking(prev => ({ ...prev, [booking.id]: selected.phone || '' }));
        if (!currentCccd) setCccdByBooking(prev => ({ ...prev, [booking.id]: selected.cccd || '' }));
      }
    }

    setSelectedBooking(booking);
    setPaymentMethod('BANK_TRANSFER');
    setCashReceived(String(Math.round(booking.remainingAmount)));
  };

  const doCheckIn = async (booking: BookingRow) => {
    const representativeCccd = cccdByBooking[booking.id]?.trim();
    const representativeGuest = getSelectedRepresentative(booking);
    const representativePhone = getRepresentativePhone(booking);
    if (!representativeGuest) {
      toast.error('Chọn người đại diện check-in đủ 18 tuổi trong danh sách khách lưu trú');
      return;
    }
    if (!isValidCccd(representativeCccd)) {
      toast.error('CCCD người đại diện phải gồm đúng 12 số');
      return;
    }
    try {
      setProcessing(true);
      await staffBookingApi.checkInWithRepresentative(booking.id, {
        representativeGuestId: representativeGuest.id,
        representativeCccd,
        representativePhone,
      });
      toast.success(`Check-in thành công booking #${booking.id}`);
      setSelectedBooking(null);
      setEarlyFeeBooking(null);
      fetchData();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Check-in thất bại';
      const match = String(message).match(/Early check-in fee payment is required\. Amount:\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (match && Number(match[1] || 0) > 0) {
        setEarlyFeeBooking(booking);
        setEarlyFeeAmount(Number(match[1]));
        setEarlyFeeMethod('BANK_TRANSFER');
        setEarlyFeeCashReceived(String(Math.round(Number(match[1]))));
        toast.error('Cần thu phí check-in sớm trước khi check-in');
        return;
      }
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmRemainingPayment = async () => {
    if (!selectedBooking) return;
    const requiredAmount = selectedBooking.remainingAmount;
    const received = Number(cashReceived || 0);
    if (paymentMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phần còn lại');
      return;
    }
    try {
      setProcessing(true);
      if (paymentMethod === 'CASH') {
        await staffBookingApi.collectRemainingPayment(selectedBooking.id, {
          amount: requiredAmount,
          userId: Number(selectedBooking.userId),
          payerGuestId: Number(getSelectedRepresentative(selectedBooking)?.id || 0),
          payerName: getSelectedRepresentative(selectedBooking)?.fullName,
          payerPhone: getRepresentativePhone(selectedBooking),
          method: 'CASH',
          transactionId: `CASH_${selectedBooking.id}_${Date.now()}`,
        });
        toast.success('Đã ghi nhận thanh toán phần còn lại');
        await doCheckIn({ ...selectedBooking, remainingAmount: 0, paidAmount: selectedBooking.totalPrice });
        return;
      }

      const qr = await paymentApi.createCheckinQr({
        bookingId: selectedBooking.id,
        amount: requiredAmount,
        method: 'BANK_TRANSFER',
        type: 'CHECKIN_REMAINING_PAYMENT',
      });
      setQrPayment(qr);
      setQrStatus('PENDING');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo giao dịch QR');
    } finally {
      setProcessing(false);
    }
  };

  const cancelQrPayment = async () => {
    if (!qrPayment) return;
    try {
      setProcessing(true);
      await paymentApi.cancelCheckinQr(qrPayment.paymentCode);
      setQrPayment(null);
      setQrStatus('PENDING');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể hủy giao dịch');
    } finally {
      setProcessing(false);
    }
  };
  const confirmEarlyCheckinFee = async () => {
    if (!earlyFeeBooking) return;
    const requiredAmount = earlyFeeAmount;
    const received = Number(earlyFeeCashReceived || 0);
    if (earlyFeeMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phí check-in sớm');
      return;
    }
    try {
      setProcessing(true);
      await paymentApi.markEarlyCheckinPaid(String(earlyFeeBooking.id));
      toast.success('Đã ghi nhận đã thu phí check-in sớm');
      await doCheckIn(earlyFeeBooking);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể ghi nhận thu phí check-in sớm');
    } finally {
      setProcessing(false);
    }
  };

  const earlyFeeChangeDue = earlyFeeMethod === 'CASH'
    ? Math.max(0, Number(earlyFeeCashReceived || 0) - earlyFeeAmount)
    : 0;

  const changeDue = selectedBooking && paymentMethod === 'CASH'
    ? Math.max(0, Number(cashReceived || 0) - selectedBooking.remainingAmount)
    : 0;

  const qrRemainingSeconds = qrPayment
    ? Math.max(0, Math.floor((new Date(qrPayment.expiredAt).getTime() - nowTick) / 1000))
    : 0;
  const qrCountdown = `${String(Math.floor(qrRemainingSeconds / 60)).padStart(2, '0')}:${String(qrRemainingSeconds % 60).padStart(2, '0')}`;
  const missingCheckInInfo = selectedBooking
    ? !getSelectedRepresentative(selectedBooking)
      || !getRepresentativePhone(selectedBooking)
      || !isValidCccd(cccdByBooking[selectedBooking.id])
    : true;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">Nhập CCCD đại diện; nếu còn tiền cọc thì thu phần còn lại trước khi check-in.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm booking, phòng, khách..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải booking...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking cần check-in</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thông tin Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thời gian lưu trú</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Trạng thái thanh toán</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => (
                  <tr 
                    key={booking.id} 
                    className="hover:bg-gray-50/40 cursor-pointer transition-colors"
                    onClick={() => openCheckInFlow(booking)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <HiOutlineClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                          <div className="text-xs text-gray-400">Khách hàng #{booking.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {booking.room?.roomNumber || booking.roomId}
                      </div>
                      {booking.room?.name && (
                        <div className="mt-1 text-[11px] text-gray-400">{booking.room.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-medium text-gray-700">
                        {new Date(booking.checkIn).toLocaleDateString('vi-VN')} → {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        {Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))} đêm
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalPrice)}</div>
                      {booking.remainingAmount > 0 ? (
                        <div className="mt-1 text-[11px] font-bold text-rose-500">Còn thiếu {formatCurrency(booking.remainingAmount)}</div>
                      ) : (
                        <div className="mt-1 text-[11px] font-bold text-emerald-500">Đã thanh toán đủ</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCheckInFlow(booking);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-sky-200 hover:bg-sky-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Xử lý Check-in
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl rounded-[32px] bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-6 px-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <HiOutlineClipboardCheck className="w-6 h-6 text-sky-600" />
                    Chi tiết Check-in #{selectedBooking.id}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Hoàn tất thông tin người check-in và thanh toán để nhận phòng.</p>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* 1. Thông tin khách lưu trú */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                    <HiOutlineUserGroup className="w-4 h-4" />
                    Danh sách khách lưu trú
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedBooking.guestList?.map((guest) => (
                      <div key={guest.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div>
                          <div className="text-sm font-bold text-gray-800">{guest.fullName}</div>
                          <div className="text-[11px] text-gray-500">
                            {isAdultGuest(guest) ? 'Người lớn' : 'Trẻ em'} {guest.phone ? ` · ${guest.phone}` : ''}
                          </div>
                        </div>
                        {guest.checkInPerson && (
                          <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full uppercase">Mặc định</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 2. Thông tin người check-in */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <HiOutlineIdentification className="w-4 h-4" />
                      Người check-in
                    </h3>
                    
                    <div className="space-y-4 rounded-2xl border border-gray-100 p-5 bg-sky-50/30">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Chọn người check-in</label>
                        <select
                          value={representativeByBooking[selectedBooking.id] || ''}
                          onChange={(event) => {
                            const guest = selectedBooking.guestList?.find((item) => item.id === event.target.value);
                            setRepresentativeByBooking({ ...representativeByBooking, [selectedBooking.id]: event.target.value });
                            setPhoneByBooking({ ...phoneByBooking, [selectedBooking.id]: guest?.phone || '' });
                            setCccdByBooking({ ...cccdByBooking, [selectedBooking.id]: guest?.cccd || '' });
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                        >
                          <option value="">Chọn đại diện đủ 18 tuổi</option>
                          {selectedBooking.guestList?.filter(isAdultGuest).map((guest) => (
                            <option key={guest.id} value={guest.id}>{guest.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Số điện thoại</label>
                          <div className="relative">
                            <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              value={phoneByBooking[selectedBooking.id] ?? getSelectedRepresentative(selectedBooking)?.phone ?? ''}
                              onChange={(event) => setPhoneByBooking({
                                ...phoneByBooking,
                                [selectedBooking.id]: event.target.value,
                              })}
                              placeholder="Nhập số điện thoại"
                              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Số CCCD (12 số)</label>
                          <div className="relative">
                            <HiOutlineIdentification className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              value={cccdByBooking[selectedBooking.id] || ''}
                              onChange={(event) => setCccdByBooking({
                                ...cccdByBooking,
                                [selectedBooking.id]: event.target.value.replace(/\D/g, '').slice(0, 12),
                              })}
                              placeholder="12 số CCCD"
                              inputMode="numeric"
                              maxLength={12}
                              className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all ${
                                cccdByBooking[selectedBooking.id] && !isValidCccd(cccdByBooking[selectedBooking.id])
                                  ? 'border-rose-300 bg-rose-50 focus:border-rose-500'
                                  : 'border-gray-200 bg-white focus:border-sky-500'
                              }`}
                            />
                          </div>
                          {cccdByBooking[selectedBooking.id] && !isValidCccd(cccdByBooking[selectedBooking.id]) && (
                            <div className="mt-1 text-[11px] font-bold text-rose-500 ml-1">CCCD phải đúng 12 số</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. Thanh toán */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <HiOutlineCash className="w-4 h-4" />
                      Thông tin thanh toán
                    </h3>

                    <div className="rounded-[24px] border border-gray-100 p-6 bg-gradient-to-br from-gray-50 to-white shadow-sm space-y-5">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Tổng tiền</div>
                          <div className="text-lg font-black text-gray-900">{formatCurrency(selectedBooking.totalPrice)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Đã thanh toán</div>
                          <div className="text-lg font-black text-emerald-600">{formatCurrency(selectedBooking.paidAmount || 0)}</div>
                        </div>
                      </div>

                      {selectedBooking.remainingAmount > 0 ? (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-rose-600">Còn thiếu: {formatCurrency(selectedBooking.remainingAmount)}</span>
                            <div className="flex bg-white p-1 rounded-xl border border-gray-200 gap-1">
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                                className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-sky-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                              >
                                Chuyển khoản
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('CASH')}
                                className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                              >
                                Tiền mặt
                              </button>
                            </div>
                          </div>

                          {paymentMethod === 'CASH' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Số tiền khách đưa</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cashReceived}
                                  onChange={(event) => setCashReceived(event.target.value)}
                                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                              </div>
                              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                <span className="text-xs font-bold text-emerald-700 uppercase">Tiền thối lại</span>
                                <span className="text-lg font-black text-emerald-700">{formatCurrency(changeDue)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-gray-200 text-center">
                          <div className="inline-flex items-center gap-2 text-emerald-600 font-bold py-2">
                            <HiOutlineClipboardCheck className="w-5 h-5" />
                            Đã thanh toán đủ
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="rounded-2xl border border-gray-200 px-8 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={
                      processing || 
                      missingCheckInInfo ||
                      (selectedBooking.remainingAmount > 0 && paymentMethod === 'CASH' && Number(cashReceived || 0) < selectedBooking.remainingAmount)
                    }
                    onClick={selectedBooking.remainingAmount > 0 ? confirmRemainingPayment : () => doCheckIn(selectedBooking)}
                    className="rounded-2xl bg-sky-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {processing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xử lý...
                      </div>
                    ) : (
                      selectedBooking.remainingAmount > 0 ? 'Thanh toán & Check-in' : 'Xác nhận Check-in'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {qrPayment && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Thanh toán chuyển khoản</h2>
                <p className="mt-1 text-sm text-gray-500">Khách quét QR và xác nhận trên điện thoại.</p>
              </div>
              <button
                type="button"
                onClick={cancelQrPayment}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
              <canvas ref={qrCanvasRef} aria-label="QR thanh toán" className="mx-auto h-[220px] w-[220px] rounded-xl bg-white p-2" />
              <a href={qrPayment.confirmUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs font-bold text-sky-700">
                {qrPayment.confirmUrl}
              </a>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sky-50 p-4">
                <div className="text-[10px] font-black uppercase text-sky-500">Số tiền</div>
                <div className="mt-1 text-lg font-black text-sky-900">{formatCurrency(qrPayment.amount)}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-[10px] font-black uppercase text-gray-400">Còn lại</div>
                <div className="mt-1 text-lg font-black text-gray-900">{qrCountdown}</div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl p-4 text-center text-sm font-black ${qrStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {qrStatus === 'SUCCESS' ? 'Thanh toán thành công' : 'Đang chờ thanh toán'}
            </div>

            <button
              type="button"
              disabled={processing || qrStatus === 'SUCCESS'}
              onClick={cancelQrPayment}
              className="mt-5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy giao dịch
            </button>
          </div>
        </div>
      )}

      {earlyFeeBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900">Thu phí check-in sớm</h2>
            <p className="mt-1 text-sm text-gray-500">Booking #{earlyFeeBooking.id} check-in trước 14:00 cần thu phí theo quy định.</p>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm">
              <div className="text-gray-400 font-bold">Số tiền cần thu</div>
              <div className="mt-1 text-2xl font-black text-rose-600">{formatCurrency(earlyFeeAmount)}</div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEarlyFeeMethod('BANK_TRANSFER')}
                className={`rounded-2xl border p-4 text-left ${earlyFeeMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
              >
                <HiOutlineCreditCard className="h-6 w-6 text-sky-600" />
                <div className="mt-2 font-black">Ngân hàng / QR</div>
                <div className="text-xs text-gray-500">Khách đã chuyển khoản đủ</div>
              </button>
              <button
                type="button"
                onClick={() => setEarlyFeeMethod('CASH')}
                className={`rounded-2xl border p-4 text-left ${earlyFeeMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
              >
                <HiOutlineCash className="h-6 w-6 text-emerald-600" />
                <div className="mt-2 font-black">Tiền mặt</div>
                <div className="text-xs text-gray-500">Nhập tiền khách đưa</div>
              </button>
            </div>

            {earlyFeeMethod === 'CASH' && (
              <div className="mt-5">
                <label className="text-xs font-bold uppercase text-gray-400">Số tiền khách đưa</label>
                <input
                  type="number"
                  min={0}
                  value={earlyFeeCashReceived}
                  onChange={(event) => setEarlyFeeCashReceived(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <div className="mt-2 text-sm font-bold text-gray-600">Tiền thối lại: <span className="text-emerald-600">{formatCurrency(earlyFeeChangeDue)}</span></div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEarlyFeeBooking(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={confirmEarlyCheckinFee}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận thu phí & Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckInPage;

