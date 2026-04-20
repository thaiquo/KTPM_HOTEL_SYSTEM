import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Users, BedDouble, CheckCircle2, ShieldCheck, CreditCard, Info } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

export default function BookingInfoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get('roomId') || '';
  const initialCheckIn = searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd');
  const initialCheckOut = searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [room, setRoom] = useState<Room | null>(null);
  const [fetchingRoom, setFetchingRoom] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    guests: 2,
    rooms: 1,
  });

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

  const nights = useMemo(() => {
    const n = differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [form.checkIn, form.checkOut]);

  const total = useMemo(() => {
    if (!room) return 0;
    return room.price * nights * (form.rooms || 1);
  }, [room, nights, form.rooms]);

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const canSubmit = !!room && nights > 0 && !submitting;

  const handleCreateBooking = async () => {
    if (!canSubmit || !room) return;
    setError('');
    setSubmitting(true);

    try {
      const roomId = Number(room.id);
      const userId = Number(user.id);

      if (!Number.isFinite(roomId) || !Number.isFinite(userId)) {
        throw new Error('Invalid roomId/userId');
      }

      await bookingApi.create({ roomId, userId, checkIn: form.checkIn, checkOut: form.checkOut });

      navigate('/my-bookings?created=1');
    } catch (e) {
      console.error(e);
      setError('Đặt phòng thất bại. Vui lòng thử lại.');
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
                  Thanh toán an toàn khi nhận phòng (Pay at property).
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
                               <div className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] tracking-widest font-black uppercase inline-block mb-2">
                                  {room.type}
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

                      <div className="pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex-1">
                           <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                              <CheckCircle2 size={24} />
                           </div>
                           <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                              Chính sách hủy phòng linh hoạt: <strong>Miễn phí hủy bỏ trong vòng 1 giờ</strong> đầu tiên sau khi đặt thành công.
                           </p>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-secondary/10 flex-1">
                           <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                              <CreditCard size={24} />
                           </div>
                           <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                              Đảm bảo giá tốt nhất: <strong>Không phí ẩn</strong>, không yêu cầu đặt cọc trước (demo).
                           </p>
                        </div>
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
              <Card className="p-8 border-none bg-inverse-surface text-white shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 [background:radial-gradient(400px_300px_at_80%_80%,rgba(255,106,0,0.15),transparent_65%)]" />
                
                <h2 className="text-2xl font-black tracking-tight font-headline relative">Tóm tắt đơn đặt</h2>
                
                <div className="mt-8 space-y-5 relative">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-bold text-sm tracking-wide">Số đêm lưu trú</span>
                    <span className="font-black text-lg">{nights} đêm</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-bold text-sm tracking-wide">Số lượng phòng</span>
                    <span className="font-black text-lg">{form.rooms}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-bold text-sm tracking-wide">Gói dịch vụ</span>
                    <span className="font-bold text-sm italic">Standard Rate</span>
                  </div>
                  
                  <div className="pt-6 mt-4">
                    <div className="flex items-end justify-between">
                      <span className="text-white font-bold text-lg tracking-wide uppercase">Tổng cộng</span>
                      <div className="text-right">
                         <div className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#ffb694]">
                           {total.toLocaleString('vi-VN')}₫
                         </div>
                         <div className="text-[10px] text-white/40 font-bold mt-1 uppercase tracking-widest">Đã bao gồm thuế & phí</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 relative">
                  <Button
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={!canSubmit}
                    loading={submitting}
                    className="w-full py-4 rounded-2xl font-black tracking-[0.1em] text-sm uppercase shadow-xl shadow-black/20 hover:shadow-primary/20 transition-all active:scale-95"
                  >
                    {submitting ? 'Đang xử lý...' : 'Xác nhận đặt phòng'}
                  </Button>
                  
                  <p className="mt-5 text-[11px] text-white/50 text-center italic font-medium">
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

