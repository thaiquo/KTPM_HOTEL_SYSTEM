import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Hotel, ChevronRight, MapPin, Clock, CreditCard } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, roomApi } from '../../../services/api';
import type { Booking, Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

type BookingWithRoom = Booking & { room?: Room | null };

const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

export default function MyBookingsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<BookingWithRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const created = searchParams.get('created') === '1';

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setFetching(true);
      setError('');
      try {
        const list = await bookingApi.getByUser(user.id);

        const enriched = await Promise.all(
          list.map(async (b) => {
            try {
              const room = await roomApi.getById(b.roomId);
              return { ...b, room };
            } catch {
              return { ...b, room: null };
            }
          })
        );

        setItems(enriched);
      } catch (e) {
        console.error(e);
        setItems([]);
        setError('Không thể tải danh sách booking. Vui lòng thử lại.');
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [user]);

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-background py-16 pb-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div>
            <Link to="/" className="group inline-flex items-center gap-2 text-primary-fixed-dim hover:text-primary font-bold transition-all mb-4">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Về trang chủ
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Phòng đã đặt</h1>
            <p className="text-on-surface-variant mt-2 font-medium">Theo dõi và quản lý các kỳ nghỉ tuyệt vời của bạn.</p>
          </div>
          
          <Link to="/rooms">
            <Button variant="outline" className="rounded-2xl px-6 py-3 font-bold border-outline-variant/30 hover:bg-surface-container-high transition-all">
              Tiếp tục tìm phòng
            </Button>
          </Link>
        </motion.div>

        {created && !error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8"
          >
            <Alert className="border-none bg-green-500/10 text-green-700 font-bold p-5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                 <Hotel size={20} />
              </div>
              <div className="flex-1">
                <div className="text-base">Đặt phòng thành công!</div>
                <div className="text-sm font-medium opacity-80">Booking của bạn đã được ghi nhận vào hệ thống.</div>
              </div>
            </Alert>
          </motion.div>
        )}

        <div className="mt-12">
          {fetching ? (
            <div className="py-20 text-center">
              <Spinner className="h-12 w-12" />
              <div className="mt-4 text-on-surface-variant font-bold tracking-widest uppercase text-xs">Đang truy xuất dữ liệu...</div>
            </div>
          ) : items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center rounded-3xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low"
            >
              <div className="mx-auto w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 mb-6">
                <Hotel size={40} />
              </div>
              <h3 className="text-2xl font-extrabold text-on-surface font-headline leading-tight">
                {error ? 'Không thể tải lịch sử' : 'Chưa có chuyến đi nào'}
              </h3>
              <p className="text-on-surface-variant mt-2 max-w-sm mx-auto font-medium">
                Hãy bắt đầu trải nghiệm dịch vụ đẳng cấp tại S-T-T Hotel ngay hôm nay.
              </p>
              <Link to="/rooms" className="inline-block mt-8">
                <Button className="px-10 py-4 rounded-2xl font-black tracking-widest uppercase text-sm shadow-xl shadow-primary/20">
                  Tìm phòng ngay
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {items.map((b) => {
                const nights = getNights(b.checkIn, b.checkOut);

                return (
                  <motion.div key={b.id} variants={itemVariants}>
                    <Card className="group overflow-hidden border-outline-variant/10 hover:border-primary/30 transition-all duration-500 shadow-lg hover:shadow-2xl">
                      <div className="flex flex-col md:flex-row">
                        {/* Room Image Mini */}
                        <div className="w-full md:w-64 h-48 md:h-auto bg-surface-container-highest shrink-0 relative overflow-hidden">
                           <img 
                             src={b.room?.images?.[0] || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800'} 
                             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                             alt="Room"
                           />
                           <div className="absolute top-4 left-4">
                              <span className={
                                'px-3 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border backdrop-blur-md ' +
                                (b.status === 'confirmed'
                                  ? 'bg-green-500/20 border-green-500/30 text-white'
                                  : 'bg-primary/20 border-primary/30 text-white')
                              }>
                                {b.status}
                              </span>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
                           <div>
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                   <div className="text-[10px] tracking-widest uppercase text-on-surface-variant font-black">Mã đặt phòng #{b.id}</div>
                                   <h2 className="text-2xl font-black tracking-tight text-on-surface font-headline mt-1 group-hover:text-primary transition-colors">
                                     {b.room?.name || `Phòng ${b.roomId}`}
                                   </h2>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-xl font-black text-on-surface font-headline">
                                      {Number(b.totalPrice || 0).toLocaleString('vi-VN')}₫
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Tổng cộng</div>
                                 </div>
                              </div>

                              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrind-0">
                                       <Calendar size={18} />
                                    </div>
                                    <div>
                                       <div className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Thời gian</div>
                                       <div className="text-sm font-bold text-on-surface italic">{b.checkIn}</div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrind-0">
                                       <Clock size={18} />
                                    </div>
                                    <div>
                                       <div className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Thời lượng</div>
                                       <div className="text-sm font-bold text-on-surface italic">{nights} đêm</div>
                                    </div>
                                 </div>
                                 <div className="hidden sm:flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrind-0">
                                       <CreditCard size={18} />
                                    </div>
                                    <div>
                                       <div className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Thanh toán</div>
                                       <div className="text-sm font-bold text-on-surface italic">Lúc nhận phòng</div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-primary-fixed-dim text-sm font-bold">
                                 <MapPin size={16} />
                                 S-T-T Hotel, District 1, HCMC
                              </div>
                              <Link
                                to={`/rooms/${b.roomId}`}
                                className="group/btn inline-flex items-center gap-2 font-black text-xs uppercase tracking-widest text-on-surface hover:text-primary transition-all"
                              >
                                Xem chi tiết phòng
                                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                           </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
           <p className="text-on-surface-variant font-medium text-sm italic">
             Cần hỗ trợ thay đổi lịch trình? Vui lòng liên hệ <span className="text-primary-fixed-dim font-bold not-italic">Hotline: 1900 1234</span>
           </p>
        </motion.div>
      </div>
    </div>
  );
}

