import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, ShoppingCart } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { bookingApi, paymentApi } from '../../../services/api';
import type { PaymentType } from '../../../services/api';
import Alert from '../../../shared/components/ui/Alert';
import { calculateStayPricing, CHECK_IN_TIME_LABEL, CHECK_OUT_TIME_LABEL } from '../../../shared/lib/bookingPricing';
import { normalizeDateInputValue } from '../../../shared/lib/date';
import { userApi } from '../../../services/api';

const emptyGuest = { fullName: '', dateOfBirth: '', phone: '', email: '' };

const getAge = (dob: string) => {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

export default function BookingInfoPage() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, checkIn, checkOut, clearCart } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('DEPOSIT');
  const [paymentProvider, setPaymentProvider] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [ratePlan] = useState<'FLEXIBLE' | 'NON_REFUNDABLE'>('FLEXIBLE');
  const [isSelfCheckIn] = useState(true);
  const [notes, setNotes] = useState('');

  const [primaryGuest, setPrimaryGuest] = useState({
    fullName: user?.fullName || user?.name || '',
    dateOfBirth: normalizeDateInputValue(user?.dateOfBirth),
    phone: user?.phoneNumber || user?.phone || '',
    email: user?.email || '',
  });

  const [additionalGuests, setAdditionalGuests] = useState<Array<{ fullName: string; dateOfBirth: string; phone: string; email: string }>>([]);
  const [guestCount, setGuestCount] = useState(1);

  const totalRoomCapacity = useMemo(
    () => cartItems.reduce(
      (sum, item) => sum + Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 0),
      0
    ),
    [cartItems]
  );
  const maxGuestsAllowed = Math.max(1, totalRoomCapacity);

  // Sync additional guests list based on guestCount
  useEffect(() => {
    const companionCount = Math.max(0, guestCount - 1);
    setAdditionalGuests(prev => {
      const next = prev.slice(0, companionCount);
      while (next.length < companionCount) next.push({ ...emptyGuest });
      return next;
    });
  }, [guestCount]);

  useEffect(() => {
    setGuestCount(prev => Math.min(Math.max(1, prev), maxGuestsAllowed));
  }, [maxGuestsAllowed]);

  // Sync primary guest info when auth loads
  useEffect(() => {
    if (user && isSelfCheckIn) {
      setPrimaryGuest(prev => ({
        ...prev,
        fullName: user.fullName || user.name || prev.fullName,
        phone: user.phoneNumber || user.phone || prev.phone,
        email: user.email || prev.email,
        dateOfBirth: normalizeDateInputValue(user.dateOfBirth) || prev.dateOfBirth,
      }));
    }
  }, [user, isSelfCheckIn]);

  useEffect(() => {
    if (!user || !isSelfCheckIn) return;
    if (user.dateOfBirth) return;

    let cancelled = false;

    const syncProfile = async () => {
      try {
        const response = await userApi.getMe();
        if (cancelled) return;

        const profileDob = normalizeDateInputValue(response.data.dateOfBirth);
        if (!profileDob) return;

        setPrimaryGuest((prev) => ({
          ...prev,
          dateOfBirth: prev.dateOfBirth || profileDob,
        }));
      } catch {
        // Keep the current form state if the profile endpoint is temporarily unavailable.
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [user, isSelfCheckIn]);

  const orderSummary = useMemo(() => {
    if (!checkIn || !checkOut || cartItems.length === 0) return null;
    const summary = calculateStayPricing(cartItems.map((item) => item.room), checkIn, checkOut, ratePlan);
    if (!summary) return null;

    return {
      ...summary,
      items: summary.rooms.map((roomSummary, index) => ({
        ...cartItems[index],
        total: roomSummary.totalBeforeHoliday,
        nightlyDetails: roomSummary.nightlyDetails,
      })),
    };
  }, [cartItems, checkIn, checkOut, ratePlan]);

  const payableAmount = useMemo(() => {
    if (!orderSummary) return 0;
    if (ratePlan === 'NON_REFUNDABLE' || paymentType === 'FULL') return orderSummary.finalTotal;
    return orderSummary.depositAmount;
  }, [orderSummary, ratePlan, paymentType]);

  const handleCreateBooking = async () => {
    if (!orderSummary || !user) return;
    setError('');

    // Validation
    if (!primaryGuest.fullName.trim() || !primaryGuest.phone) {
      setError('Vui lòng nhập đầy đủ thông tin người đại diện.');
      return;
    }
    if (primaryGuest.dateOfBirth && getAge(primaryGuest.dateOfBirth) < 18) {
      setError('Người đại diện nhận phòng phải từ 18 tuổi trở lên.');
      return;
    }
    if (guestCount > maxGuestsAllowed) {
      setError(`Tổng số khách tối đa cho ${cartItems.length} phòng này là ${maxGuestsAllowed}.`);
      return;
    }

    setSubmitting(true);
    try {
      const roomCount = Math.max(1, cartItems.length);
      const assignedRoomId = (index: number) => Number(cartItems[index % roomCount]?.room.id);
      const totalRoomCapacity = cartItems.reduce(
        (sum, item) => sum + Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 0),
        0
      );
      const payload = {
        userId: Number(user.id),
        checkIn,
        checkOut,
        paymentType,
        ratePlan,
        source: 'WEB' as const,
        notes,
        guestCount,
        roomCapacitySnapshot: totalRoomCapacity,
        rooms: orderSummary.items.map(it => ({
          roomId: Number(it.room.id),
          roomTypeId: Number(it.room.roomType.id),
          priceSnapshot: it.room.roomType.basePrice
        })),
        primaryGuest: { ...primaryGuest, roomId: assignedRoomId(0), primary: true, checkInPerson: true },
        guests: [
          { ...primaryGuest, roomId: assignedRoomId(0), primary: true, checkInPerson: true },
          ...additionalGuests
            .filter(g => g.fullName.trim())
            .map((g, index) => ({ ...g, roomId: assignedRoomId(index + 1), primary: false }))
        ]
      };

      const booking = await bookingApi.create(payload as any);
      const bookingTotal = Number((booking as any).totalPrice || (booking as any).finalTotal || orderSummary.finalTotal);
      
      // Payment Integration
      const payment = paymentProvider === 'MOMO'
        ? await paymentApi.createMoMo({
            bookingId: Number(booking.id),
            userId: Number(user.id),
            totalAmount: bookingTotal,
            paymentType,
            requestType: 'payWithATM',
          })
        : await paymentApi.createVNPay({
            bookingId: Number(booking.id),
            userId: Number(user.id),
            totalAmount: bookingTotal,
            paymentType,
            locale: 'vn',
          });

      if (payment.paymentUrl) {
        clearCart();
        window.location.href = payment.paymentUrl;
      } else {
        throw new Error('Không nhận được liên kết thanh toán.');
      }
    } catch (e: any) {
      console.error('Booking/payment flow failed:', e);
      const status = e.response?.status;
      const networkMessage = e.code === 'ECONNABORTED'
        ? 'Kết nối booking/thanh toán quá chậm hoặc service chưa sẵn sàng. Vui lòng thử lại sau vài giây.'
        : e.code === 'ERR_NETWORK'
          ? 'Không kết nối được server booking/thanh toán. Kiểm tra lại Docker service và địa chỉ frontend đang mở.'
          : '';
      if (status === 409) {
        const roomLabels = cartItems
          .map((item) => item.room?.roomNumber || item.room?.name || item.room?.id)
          .filter(Boolean)
          .join(', ');

        setError(
          e.response?.data?.message
            || `Các phòng ${roomLabels || 'đã chọn'} đã được đặt hoặc đang được giữ chỗ. Vui lòng bỏ các phòng này khỏi giỏ hàng hoặc chọn ngày lưu trú khác.`
        );
        return;
      }

      setError(e.response?.data?.message || networkMessage || e.message || 'Đặt phòng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (cartItems.length === 0) return <Navigate to="/rooms" replace />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12">
      <div className="container-custom mx-auto max-w-7xl px-4">
        
        <div className="flex items-center justify-between mb-10">
           <Link to="/booking/cart" className="flex items-center gap-2 text-sm font-black text-[#888] hover:text-[#111] uppercase tracking-widest">
             <ArrowLeft size={16} /> Quay lại giỏ hàng
           </Link>
           <div className="flex items-center gap-2 text-xs font-black bg-white px-4 py-2 rounded-full shadow-sm border border-black/5 text-green-600">
             <ShieldCheck size={14} /> KẾT NỐI BẢO MẬT SSL
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Form */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-black/5">
                <h1 className="text-4xl font-black tracking-tight text-[#111] mb-2 uppercase">Thông tin lưu trú</h1>
                <p className="text-[#888] font-medium mb-10">Vui lòng điền thông tin chính xác để quá trình check-in diễn ra thuận lợi.</p>

                <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
                  Nhận phòng từ {CHECK_IN_TIME_LABEL}, trả phòng trước {CHECK_OUT_TIME_LABEL}. Nếu kỳ lưu trú có cuối tuần, giá đêm tăng 20%; nếu chạm lễ/tết, tổng tiền tăng 30%.
                </div>

                {error && <Alert variant="error" className="mb-8 rounded-2xl font-bold">{error}</Alert>}

                <div className="space-y-12">
                  
                  {/* Primary Guest Info */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-[#0f0f0f] text-[#d4af37] flex items-center justify-center font-black">1</div>
                       <h2 className="text-xl font-black text-[#111] uppercase">Người đại diện nhận phòng</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#aaa] uppercase tracking-widest ml-4">Họ tên đầy đủ</label>
                        <input className="w-full bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] transition-all" 
                          placeholder="Nguyễn Văn A" value={primaryGuest.fullName} onChange={e => setPrimaryGuest({...primaryGuest, fullName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#aaa] uppercase tracking-widest ml-4">Số điện thoại</label>
                        <input className="w-full bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] transition-all" 
                          placeholder="09xx xxx xxx" value={primaryGuest.phone} onChange={e => setPrimaryGuest({...primaryGuest, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#aaa] uppercase tracking-widest ml-4">Ngày sinh</label>
                        <input type="date" className="w-full bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] transition-all" 
                          value={primaryGuest.dateOfBirth} onChange={e => setPrimaryGuest({...primaryGuest, dateOfBirth: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#aaa] uppercase tracking-widest ml-4">Email nhận voucher</label>
                        <input className="w-full bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] transition-all" 
                          placeholder="email@domain.com" value={primaryGuest.email} onChange={e => setPrimaryGuest({...primaryGuest, email: e.target.value})} />
                      </div>
                    </div>
                  </section>

                  {/* Special Requests */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-[#0f0f0f] text-[#d4af37] flex items-center justify-center font-black">3</div>
                       <h2 className="text-xl font-black text-[#111] uppercase">Yêu cầu đặc biệt</h2>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#aaa] uppercase tracking-widest ml-4">Ghi chú cho khách sạn</label>
                      <textarea
                        rows={4}
                        className="w-full bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] transition-all"
                        placeholder="Ví dụ: cần phòng gần nhau, check-in muộn, nôi em bé..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>
                  </section>

                  {/* Guest Count & Companions */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-[#0f0f0f] text-[#d4af37] flex items-center justify-center font-black">2</div>
                       <h2 className="text-xl font-black text-[#111] uppercase">Thành viên đi cùng</h2>
                    </div>
                    
                    <div className="bg-[#f9f9f9] rounded-3xl p-8 border border-black/5">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                           <div className="text-sm font-black text-[#333]">Tổng số khách lưu trú</div>
                           <div className="text-xs font-bold text-[#888]">Bao gồm cả người đại diện</div>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-black/5">
                           <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-10 h-10 rounded-xl bg-[#f4f4f4] font-black text-lg hover:bg-[#d4af37] transition-all">-</button>
                           <span className="w-6 text-center font-black text-lg">{guestCount}</span>
                           <button onClick={() => setGuestCount(Math.min(maxGuestsAllowed, guestCount + 1))} disabled={guestCount >= maxGuestsAllowed} className="w-10 h-10 rounded-xl bg-[#f4f4f4] font-black text-lg hover:bg-[#d4af37] transition-all disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                        </div>
                      </div>
                      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
                        Tổng sức chứa của {cartItems.length} phòng là {maxGuestsAllowed} khách. Số khách bạn nhập không được vượt quá mức này.
                      </div>

                      {additionalGuests.length > 0 && (
                        <div className="space-y-4">
                           {additionalGuests.map((g, i) => (
                             <div key={i} className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-2xl border border-black/5 shadow-sm">
                               <div className="flex-1">
                                 <input className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none placeholder:text-[#ccc]" 
                                   placeholder={`Tên khách đồng hành ${i+2}`} value={g.fullName} onChange={e => setAdditionalGuests(prev => prev.map((it, idx) => idx === i ? {...it, fullName: e.target.value} : it))}/>
                               </div>
                               <div className="w-px bg-black/5 hidden md:block" />
                               <div className="w-full md:w-40">
                                  <input type="date" className="w-full bg-transparent border-none p-0 text-xs font-bold outline-none text-[#555]" 
                                    value={g.dateOfBirth} onChange={e => setAdditionalGuests(prev => prev.map((it, idx) => idx === i ? {...it, dateOfBirth: e.target.value} : it))}/>
                               </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Payment Methods */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-[#0f0f0f] text-[#d4af37] flex items-center justify-center font-black">3</div>
                       <h2 className="text-xl font-black text-[#111] uppercase">Phương thức thanh toán</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <button onClick={() => setPaymentProvider('VNPAY')} className={`p-6 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${paymentProvider === 'VNPAY' ? 'border-[#d4af37] bg-[#fffbf0]' : 'border-black/5 bg-white hover:border-[#eee]'}`}>
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2"><img src="https://vnpay.vn/wp-content/uploads/2020/07/vnpay-qr.png" /></div>
                         <div>
                            <div className="font-black text-[#111]">VNPAY</div>
                            <div className="text-xs font-bold text-[#888]">Banking, QR Code, VISA/MasterCard</div>
                         </div>
                       </button>
                       <button onClick={() => setPaymentProvider('MOMO')} className={`p-6 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${paymentProvider === 'MOMO' ? 'border-pink-500 bg-pink-50' : 'border-black/5 bg-white hover:border-[#eee]'}`}>
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2"><img src="https://static.mservice.io/img/logo-momo.png" /></div>
                         <div>
                            <div className="font-black text-[#111]">Ví MoMo</div>
                            <div className="text-xs font-bold text-[#888]">Xác nhận nhanh chóng qua Ví MoMo</div>
                         </div>
                       </button>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 space-y-6">
              
              {/* Order Card */}
              <div className="bg-[#0f0f0f] text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><ShoppingCart size={80} /></div>
                
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                   ĐƠN ĐẶT CỦA BẠN <CheckCircle2 className="text-[#d4af37]" />
                </h2>

                <div className="space-y-6 mb-10">
                   <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                     <div>
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Giai đoạn lưu trú</div>
                        <div className="text-sm font-bold text-[#d4af37]">{checkIn} → {checkOut}</div>
                      <div className="mt-1 text-[10px] font-bold text-white/50">Check-in {CHECK_IN_TIME_LABEL} · Check-out {CHECK_OUT_TIME_LABEL}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Số đêm</div>
                        <div className="text-sm font-bold">{orderSummary?.nights} đêm</div>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <div className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Danh sách phòng ({cartItems.length})</div>
                     <div className="max-h-60 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {orderSummary?.items.map(item => (
                          <div key={item.id} className="flex justify-between items-start">
                             <div>
                                <div className="text-sm font-black text-white uppercase">{item.room.roomType.type}</div>
                                <div className="text-[10px] font-bold text-white/50">Phòng {item.room.roomNumber} · {item.room.viewType}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                             {item.nightlyDetails?.some((night) => night.isWeekend) && <span className="text-[9px] font-black text-indigo-300 uppercase">Weekend +20%</span>}
                             {item.nightlyDetails?.some((night) => night.holidayName) && <span className="text-[9px] font-black text-rose-300 uppercase">Lễ/Tết +30%</span>}
                            </div>
                             </div>
                             <div className="text-sm font-black text-[#d4af37]">{item.total.toLocaleString('vi-VN')}đ</div>
                          </div>
                        ))}
                     </div>
                   </div>

                   <div className="pt-6 border-t border-white/10 space-y-4">
                      <div className="flex justify-between text-sm font-bold text-white/60">
                        <span>Giá gốc ({cartItems.length} phòng)</span>
                        <span>{orderSummary?.baseTotal.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#d4af37]">
                        <span>Ưu đãi gói {ratePlan}</span>
                        <span>{ratePlan === 'NON_REFUNDABLE' ? '-10%' : 'Linh hoạt'}</span>
                      </div>
                      {orderSummary?.isHolidayBooking && (
                        <div className="flex justify-between text-sm font-bold text-rose-400">
                          <span>Phụ phí lễ/tết</span>
                          <span>+30%</span>
                        </div>
                      )}
                      <div className="flex justify-between items-end pt-4 border-t border-white/20">
                         <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Tổng cộng dự kiến</div>
                         <div className="text-3xl font-black text-[#d4af37]">{orderSummary?.finalTotal.toLocaleString('vi-VN')}đ</div>
                      </div>
                      {(orderSummary?.weekendNights || 0) > 0 && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold text-white/70">
                          Có {orderSummary?.weekendNights} đêm cuối tuần (T7, CN), áp dụng phụ phí 20% trên giá đêm.
                        </div>
                      )}
                      {orderSummary?.holidayNames?.length ? (
                        <div className="mt-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-[11px] font-bold text-rose-200">
                          Chạm lễ/tết: {orderSummary.holidayNames.join(', ')}.
                        </div>
                      ) : null}
                   </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 mb-10">
                   <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Lựa chọn thanh toán</div>
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setPaymentType('DEPOSIT')} disabled={ratePlan === 'NON_REFUNDABLE'}
                        className={`py-3 rounded-xl border font-black text-xs transition-all ${paymentType === 'DEPOSIT' ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'border-white/10 text-white/60'}`}>
                        CỌC 50%
                      </button>
                      <button onClick={() => setPaymentType('FULL')}
                        className={`py-3 rounded-xl border font-black text-xs transition-all ${paymentType === 'FULL' ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'border-white/10 text-white/60'}`}>
                        TRẢ 100%
                      </button>
                   </div>
                   <div className="mt-4 text-[10px] font-bold text-center text-white/30 uppercase tracking-widest">
                     Cần trả ngay: {payableAmount.toLocaleString('vi-VN')}đ
                   </div>
                </div>

                <button onClick={handleCreateBooking} disabled={submitting}
                  className="w-full bg-white text-black py-5 rounded-4xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-[#d4af37] transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN & THANH TOÁN'} <ArrowRight size={20} />
                </button>
              </div>

              {/* Security info */}
              <div className="p-6 bg-white rounded-3xl border border-black/5 flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm"><ShieldCheck size={24}/></div>
                 <div>
                    <h4 className="text-sm font-black text-[#111]">Bảo mật thông tin tối đa</h4>
                    <p className="text-[11px] text-[#888] leading-relaxed font-medium">Chúng tôi không lưu trữ thông tin thẻ của bạn. Mọi giao dịch được thực hiện trực tiếp trên hạ tầng của VNPAY/MoMo đạt chuẩn PCI-DSS.</p>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
