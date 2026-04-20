import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import { Wifi, Tv, Wind, Users, ArrowLeft } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { useAuth } from '../../../contexts/AuthContext';

export default function RoomDetailPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await roomApi.getById(id);
        setRoom(data);
        setSelectedImageIndex(0);
      } catch (err) {
        console.error('Error fetching room:', err);
        setRoom(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center py-12">
            <Spinner className="h-16 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-primary-fixed-dim hover:text-primary font-semibold">
            <ArrowLeft size={18} />
            Quay lại danh sách phòng
          </Link>
          <div className="mt-8 bg-surface-container-low rounded-xl border border-outline-variant/15 p-8 text-center">
            <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
            <p className="text-on-surface-variant mt-2">Vui lòng thử lại hoặc chọn phòng khác.</p>
          </div>
        </div>
      </div>
    );
  }

  const images = room.images?.length ? room.images : [];
  const selectedImage = images[selectedImageIndex] || images[0];

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/rooms" className="inline-flex items-center gap-2 text-primary-fixed-dim hover:text-primary font-semibold transition-colors">
            <ArrowLeft size={18} />
            Quay lại danh sách phòng
          </Link>
        </motion.div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3"
          >
            <Card className="overflow-hidden">
              <div className="p-6">
                <div className="text-[11px] uppercase tracking-[0.28em] text-on-surface-variant font-label">
                  Room detail
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface font-headline">
                      {room.name}
                    </h1>
                    <p className="text-on-surface-variant mt-1">Loại phòng: {room.type}</p>
                  </div>
                  <div className="shrink-0 bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-4 py-2 rounded-full font-extrabold tracking-tight shadow-lg shadow-primary-container/15">
                    {room.price.toLocaleString('vi-VN')}đ / đêm
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-9 relative overflow-hidden rounded-xl">
                    {selectedImage ? (
                      <motion.img
                        key={selectedImageIndex}
                        initial={{ opacity: 0.5, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        src={selectedImage}
                        alt={room.name}
                        className="w-full h-[420px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-[420px] bg-surface-container-high" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/55" />
                  </div>

                  <div className="lg:col-span-3">
                    <div className="flex lg:flex-col gap-3 overflow-x-auto scrollbar-hide lg:overflow-visible">
                      {images.slice(0, 5).map((src, idx) => (
                        <button
                          key={src + idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={
                            'relative shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 ' +
                            (idx === selectedImageIndex
                              ? 'border-primary-container shadow-lg shadow-primary-container/15 scale-[1.03]'
                              : 'border-outline-variant/15 hover:border-outline-variant/30 opacity-70 hover:opacity-100')
                          }
                        >
                          <img
                            src={src}
                            alt={`${room.name} ${idx + 1}`}
                            className="h-24 w-32 lg:w-full lg:h-24 object-cover transition duration-700 hover:scale-[1.05]"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-on-surface-variant mt-6 leading-relaxed">{room.description}</p>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                  <div className="inline-flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
                    <Users size={16} className="text-primary-fixed-dim" />
                    <span>{room.maxGuests} khách</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
                    <Wifi size={16} className="text-primary-fixed-dim" />
                    <span>WiFi</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
                    <Tv size={16} className="text-primary-fixed-dim" />
                    <span>TV</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
                    <Wind size={16} className="text-primary-fixed-dim" />
                    <span>AC</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-2"
          >
            <Card className="p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-extrabold tracking-tight text-on-surface font-headline">
                Tóm tắt
              </h2>
              <div className="mt-4 space-y-3 text-on-surface">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Giá</span>
                  <span className="font-semibold">{room.price.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Tối đa</span>
                  <span className="font-semibold">{room.maxGuests} khách</span>
                </div>
              </div>

              <Button
                className="mt-6 w-full py-3"
                type="button"
                onClick={() => {
                  const bookingPath = `/booking?roomId=${encodeURIComponent(room.id)}`;
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=${encodeURIComponent(bookingPath)}`);
                    return;
                  }

                  navigate(bookingPath);
                }}
              >
                Đặt phòng
              </Button>

              <p className="mt-3 text-xs text-on-surface-variant">
                Thanh toán hiện đang demo (tạo booking PENDING).
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
