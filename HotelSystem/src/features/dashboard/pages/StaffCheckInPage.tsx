import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch, HiOutlineClipboardCheck, HiOutlineCash, HiOutlineUserGroup, HiOutlineIdentification, HiOutlinePhone, HiX, HiOutlineChartBar, HiOutlineFilter } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as QRCode from 'qrcode';
import { buildPaymentSocketUrl, paymentApi, roomApi, staffBookingApi, userApi, vietnamTodayISO, type CheckinQrPayment, type CheckInOutStats } from '../../../services/api';
import type { Booking, BookingGuest, Room } from '../../../types';

type BookingRow = Booking & { room?: Room; guestList?: BookingGuest[]; remainingAmount: number };
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';
type CheckInTab = 'OVERDUE' | 'TODAY' | 'DONE';

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
  message?: string;
};

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const isValidCccd = (value: string | undefined) => /^\d{12}$/.test((value || '').trim());
const isValidPhone = (value: string | undefined) => /^\d{10}$/.test((value || '').trim());
const getDisplayPaidAmount = (booking: Booking) => {
  if (booking.status === 'deposit_paid') {
    return Number(booking.depositAmount || booking.paidAmount || 0);
  }

  if (booking.status === 'confirmed'
    || booking.status === 'checked_in'
    || booking.status === 'checkout_pending_payment'
    || booking.status === 'checked_out'
    || booking.status === 'completed') {
    return Number(booking.totalPrice || booking.paidAmount || 0);
  }

  return Number(booking.paidAmount || 0);
};
const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as ApiErrorLike;
  const status = err.response?.status;
  const message = err.response?.data?.message || err.message || fallback;
  return status ? `[${status}] ${message}` : message;
};
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

const calculateEarlyCheckInFee = (booking: BookingRow, now: Date = new Date()) => {
  if (!booking.checkIn) return 0;
  const checkInDate = new Date(booking.checkIn);
  const sameDay = now.toDateString() === checkInDate.toDateString();
  if (!sameDay) return 0;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (currentHour >= 12) return 0;

  const nights = Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  const baseNightly = Number(booking.totalPrice || 0) / nights;
  const percent = currentHour < 7 ? 1 : 0.5;
  return Math.round(baseNightly * percent);
};

const StaffCheckInPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CheckInTab>('TODAY');
  const [statsDate, setStatsDate] = useState(vietnamTodayISO());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [stats, setStats] = useState<CheckInOutStats | null>(null);
  const [showStatsFilter, setShowStatsFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cccdByBooking, setCccdByBooking] = useState<Record<string, string>>({});
  const [representativeByBooking, setRepresentativeByBooking] = useState<Record<string, string>>({});
  const [phoneByBooking, setPhoneByBooking] = useState<Record<string, string>>({});
  const [userNameByBooking, setUserNameByBooking] = useState<Record<string, string>>({});
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

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryDate = (activeTab === 'TODAY' || !showAllHistory) ? statsDate : undefined;

      const getListPromise = () => {
        switch (activeTab) {
          case 'TODAY': return staffBookingApi.getTodayCheckInList(queryDate);
          case 'OVERDUE': return staffBookingApi.getTodayCheckInList(queryDate); // Backend handles overdue when date is today or before
          case 'DONE': return staffBookingApi.getAlreadyCheckedInTodayList(queryDate);
          default: return staffBookingApi.getCheckInList();
        }
      };

      const [rawBookings, todayStats] = await Promise.all([
        getListPromise(),
        staffBookingApi.getTodayStats(statsDate).catch(() => null),
      ]);

      setStats(todayStats);

      // Filtering logic for OVERDUE vs TODAY if needed (depends on backend query)
      let bookings = rawBookings;
      const today = vietnamTodayISO();
      if (activeTab === 'TODAY' && !showAllHistory) {
        // "TODAY" list now includes anything that should have checked in but hasn't yet, as long as stay is active
        bookings = rawBookings.filter(b => b.checkIn <= today && b.checkOut >= today);
      } else if (activeTab === 'OVERDUE' && !showAllHistory) {
        // "OVERDUE" now only means truly past the checkout date
        bookings = rawBookings.filter(b => b.checkOut < today);
      }

      const enriched = await Promise.all(bookings.map(async (booking) => {
        const [room, guests] = await Promise.all([
          roomApi.getById(booking.roomId).catch(() => undefined),
          staffBookingApi.getGuests(booking.id).catch(() => []),
        ]);
        const totalPrice = booking.totalPrice || 0;
        const paidAmount = Math.min(totalPrice, getDisplayPaidAmount(booking));
        return {
          ...booking,
          room,
          guestList: guests,
          remainingAmount: Math.max(0, totalPrice - paidAmount),
          paidAmount,
        };
      }));

      // Fetch user names
      const userNames = new Map<string, string>();
      await Promise.all(
        enriched.map(async (booking) => {
          try {
            // Thử fetch từ API bằng userApi chuyên biệt
            const userResponse = await userApi.getUserById(booking.userId);
            let userName = '';
            
            // Xử lý nhiều format response
            if (userResponse.data?.data?.name) {
              userName = userResponse.data.data.name;
            } else if (userResponse.data?.data?.fullName) {
              userName = userResponse.data.data.fullName;
            } else if (userResponse.data?.name) {
              userName = userResponse.data.name;
            } else if (userResponse.data?.fullName) {
              userName = userResponse.data.fullName;
            }
            
            if (userName.trim()) {
              userNames.set(booking.id, userName);
            } else {
              userNames.set(booking.id, `User #${booking.userId}`);
            }
          } catch {
            // Nếu API call fail, fallback
            userNames.set(booking.id, `User #${booking.userId}`);
          }
        })
      );
      const userNameObj = Object.fromEntries(userNames);
      setUserNameByBooking(userNameObj);
      console.log('StaffCheckIn - userNameByBooking', userNameObj);

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
    } catch (error: unknown) {
      console.error('Fetch data error:', error);
      toast.error(getErrorMessage(error, 'Không thể tải dữ liệu'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statsDate, showAllHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          toast.success('Thanh toán thành công. Đang xử lý check-in...');
          // Auto-close QR modal sau 1.5 giây và tự động doCheckIn()
          setTimeout(() => {
            setQrPayment(null);
            setQrStatus('PENDING');
            if (selectedBooking) {
              doCheckIn(selectedBooking);
            }
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
  // The effect only needs to restart when the active QR session changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrPayment?.paymentCode, selectedBooking]);

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
    // Chỉ cho phép xử lý Check-in ở tab TODAY (bao gồm cả khách đến trễ nhưng vẫn trong hạn lưu trú)
    if (activeTab !== 'TODAY') return; 
    event?.preventDefault();
    event?.stopPropagation();

    const currentRepId = representativeByBooking[booking.id];
    if (!currentRepId) {
      const selected = booking.guestList?.find((guest) => guest.checkInPerson && isAdultGuest(guest))
        || booking.guestList?.find((guest) => guest.primaryGuest && isAdultGuest(guest))
        || booking.guestList?.find(isAdultGuest);
      if (selected) {
        setRepresentativeByBooking(prev => ({ ...prev, [booking.id]: selected.id }));
        setPhoneByBooking(prev => ({ ...prev, [booking.id]: selected.phone || '' }));
        setCccdByBooking(prev => ({ ...prev, [booking.id]: selected.cccd || '' }));
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
    if (!isValidPhone(representativePhone)) {
      toast.error('Số điện thoại người đại diện phải gồm đúng 10 số');
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
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Check-in thất bại');
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
    const earlyCheckInFee = calculateEarlyCheckInFee(selectedBooking);
    const requiredAmount = selectedBooking.remainingAmount + earlyCheckInFee;
    const received = Number(cashReceived || 0);
    if (paymentMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phần cần thu');
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tạo giao dịch QR'));
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể hủy giao dịch'));
    } finally {
      setProcessing(false);
    }
  };

  const closeQrModal = async () => {
    if (!qrPayment) return;
    // Nếu chưa success, hủy giao dịch QR
    if (qrStatus !== 'SUCCESS') {
      await cancelQrPayment();
    } else {
      // Nếu đã success, chỉ close modal
      setQrPayment(null);
      setQrStatus('PENDING');
    }
    // Reset về payment method selection - có thể chọn Tiền mặt hoặc tạo QR mới
    setPaymentMethod('CASH');
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
      await paymentApi.markEarlyCheckinPaid(String(earlyFeeBooking.id), earlyFeeMethod);
      toast.success('Đã ghi nhận đã thu phí check-in sớm');
      await doCheckIn(earlyFeeBooking);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể ghi nhận thu phí check-in sớm'));
    } finally {
      setProcessing(false);
    }
  };

  const isReadOnly = activeTab !== 'TODAY';
  const earlyCheckInFee = selectedBooking ? calculateEarlyCheckInFee(selectedBooking) : 0;
  const checkInPaymentDue = selectedBooking ? selectedBooking.remainingAmount + earlyCheckInFee : 0;
  const changeDue = selectedBooking && paymentMethod === 'CASH' ? Math.max(0, Number(cashReceived || 0) - checkInPaymentDue) : 0;
  const qrRemainingSeconds = qrPayment ? Math.max(0, Math.floor((new Date(qrPayment.expiredAt).getTime() - nowTick) / 1000)) : 0;
  const qrCountdown = `${String(Math.floor(qrRemainingSeconds / 60)).padStart(2, '0')}:${String(qrRemainingSeconds % 60).padStart(2, '0')}`;
  const requiresRemainingPayment = selectedBooking ? checkInPaymentDue > 0 : false;
  const isDepositPaidBookingWithRemaining = false;
  const missingCheckInInfo = selectedBooking ? !getSelectedRepresentative(selectedBooking) || !isValidPhone(getRepresentativePhone(selectedBooking)) || !isValidCccd(cccdByBooking[selectedBooking.id]) : true;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeTab === 'OVERDUE' ? 'Xem danh sách các booking đã hết hạn lưu trú mà khách không đến.' : activeTab === 'DONE' ? 'Xem danh sách khách đã vào phòng.' : 'Xử lý Check-in cho khách đến đúng hạn hoặc khách đến trễ.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as CheckInTab)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="TODAY">Check-in hôm nay</option>
            <option value="OVERDUE">Hết hạn check-in (Expired)</option>
            <option value="DONE">Đã check-in</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l pl-2 border-gray-100">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
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
                        disabled={activeTab !== 'TODAY' && showAllHistory}
                        value={statsDate}
                        onChange={(e) => setStatsDate(e.target.value)}
                        className="flex-1 bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      {activeTab !== 'TODAY' && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={showAllHistory}
                            onChange={(e) => setShowAllHistory(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-sky-300 text-sky-600 focus:ring-sky-500/20"
                          />
                          <span className="text-sm font-bold text-sky-700 group-hover:text-sky-900 transition-colors">Chọn tất cả</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-sky-600 mt-5">
                      {showAllHistory ? 'Đang hiển thị toàn bộ lịch sử không giới hạn ngày.' : 'Thống kê được cập nhật theo ngày bạn chọn.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400">Tổng check-in dự kiến</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{stats.totalCheckInToday}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400">Đã check-in</div>
                <div className="mt-1 text-2xl font-black text-emerald-600">{stats.alreadyCheckedIn}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400">Chưa check-in</div>
                <div className="mt-1 text-2xl font-black text-rose-600">{stats.notYetCheckedIn}</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400">Đang dọn dẹp</div>
                <div className="mt-1 text-2xl font-black text-cyan-600">{stats.inCleaningNow}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking nào trong danh sách này</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Booking / Người đặt / Đại diện / SĐT</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thời gian lưu trú</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Trạng thái thanh toán</th>
                  {!isReadOnly && <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => (
                  <tr
                    key={booking.id}
                    className={`transition-colors ${!isReadOnly ? 'hover:bg-gray-50/40 cursor-pointer' : ''}`}
                    onClick={() => !isReadOnly && openCheckInFlow(booking)}
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        {/* Booking ID */}
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 flex-shrink-0">
                            <HiOutlineClipboardCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">#Booking {booking.id}</div>
                          </div>
                        </div>

                        {/* Thông tin Người đặt & Đại diện */}
                        {(() => {
                          const rep = [...(booking.guestList || [])].sort((a, b) => {
                            const isDone = activeTab === 'DONE';
                            if (isDone) {
                              if (a.checkInPerson && !b.checkInPerson) return -1;
                              if (!a.checkInPerson && b.checkInPerson) return 1;
                            }
                            if (a.primaryGuest && !b.primaryGuest) return -1;
                            if (!a.primaryGuest && b.primaryGuest) return 1;
                            return 0;
                          })[0];
                          
                          const repPhone = rep?.phone || '-';
                          const repName = rep?.fullName || 'Chưa có thông tin';

                          return (
                            <div className="text-xs space-y-1.5 ml-0.5 mt-2">
                              <div className="flex items-start gap-1">
                                <span className="text-gray-400 font-semibold w-16">Tài khoản:</span>
                                <span className="text-gray-900 font-bold">{userNameByBooking[booking.id] || `User #${booking.userId}`}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="text-gray-400 font-semibold w-16">Đại diện:</span>
                                <span className="text-gray-900 font-bold">{repName}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="text-gray-400 font-semibold w-16">SĐT:</span>
                                <span className="text-sky-600 font-bold flex items-center gap-1">
                                  <HiOutlinePhone className="w-3 h-3" />
                                  {repPhone}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {booking.room?.roomNumber || booking.roomId}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-medium text-gray-700">
                        {new Date(booking.checkIn).toLocaleDateString('vi-VN')} → {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalPrice)}</div>
                      {booking.status === 'deposit_paid' ? (
                        <>
                          <div className="mt-1 text-[11px] font-bold text-blue-600">Đã đặt cọc {formatCurrency(getDisplayPaidAmount(booking))}</div>
                          {booking.remainingAmount > 0 && (
                            <div className="mt-1 text-[11px] font-bold text-rose-500">Còn thiếu {formatCurrency(booking.remainingAmount)}</div>
                          )}
                        </>
                      ) : booking.remainingAmount > 0 ? (
                        <div className="mt-1 text-[11px] font-bold text-rose-500">Còn thiếu {formatCurrency(booking.remainingAmount)}</div>
                      ) : (
                        <div className="mt-1 text-[11px] font-bold text-emerald-500">Đã thanh toán đủ</div>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCheckInFlow(booking);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition-all"
                        >
                          Xử lý Check-in
                        </button>
                      </td>
                    )}
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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-4xl rounded-[32px] bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 p-6 px-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <HiOutlineClipboardCheck className="w-6 h-6 text-sky-600" />
                    Chi tiết Check-in #{selectedBooking.id}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Hoàn tất thông tin người check-in và thanh toán để nhận phòng.</p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"><HiX className="w-6 h-6" /></button>
              </div>

              <div className="p-8 space-y-8">
                <section className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 p-6 border border-sky-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-2">Người đặt phòng</div>
                      <div className="text-lg font-black text-gray-900">{userNameByBooking[selectedBooking.id] || `User #${selectedBooking.userId}`}</div>
                      <div className="text-xs text-gray-500 mt-2">ID: #{selectedBooking.userId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-2">Phòng</div>
                      <div className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-bold text-sky-700 border border-sky-200">
                        {selectedBooking.room?.roomNumber || selectedBooking.roomId}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-2">Thời gian lưu trú</div>
                      <div className="text-sm font-bold text-gray-900">
                        {new Date(selectedBooking.checkIn).toLocaleDateString('vi-VN')} → {new Date(selectedBooking.checkOut).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                    <HiOutlineUserGroup className="w-4 h-4" /> Danh sách khách lưu trú
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedBooking.guestList?.map((guest) => (
                      <div key={guest.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div>
                          <div className="text-sm font-bold text-gray-800">{guest.fullName}</div>
                          <div className="text-[11px] text-gray-500">{isAdultGuest(guest) ? 'Người lớn' : 'Trẻ em'} {guest.phone ? ` · ${guest.phone}` : ''}</div>
                        </div>
                        {guest.checkInPerson && <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full uppercase">Mặc định</span>}
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <HiOutlineIdentification className="w-4 h-4" /> Người đại diện check-in
                    </h3>
                    <div className="space-y-4 rounded-2xl border border-gray-100 p-6 bg-white">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2.5 ml-1">👤 Chọn người check-in (đủ 18 tuổi)</label>
                        <select
                          value={representativeByBooking[selectedBooking.id] || ''}
                          onChange={(event) => {
                            const guest = selectedBooking.guestList?.find((item) => item.id === event.target.value);
                            setRepresentativeByBooking({ ...representativeByBooking, [selectedBooking.id]: event.target.value });
                            setPhoneByBooking({ ...phoneByBooking, [selectedBooking.id]: guest?.phone || '' });
                            setCccdByBooking({ ...cccdByBooking, [selectedBooking.id]: guest?.cccd || '' });
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                        >
                          <option value="">-- Chọn đại diện --</option>
                          {selectedBooking.guestList?.filter(isAdultGuest).map((guest) => (
                            <option key={guest.id} value={guest.id}>{guest.fullName}</option>
                          ))}
                        </select>
                      </div>
                      
                      {getSelectedRepresentative(selectedBooking) && (
                        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
                          <div className="text-xs font-bold text-sky-600 mb-2">ℹ️ Thông tin đã chọn:</div>
                          <div className="text-sm font-bold text-gray-900">{getSelectedRepresentative(selectedBooking)?.fullName}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-2.5 ml-1">📱 Số điện thoại</label>
                          <div className="relative">
                            <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              value={phoneByBooking[selectedBooking.id] ?? getSelectedRepresentative(selectedBooking)?.phone ?? ''}
                              onChange={(event) => setPhoneByBooking({ ...phoneByBooking, [selectedBooking.id]: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                              placeholder="Nhập SĐT (10 số)"
                              inputMode="numeric"
                              maxLength={10}
                              className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all ${getRepresentativePhone(selectedBooking) && !isValidPhone(getRepresentativePhone(selectedBooking)) ? 'border-rose-300 bg-rose-50 focus:border-rose-500' : 'border-gray-200 bg-white focus:border-sky-500'}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-2.5 ml-1">🆔 Số CCCD (12 số)</label>
                          <div className="relative">
                            <HiOutlineIdentification className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              value={cccdByBooking[selectedBooking.id] || ''}
                              onChange={(event) => setCccdByBooking({ ...cccdByBooking, [selectedBooking.id]: event.target.value.replace(/\D/g, '').slice(0, 12) })}
                              placeholder="CCCD"
                              inputMode="numeric"
                              maxLength={12}
                              className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all ${cccdByBooking[selectedBooking.id] && !isValidCccd(cccdByBooking[selectedBooking.id]) ? 'border-rose-300 bg-rose-50 focus:border-rose-500' : 'border-gray-200 bg-white focus:border-sky-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <HiOutlineCash className="w-4 h-4" /> Thông tin thanh toán
                    </h3>
                    <div className="rounded-[24px] border border-gray-100 p-6 bg-gradient-to-br from-gray-50 to-white shadow-sm space-y-5">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Tổng tiền</div>
                          <div className="text-lg font-black text-gray-900">{formatCurrency(selectedBooking.totalPrice)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase">{selectedBooking.status === 'deposit_paid' ? 'Đã đặt cọc' : 'Đã thanh toán'}</div>
                          <div className="text-lg font-black text-emerald-600">{formatCurrency(getDisplayPaidAmount(selectedBooking))}</div>
                        </div>
                      </div>
                      {selectedBooking.remainingAmount > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-xs font-bold text-rose-700 uppercase">Còn phải trả</span>
                          <span className="text-xl font-black text-rose-600">{formatCurrency(selectedBooking.remainingAmount)}</span>
                        </div>
                      )}
                      {earlyCheckInFee > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-xs font-bold text-amber-700 uppercase">Phụ thu check-in sớm</span>
                          <span className="text-xl font-black text-amber-600">{formatCurrency(earlyCheckInFee)}</span>
                        </div>
                      )}
                      {checkInPaymentDue > 0 ? (
                        isDepositPaidBookingWithRemaining ? (
                          <div className="pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                            Booking đã đặt cọc, vẫn có thể nhận phòng. Số tiền còn lại sẽ được thu sau khi nhận phòng.
                          </div>
                        ) : (
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-sm font-bold text-rose-600">Cần thu: {formatCurrency(checkInPaymentDue)}</span>
                              <div className="flex bg-white p-1 rounded-xl border border-gray-200 gap-1">
                                <button type="button" onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-sky-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Chuyển khoản</button>
                                <button type="button" onClick={() => setPaymentMethod('CASH')} className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Tiền mặt</button>
                              </div>
                            </div>
                            {paymentMethod === 'CASH' && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <input type="number" min={0} value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                  <span className="text-xs font-bold text-emerald-700 uppercase">Tiền thối lại</span>
                                  <span className="text-lg font-black text-emerald-700">{formatCurrency(changeDue)}</span>
                                </div>
                              </div>
                            )}
                            {paymentMethod === 'BANK_TRANSFER' && checkInPaymentDue > 0 && (
                              <div className="mt-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-xs font-bold text-sky-700">
                                QR sẽ bao gồm {selectedBooking.remainingAmount > 0 ? 'tiền còn lại' : ''}{selectedBooking.remainingAmount > 0 && earlyCheckInFee > 0 ? ' + ' : ''}{earlyCheckInFee > 0 ? 'phụ thu check-in sớm' : ''}.
                              </div>
                            )}
                          </div>
                        )
                      ) : <div className="pt-4 border-t border-gray-200 text-center"><div className="inline-flex items-center gap-2 text-emerald-600 font-bold py-2"><HiOutlineClipboardCheck className="w-5 h-5" /> Đã thanh toán đủ</div></div>}
                    </div>
                  </section>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setSelectedBooking(null)} className="rounded-2xl border border-gray-200 px-8 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">Hủy bỏ</button>
                  <button type="button" disabled={processing || missingCheckInInfo || (requiresRemainingPayment && paymentMethod === 'CASH' && Number(cashReceived || 0) < checkInPaymentDue)} onClick={requiresRemainingPayment ? confirmRemainingPayment : () => doCheckIn(selectedBooking)} className="rounded-2xl bg-sky-600 px-10 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-700 disabled:opacity-50 transition-all">
                    {processing ? 'Đang xử lý...' : (requiresRemainingPayment ? 'Thanh toán & Check-in' : 'Xác nhận Check-in')}
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
              <div><h2 className="text-xl font-black text-gray-900">Thanh toán chuyển khoản</h2><p className="mt-1 text-sm text-gray-500">Khách quét QR và xác nhận trên điện thoại.</p></div>
              <button type="button" onClick={closeQrModal} disabled={processing} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"><HiX className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
              <canvas ref={qrCanvasRef} className="mx-auto h-[220px] w-[220px] rounded-xl bg-white p-2" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sky-50 p-4"><div className="text-[10px] font-black uppercase text-sky-500">Số tiền</div><div className="mt-1 text-lg font-black text-sky-900">{formatCurrency(qrPayment.amount)}</div></div>
              <div className="rounded-2xl bg-gray-50 p-4"><div className="text-[10px] font-black uppercase text-gray-400">Còn lại</div><div className="mt-1 text-lg font-black text-gray-900">{qrCountdown}</div></div>
            </div>
            <div className={`mt-4 rounded-2xl p-4 text-center text-sm font-black ${qrStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{qrStatus === 'SUCCESS' ? 'Thanh toán thành công' : 'Đang chờ thanh toán'}</div>
            {qrStatus !== 'SUCCESS' && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!qrPayment) return;
                    try {
                      setProcessing(true);
                      const res = await paymentApi.getCheckinQr(qrPayment.paymentCode);
                      if (res && (res.status === 'SUCCESS' || res.status === 'PAID')) {
                        setQrStatus('SUCCESS');
                        toast.success('Thanh toán thành công. Đang xử lý check-in...');
                        setTimeout(() => {
                          setQrPayment(null);
                          setQrStatus('PENDING');
                          if (selectedBooking) {
                            doCheckIn(selectedBooking);
                          }
                        }, 1500);
                      } else {
                        toast.error('Giao dịch chưa được hoàn tất hoặc chưa thanh toán.');
                      }
                    } catch (err: unknown) {
                      toast.error(getErrorMessage(err, 'Không thể kiểm tra trạng thái thanh toán'));
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <HiOutlineClipboardCheck className="w-4 h-4" /> Kiểm tra trạng thái thanh toán
                </button>
                <button
                  type="button"
                  onClick={closeQrModal}
                  disabled={processing}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Đổi sang thanh toán tiền mặt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {earlyFeeBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900">Thu phí check-in sớm</h2>
            <p className="mt-1 text-sm text-gray-500">Booking #{earlyFeeBooking.id} check-in trước 14:00 cần thu phí.</p>
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm"><div className="text-gray-400 font-bold">Số tiền cần thu</div><div className="mt-1 text-2xl font-black text-rose-600">{formatCurrency(earlyFeeAmount)}</div></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEarlyFeeMethod('BANK_TRANSFER')} className={`rounded-2xl border p-4 text-left ${earlyFeeMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Ngân hàng / QR</div></button>
              <button type="button" onClick={() => setEarlyFeeMethod('CASH')} className={`rounded-2xl border p-4 text-left ${earlyFeeMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Tiền mặt</div></button>
            </div>
            {earlyFeeMethod === 'CASH' && (
              <div className="mt-5"><input type="number" min={0} value={earlyFeeCashReceived} onChange={(event) => setEarlyFeeCashReceived(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-lg font-black focus:outline-none" /></div>
            )}
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setEarlyFeeBooking(null)} className="px-6 py-2 text-sm font-bold text-gray-400">Hủy</button>
              <button type="button" onClick={confirmEarlyCheckinFee} className="rounded-xl bg-sky-600 px-8 py-2 text-sm font-bold text-white hover:bg-sky-700">Xác nhận thu phí</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckInPage;
