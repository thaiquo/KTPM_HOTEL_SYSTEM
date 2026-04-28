import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Users, BedDouble, CheckCircle2, ShieldCheck, CreditCard, Info } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, paymentApi, roomApi, userApi } from '../../../services/api';
import type { PaymentType } from '../../../services/api';
import type { Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

const normalizeDateParam = (value: string | null, fallback: string) => {
  const match = value?.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || fallback;
};

const emptyGuest = {
  fullName: '',
  dateOfBirth: '',
  phone: '',
  email: '',
};

const fixedHolidayKeys = new Set(['01-01', '04-30', '05-01', '09-02']);

const addDaysToDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const overlapsFixedHoliday = (checkIn: string, checkOut: string) => {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  for (let cursor = start; cursor < end; cursor = addDaysToDate(cursor, 1)) {
    const key = `${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (fixedHolidayKeys.has(key)) return true;
  }
  return false;
};

const buildFallbackPricing = (
  checkIn: string,
  checkOut: string,
  pricePerNight: number,
  ratePlan: 'FLEXIBLE' | 'NON_REFUNDABLE'
) => {
  const nights = differenceInCalendarDays(new Date(`${checkOut}T00:00:00`), new Date(`${checkIn}T00:00:00`));
  const holidayBooking = overlapsFixedHoliday(checkIn, checkOut);
  const priceMultiplier = holidayBooking ? 1.3 : 1;
  const discountPercent = ratePlan === 'NON_REFUNDABLE' ? 10 : 0;
  const depositPercent = ratePlan === 'NON_REFUNDABLE' ? 100 : 50;
  const baseTotal = nights * pricePerNight;
  const finalTotal = baseTotal * priceMultiplier * (1 - discountPercent / 100);

  return {
    nights,
    holidayBooking,
    appliedRule: holidayBooking ? 'HOLIDAY' : 'NORMAL',
    pricePerNight,
    baseTotal,
    priceMultiplier,
    finalTotal,
    depositPercent,
    depositAmount: finalTotal * depositPercent / 100,
    freeCancelBeforeHours: ratePlan === 'NON_REFUNDABLE' ? 0 : holidayBooking ? 72 : 24,
    ratePlan,
    discountPercent,
    refundable: ratePlan !== 'NON_REFUNDABLE',
    paymentType: ratePlan === 'NON_REFUNDABLE' ? 'FULL' : 'DEPOSIT',
  };
};

export default function BookingInfoPage() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get('roomId') || '';
  const initialCheckIn = normalizeDateParam(searchParams.get('checkIn'), format(new Date(), 'yyyy-MM-dd'));
  const initialCheckOut = normalizeDateParam(searchParams.get('checkOut'), format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const [room, setRoom] = useState<Room | null>(null);
  const [fetchingRoom, setFetchingRoom] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('DEPOSIT');
  const [ratePlan, setRatePlan] = useState<'FLEXIBLE' | 'NON_REFUNDABLE'>('FLEXIBLE');
  const [isSelfCheckIn, setIsSelfCheckIn] = useState(true);
  const [primaryGuest, setPrimaryGuest] = useState({
    fullName: user?.name || '',
    dateOfBirth: user?.dateOfBirth || '',
    phone: user?.phone || '',
    email: '',
  });
  const [additionalGuests, setAdditionalGuests] = useState<Array<{ fullName: string; dateOfBirth: string; phone: string; email: string }>>([]);

  const [form, setForm] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    guests: 2,
    rooms: 1,
  });

  const [pricing, setPricing] = useState<any>(null);
  const [fetchingPricing, setFetchingPricing] = useState(false);
  const [pricingWarning, setPricingWarning] = useState('');

  useEffect(() => {
    const companionCount = Math.max(0, Number(form.guests || 1) - 1);
    setAdditionalGuests((current) => {
      const next = current.slice(0, companionCount);
      while (next.length < companionCount) {
        next.push({ ...emptyGuest });
      }
      return next;
    });
  }, [form.guests]);

  useEffect(() => {
    if (!user || !isSelfCheckIn) return;
    let mounted = true;
    userApi.getMe()
      .then((res) => {
        if (!mounted) return;
        setPrimaryGuest({
          fullName: res.data.fullName || user.name || '',
          dateOfBirth: res.data.dateOfBirth || '',
          phone: res.data.phone || res.data.phoneNumber || user.phone || '',
          email: '',
        });
      })
      .catch(() => {
        if (!mounted) return;
        setPrimaryGuest({
          fullName: user.name || '',
          dateOfBirth: user.dateOfBirth || '',
          phone: user.phone || '',
          email: '',
        });
      });
    return () => { mounted = false; };
  }, [user, isSelfCheckIn]);

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) {
        setRoom(null);
        setFetchingRoom(false);
        return;
      }

      setFetchingRoom(true);
      try {
        const data = await roomApi.getById(roomId);
        setRoom(data);
      } catch (e) {
        console.error(e);
        setRoom(null);
      } finally {
        setFetchingRoom(false);
      }
    };

    loadRoom();
  }, [roomId]);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!room || !form.checkIn || !form.checkOut) return;
      
      const n = differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn));
      if (n <= 0) {
        setPricing(null);
        return;
      }

      const fallbackPricing = buildFallbackPricing(form.checkIn, form.checkOut, room.price, ratePlan);
      setPricing(fallbackPricing);
      setFetchingPricing(true);
      setPricingWarning('');
      try {
        const data = await bookingApi.getPricing({
          checkInDate: form.checkIn,
          checkOutDate: form.checkOut,
          pricePerNight: room.price,
          ratePlan
        });
        if (!data?.nights || !data?.finalTotal) {
          throw new Error('Invalid pricing response');
        }
        setPricing(data);
      } catch (e) {
        console.error(e);
        setPricing(fallbackPricing);
        setPricingWarning('Đang dùng giá tạm tính. Hệ thống sẽ xác nhận lại khi tạo booking.');
      } finally {
        setFetchingPricing(false);
      }
    };

    fetchPricing();
  }, [room, form.checkIn, form.checkOut, ratePlan]);

  const nights = useMemo(() => {
    return pricing?.nights || 0;
  }, [pricing]);

  const total = useMemo(() => {
    return (pricing?.finalTotal || 0) * (form.rooms || 1);
  }, [pricing, form.rooms]);

  const payableAmount = useMemo(() => {
    if (ratePlan === 'NON_REFUNDABLE') return total;
    if (paymentType === 'DEPOSIT') return (pricing?.depositAmount || 0) * (form.rooms || 1);
    return total;
  }, [paymentType, pricing, total, form.rooms, ratePlan]);

  useEffect(() => {
    setPaymentType(ratePlan === 'NON_REFUNDABLE' ? 'FULL' : 'DEPOSIT');
  }, [ratePlan]);

  const handleSelfCheckInChange = (checked: boolean) => {
    setIsSelfCheckIn(checked);
    if (!checked) {
      setPrimaryGuest({ ...emptyGuest });
      return;
    }
    setPrimaryGuest({
      fullName: user?.name || '',
      dateOfBirth: user?.dateOfBirth || '',
      phone: user?.phone || '',
      email: '',
    });
  };

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const canSubmit = !!room && !!pricing && nights > 0 && total > 0 && !submitting;
  const money = (value: number) => `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;
  const baseTotal = (pricing?.baseTotal || 0) * (form.rooms || 1);
  const holidaySurcharge = Math.max(0, ((pricing?.baseTotal || 0) * ((pricing?.priceMultiplier || 1) - 1)) * (form.rooms || 1));
  const discountAmount = Math.max(0, baseTotal + holidaySurcharge - total);
  const paymentLabel = paymentType === 'FULL' ? 'Thanh toán toàn bộ' : `Đặt cọc ${pricing?.depositPercent || 50}%`;

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age;
  };

  const handleCreateBooking = async () => {
    if (!canSubmit || !room) return;
    setError('');
    if (!primaryGuest.fullName.trim() || !primaryGuest.phone.trim() || !primaryGuest.dateOfBirth) {
      setError('Người nhận phòng phải từ 18 tuổi trở lên và có số điện thoại liên hệ.');
      return;
    }
    if (calculateAge(primaryGuest.dateOfBirth) < 18) {
      setError('Người nhận phòng phải từ 18 tuổi trở lên.');
      return;
    }
    if (form.guests > room.maxGuests * form.rooms) {
      setError('Số khách vượt quá sức chứa của phòng.');
      return;
    }
    setSubmitting(true);

    try {
      const roomIdNum = Number(room.id);
      const userIdNum = Number(user.id);
      const companionGuests = additionalGuests
        .filter((guest) => guest.fullName.trim())
        .map((guest) => ({
          ...guest,
          dateOfBirth: guest.dateOfBirth || undefined,
          primary: false,
          checkInPerson: false,
        }));

      const booking = await bookingApi.create({ 
        roomId: roomIdNum, 
        userId: userIdNum, 
        checkIn: form.checkIn, 
        checkOut: form.checkOut,
        pricePerNight: room.price,
        paymentType,
        ratePlan,
        guestCount: form.guests,
        roomCapacitySnapshot: room.maxGuests * form.rooms,
        primaryGuest: {
          ...primaryGuest,
          primary: true,
          checkInPerson: true,
        },
        guests: [{
          ...primaryGuest,
          primary: true,
          checkInPerson: true,
        }, ...companionGuests],
      });
      
      const bookingId = Number(booking.id);

      const payment = await paymentApi.createVNPay({
        bookingId,
        userId: userIdNum,
        totalAmount: total,
        paymentType,
        bankCode: 'NCB',
        locale: 'vn',
      });

      if (!payment.paymentUrl) {
        throw new Error('Payment service không trả về URL thanh toán VNPAY.');
      }

      window.location.href = payment.paymentUrl;
    } catch (e: any) {
      console.error(e);
      const serverMessage = typeof e.response?.data === 'string'
        ? e.response.data
        : e.response?.data?.message;
      const rawMessage = `${serverMessage || e.message || ''}`;
      const isBookingServiceDown = e.code === 'ERR_NETWORK'
        || rawMessage.includes('Network Error')
        || rawMessage.includes('proxy')
        || rawMessage.includes('ECONNREFUSED')
        || rawMessage.includes('Booking service không trả về');
      setError(isBookingServiceDown
        ? 'Không kết nối được Booking service ở cổng 8084. Vui lòng bật HotelSystem_BOOKING rồi thử lại.'
        : rawMessage || 'Đặt phòng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between gap-4"
        >
          <Link
            to={room ? `/rooms/${room.id}` : '/rooms'}
            className="group inline-flex items-center gap-2 text-primary-fixed-dim hover:text-primary font-bold transition-all"
          >
            <div className="w-8 h-8 rounded-full border border-primary-fixed-dim/30 flex items-center justify-center group-hover:border-primary transition-all">
               <ArrowLeft size={16} />
            </div>
            Quay lại chi tiết phòng
          </Link>
          <Link
            to="/my-bookings"
            className="text-sm font-bold text-on-surface-variant hover:text-on-surface underline underline-offset-4 decoration-outline-variant/30 transition-all"
          >
            Quản lý phòng đã đặt
          </Link>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Main Content */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-8 sm:p-10 border-outline-variant/10 shadow-xl overflow-visible">
                <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label">Reservation Details</div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface font-headline leading-tight">Hoàn tất đặt phòng</h1>
                <p className="text-on-surface-variant mt-2 font-medium flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary-fixed-dim" />
                  Thanh toán online an toàn qua VNPAY (Sandbox).
                </p>

                {error && (
                  <Alert variant="error" className="mt-6 border-none bg-error/5 text-error font-bold">{error}</Alert>
                )}

                <div className="mt-10">
                  {fetchingRoom ? (
                    <div className="py-20 text-center">
                      <Spinner className="h-12 w-12" />
                      <p className="mt-4 text-on-surface-variant font-medium">Đang tải thông tin phòng...</p>
                    </div>
                  ) : !room ? (
                    <div className="py-20 text-center">
                      <div className="mx-auto w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-6">
                         <Info size={32} />
                      </div>
                      <p className="text-on-surface text-xl font-bold font-headline">Không tìm thấy thông tin phòng</p>
                      <p className="text-on-surface-variant mt-2 mb-8">Có vẻ như phòng này không còn khả dụng hoặc ID không chính xác.</p>
                      <Link to="/rooms">
                        <Button className="px-8 py-3 rounded-xl font-bold">Quay lại danh sách phòng</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Room Summary Header */}
                      <div className="flex flex-col md:flex-row gap-8 items-start p-6 rounded-3xl bg-surface-container-low border border-outline-variant/5">
                        <div className="w-full md:w-56 h-40 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                          <img src={room.images?.[0]} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <div className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] tracking-widest font-black uppercase inline-block">
                                     {room.type}
                                 </div>
                                 {pricing?.holidayBooking && (
                                   <div className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] tracking-widest font-black uppercase inline-block animate-pulse">
                                       Dịp Lễ / Tết
                                   </div>
                                 )}
                               </div>
                               <h2 className="text-2xl font-black tracking-tight text-on-surface font-headline">{room.name}</h2>
                            </div>
                            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                               <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Giá mỗi đêm</span>
                               <span className="text-lg font-black text-primary leading-none">{room.price.toLocaleString('vi-VN')}₫</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Form Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                        <div className="group">
                          <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-black font-label">
                            <Calendar size={14} className="text-primary-fixed-dim" />
                            Ngày nhận phòng
                          </label>
                          <input
                            type="date"
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                            value={form.checkIn}
                            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                          />
                        </div>

                        <div className="group">
                          <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-black font-label">
                            <Calendar size={14} className="text-primary-fixed-dim" />
                            Ngày trả phòng
                          </label>
                          <input
                            type="date"
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                            min={form.checkIn}
                            value={form.checkOut}
                            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                          />
                        </div>

                        <div className="group">
                          <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-black font-label">
                            <Users size={14} className="text-primary-fixed-dim" />
                            Số lượng khách
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                            value={form.guests}
                            onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                          />
                        </div>

                        <div className="group">
                          <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-black font-label">
                            <BedDouble size={14} className="text-primary-fixed-dim" />
                            Số lượng phòng
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                            value={form.rooms}
                            onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="pt-8 border-t border-outline-variant/10">
                        <div className="text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-black font-label">
                          Gói giá
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setRatePlan('FLEXIBLE')}
                            className={`rounded-2xl border p-5 text-left transition ${ratePlan === 'FLEXIBLE' ? 'border-primary bg-primary/10' : 'border-outline-variant/15 bg-surface-container-low'}`}
                          >
                            <div className="font-black text-on-surface">Linh hoạt</div>
                            <p className="mt-1 text-xs font-medium text-on-surface-variant">Thanh toán cọc, hủy miễn phí trước 24h.</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRatePlan('NON_REFUNDABLE')}
                            className={`rounded-2xl border p-5 text-left transition ${ratePlan === 'NON_REFUNDABLE' ? 'border-primary bg-primary/10' : 'border-outline-variant/15 bg-surface-container-low'}`}
                          >
                            <div className="font-black text-on-surface">Không hoàn tiền</div>
                            <p className="mt-1 text-xs font-medium text-on-surface-variant">Giá rẻ hơn 10%, thanh toán toàn bộ.</p>
                          </button>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex-1">
                           <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                              <CheckCircle2 size={24} />
                           </div>
                           <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                              Chính sách hủy phòng: <strong>Miễn phí hủy bỏ trước {pricing?.freeCancelBeforeHours} giờ</strong> ({pricing?.appliedRule === 'HOLIDAY' ? 'Gói Ngày lễ' : 'Gói Ngày thường'}).
                           </p>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-secondary/10 flex-1">
                           <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                              <CreditCard size={24} />
                           </div>
                           <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                              Đảm bảo giá tốt nhất: <strong>{pricing?.appliedRule === 'HOLIDAY' ? 'Nhân hệ số 1.3x dịp lễ' : 'Giá gốc tiết kiệm'}</strong>. Yêu cầu cọc {pricing?.depositPercent}% ({pricing?.appliedRule === 'HOLIDAY' ? 'Holiday Rule' : 'Standard'}).
                           </p>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-outline-variant/10">
                        <label className="flex items-center gap-3 rounded-2xl border border-outline-variant/15 bg-surface-container-highest/40 px-5 py-4 font-bold text-on-surface">
                          <input
                            type="checkbox"
                            checked={isSelfCheckIn}
                            onChange={(e) => handleSelfCheckInChange(e.target.checked)}
                            className="h-5 w-5 accent-primary"
                          />
                          Tôi là người nhận phòng
                        </label>
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 font-bold"
                            placeholder="Họ tên người nhận phòng"
                            value={primaryGuest.fullName}
                            onChange={(e) => setPrimaryGuest({ ...primaryGuest, fullName: e.target.value })}
                          />
                          <input
                            type="date"
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 font-bold"
                            value={primaryGuest.dateOfBirth}
                            onChange={(e) => setPrimaryGuest({ ...primaryGuest, dateOfBirth: e.target.value })}
                          />
                          <input
                            className="w-full px-5 py-4 rounded-2xl bg-surface-container-highest/50 text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 font-bold"
                            placeholder="Số điện thoại liên hệ"
                            value={primaryGuest.phone}
                            onChange={(e) => setPrimaryGuest({ ...primaryGuest, phone: e.target.value })}
                          />
                        </div>
                        <p className="mt-3 text-xs font-medium text-on-surface-variant">
                          CCCD/hộ chiếu không bắt buộc khi đặt phòng. Bạn có thể hoàn tất thông tin CCCD/hộ chiếu trước để check-in nhanh hơn.
                        </p>

                        {additionalGuests.length > 0 && (
                          <div className="mt-6 space-y-4">
                            <div className="text-[10px] tracking-[0.2em] uppercase text-on-surface-variant font-black font-label">
                              Khách lưu trú đi cùng
                            </div>
                            {additionalGuests.map((guest, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-surface-container-low p-4">
                                <input
                                  className="w-full px-4 py-3 rounded-xl bg-white text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 font-bold"
                                  placeholder={`Họ tên khách ${index + 2}`}
                                  value={guest.fullName}
                                  onChange={(e) => setAdditionalGuests((current) => current.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))}
                                />
                                <input
                                  type="date"
                                  className="w-full px-4 py-3 rounded-xl bg-white text-on-surface outline-none border border-outline-variant/15 focus:border-primary/40 font-bold"
                                  value={guest.dateOfBirth}
                                  onChange={(e) => setAdditionalGuests((current) => current.map((item, i) => i === index ? { ...item, dateOfBirth: e.target.value } : item))}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right: Summary Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 }}
            >
              <Card className="p-7 border border-black/10 bg-white text-[#111] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(420px_260px_at_95%_0%,rgba(212,175,55,0.12),transparent_70%)]" />
                
                <h2 className="text-2xl font-black tracking-tight font-headline relative">Tóm tắt đơn đặt</h2>
                
                <div className="mt-7 space-y-4 relative">
                  <div className="flex items-center justify-between py-2 border-b border-black/10">
                    <span className="text-[#777] font-bold text-sm tracking-wide">Số đêm lưu trú</span>
                    <span className="font-black text-lg">{nights} đêm</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-black/10">
                    <span className="text-[#777] font-bold text-sm tracking-wide">Số lượng phòng</span>
                    <span className="font-black text-lg">{form.rooms}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-black/10">
                    <span className="text-[#777] font-bold text-sm tracking-wide">Gói giá</span>
                    <span className="font-bold text-sm text-right">{ratePlan === 'NON_REFUNDABLE' ? 'Không hoàn tiền' : 'Linh hoạt'} · {pricing?.appliedRule === 'HOLIDAY' ? 'Ngày lễ' : 'Ngày thường'}</span>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-[#fffbf0] border border-[#d4af37]/20 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#777] font-bold">Giá phòng gốc</span>
                      <span className="font-bold">{money(baseTotal)}</span>
                    </div>
                    {holidaySurcharge > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#b45309] font-bold">Phụ thu lễ/Tết x{pricing?.priceMultiplier}</span>
                        <span className="font-bold text-[#b45309]">+{money(holidaySurcharge)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-700 font-bold">Giảm giá gói {pricing?.discountPercent}%</span>
                        <span className="font-bold text-green-700">-{money(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-[#d4af37]/20 pt-3 text-sm">
                      <span className="text-[#555] font-bold">Tổng tiền phòng</span>
                      <span className="font-black">{money(total)}</span>
                    </div>
                  </div>
                  
                  <div className="py-2 border-b border-black/10">
                    <span className="text-[#777] font-bold text-sm tracking-wide">Thanh toán</span>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentType('DEPOSIT')}
                        disabled={ratePlan === 'NON_REFUNDABLE'}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          paymentType === 'DEPOSIT'
                            ? 'border-[#d4af37] bg-[#fffbf0] text-[#111]'
                            : 'border-black/10 bg-white text-[#777] hover:bg-[#fafafa]'
                        }`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider">Coc {pricing?.depositPercent}%</div>
                        <div className="mt-1 text-sm font-black">{money((pricing?.depositAmount || 0) * (form.rooms || 1))}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('FULL')}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          paymentType === 'FULL'
                            ? 'border-[#d4af37] bg-[#fffbf0] text-[#111]'
                            : 'border-black/10 bg-white text-[#777] hover:bg-[#fafafa]'
                        }`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider">Trả 100%</div>
                        <div className="mt-1 text-sm font-black">{money(total)}</div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 mt-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-[#777] font-bold tracking-wide">Tổng chi phí đặt phòng</span>
                      <span className="font-black">{money(total)}</span>
                    </div>
                    <div className="mb-4 flex items-center justify-between text-sm">
                      <span className="text-[#777] font-bold tracking-wide">{paymentLabel}</span>
                      <span className="font-black text-primary">{money(payableAmount)}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-[#111] font-bold text-lg tracking-wide uppercase">Thanh toán ngay</span>
                      <div className="text-right">
                         <div className="text-3xl font-black tracking-tighter text-primary">
                           {money(payableAmount)}
                         </div>
                         <div className="text-[10px] text-[#999] font-bold mt-1 uppercase tracking-widest">Số tiền gửi sang VNPAY</div>
                      </div>
                    </div>
                    {fetchingPricing && <p className="mt-3 text-xs font-bold text-[#888]">Đang cập nhật giá...</p>}
                    {pricingWarning && <p className="mt-3 text-xs font-bold text-[#b45309]">{pricingWarning}</p>}
                  </div>
                </div>

                <div className="mt-10 relative">
                  <Button
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={!canSubmit}
                    loading={submitting}
                    className="w-full py-4 rounded-2xl bg-[#0f0f0f] text-[#d4af37] font-black tracking-[0.1em] text-sm uppercase shadow-xl shadow-black/20 transition-all hover:bg-[#d4af37] hover:text-black active:scale-95"
                  >
                    {submitting ? 'Đang xử lý...' : 'Xác nhận đặt phòng'}
                  </Button>
                  
                  <p className="mt-5 text-[11px] text-[#999] text-center italic font-medium">
                    Bằng việc nhấn "Xác nhận", bạn đồng ý với mọi Điều khoản đặt phòng của S-T-T Hotel.
                  </p>
                </div>
              </Card>
              
              <div className="mt-6 p-6 rounded-3xl bg-surface-container-high border border-outline-variant/10 flex items-start gap-4 shadow-sm">
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <ShieldCheck size={20} />
                 </div>
                 <div>
                    <h4 className="font-black text-sm text-on-surface">Book with confidence</h4>
                    <p className="text-xs text-on-surface-variant mt-1 font-medium leading-relaxed">
                       Thông tin của bạn được mã hóa và bảo vệ bởi hệ thống bảo mật SSL 256-bit chuẩn quốc tế.
                    </p>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

