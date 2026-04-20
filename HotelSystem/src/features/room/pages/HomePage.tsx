import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import HeroCarousel from '../components/HeroCarousel';
import RoomCard from '../components/RoomCard';
import Card from '../../../shared/components/ui/Card';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';

import {
  Shield,
  Heart,
  Sparkles,
  Phone,
  Users,
} from 'lucide-react';

const HomePage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const roomList = await roomApi.getAll();
      setRooms(roomList.slice(0, 12));
    } catch (error) {
      console.error(error);
      setRooms([]);
      setError('Không thể tải danh sách phòng nổi bật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const featured = rooms.slice(0, 3);
  const galleryRooms = rooms.slice(0, 9);

  const fallbackImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200';

  return (
    <div className="w-full">
      {/* Hotline pill */}
      <a
        href="tel:0925519789"
        className="fixed left-6 bottom-8 z-40"
        aria-label="Hotline"
      >
        <div className="bg-error text-on-error px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg animate-pulse-glow hover:scale-105 transition-transform">
          <Phone size={16} fill="currentColor" />
          <span className="text-xs font-extrabold tracking-widest uppercase font-label">
            092.5519.789
          </span>
        </div>
      </a>

      {/* HERO */}
      <HeroCarousel />

      <div className="mx-auto max-w-7xl px-6">
        {/* Experience Section */}
        <section className="py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
              Những trải nghiệm lưu trú và làm việc mới tại S-T-T?
            </h2>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-10 w-10" />
            </div>
          ) : error ? (
            <Card className="mt-10 p-8 rounded-2xl text-center">
              <p className="text-on-surface font-semibold">{error}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button onClick={fetchRooms}>Thử lại</Button>
                <Link to="/rooms" className="text-primary-container font-extrabold hover:brightness-110">
                  Xem tất cả phòng
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Main Featured Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -10 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={featured[0]?.images?.[0] || fallbackImage}
                    alt={featured[0]?.name || 'S-T-T Hotel'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-medium">
                    {featured[0]?.type || 'HOTEL'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-4 text-on-surface font-headline">
                    {featured[0]?.name || 'S-T-T Love Hotel'}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                        Chỉ từ
                      </span>
                      <span className="text-xl font-bold text-on-surface">
                        {featured[0]?.price
                          ? `${featured[0].price.toLocaleString('vi-VN')}đ`
                          : '80.000đ'}
                        <span className="text-sm font-normal text-on-surface-variant uppercase">
                          {' '}/ Giờ
                        </span>
                      </span>
                    </div>
                    <Link
                      to={featured[0] ? `/rooms/${featured[0].id}` : '/rooms'}
                    >
                      <Button className="px-6 py-2.5 rounded-lg text-sm">
                        Xem phòng
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Placeholder cards */}
              {featured.slice(1, 3).map((room, i) => (
                <motion.div
                  key={room?.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i + 1) * 0.15 }}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={room?.images?.[0] || fallbackImage}
                      alt={room?.name || 'Room'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-medium">
                      {room?.type || 'HOTEL'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-4 text-on-surface font-headline">
                      {room?.name || 'Phòng cao cấp'}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                          Chỉ từ
                        </span>
                        <span className="text-xl font-bold text-on-surface">
                          {room?.price
                            ? `${room.price.toLocaleString('vi-VN')}đ`
                            : '80.000đ'}
                          <span className="text-sm font-normal text-on-surface-variant uppercase">
                            {' '}/ Đêm
                          </span>
                        </span>
                      </div>
                      <Link to={room ? `/rooms/${room.id}` : '/rooms'}>
                        <Button className="px-6 py-2.5 rounded-lg text-sm">
                          Xem phòng
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Why choose us */}
        <section className="py-24 -mx-6 px-6 bg-surface-dim overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface font-headline tracking-tight mb-6">
              Tại sao chọn S-T-T Love Hotel?
            </h2>
            <div className="w-20 h-1 bg-primary-container mx-auto mb-8 rounded-full" />
            <p className="text-on-surface-variant md:text-lg italic leading-relaxed">
              Không chỉ là một chỗ dừng chân, S‑T‑T mang đến cho bạn và người thương một
              không gian lãng mạn, riêng tư và trọn vẹn cảm xúc ngay giữa lòng TP Hồ Chí Minh.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 max-w-7xl mx-auto">
            <WhyLite
              icon={<Users size={32} />}
              title="Không gian riêng tư +"
              desc="Tận hưởng sự riêng tư tuyệt đối trong từng căn phòng. Thiết kế tối ưu để bạn và người thương có những giây phút thân mật, trọn vẹn."
              delay={0}
            />
            <WhyLite
              icon={<Heart size={32} />}
              title="Thiết kế lãng mạn +"
              desc="Mỗi căn phòng mang phong cách độc đáo, lãng mạn và tinh tế, tạo nên bầu không khí ngọt ngào, giúp tình cảm thêm thăng hoa."
              delay={0.1}
            />
            <WhyLite
              icon={<Sparkles size={32} />}
              title="Tiện nghi cao cấp +"
              desc="Trang bị đầy đủ tiện nghi: giường lớn êm ái, dụng cụ cao cấp, ánh sáng dịu nhẹ và nhiều dịch vụ đi kèm."
              delay={0.2}
            />
            <WhyLite
              icon={<Shield size={32} />}
              title="Tự do & bí mật +"
              desc="Khách hàng được đảm bảo tối đa về sự kín đáo, từ quy trình nhận – trả phòng đến các dịch vụ đi kèm."
              delay={0.3}
            />
          </div>
        </section>

        {/* Gallery */}
        <section className="py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface font-headline tracking-tight mb-4">
              Bộ sưu tập lưu trú độc đáo tại S‑T‑T
            </h2>
            <div className="w-24 h-1 bg-outline-variant mx-auto rounded-full" />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {galleryRooms.map((room, i) => (
              <motion.div
                key={room?.id || i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ scale: 0.98 }}
                className={`relative rounded-2xl overflow-hidden group shadow-sm ${
                  i === 0 ? 'row-span-2 col-span-2' : 'col-span-1'
                }`}
              >
                <img
                  src={room?.images?.[0] || fallbackImage}
                  alt={room?.name || `Gallery ${i}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white text-sm font-bold font-headline bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    {room?.name || 'Xem phòng'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Rooms grid */}
        <section className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between gap-6"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.5em] text-on-surface-variant font-label">
                Đặt phòng
              </div>
              <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface font-headline">
                Phòng nổi bật
              </h2>
            </div>
            <Link to="/rooms" className="hidden sm:inline-flex">
              <Button variant="outline">Xem tất cả phòng</Button>
            </Link>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-10 w-10" />
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {rooms.slice(0, 6).map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <RoomCard room={room} />
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link to="/rooms" className="inline-flex">
              <Button variant="outline">Xem tất cả phòng</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;

const WhyLite = ({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: JSX.Element;
  title: string;
  desc: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center text-center group"
  >
    <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-shadow text-primary-container">
      {icon}
    </div>
    <h3 className="text-sm font-bold tracking-wider text-primary-container mb-4 uppercase font-headline">
      {title}
    </h3>
    <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
  </motion.div>
);
