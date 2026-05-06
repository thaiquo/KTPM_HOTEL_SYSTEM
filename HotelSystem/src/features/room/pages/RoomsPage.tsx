import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { roomApi } from '../../../services/api';
import Spinner from '../../../shared/components/ui/Spinner';

const RoomsPage = () => {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRoomTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roomApi.getRoomTypes();
      setRoomTypes(data);
    } catch (err) {
      console.error('Error fetching room types:', err);
      setError('Không thể tải danh sách loại phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-20 text-[#141414]">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">
            Lựa chọn của bạn
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Các Loại Phòng
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#5a5a5a] md:text-lg">
            Khám phá {roomTypes.length} hạng phòng được thiết kế độc bản mang đến trải nghiệm nghỉ dưỡng hoàn hảo nhất.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex py-20 justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-red-600">{error}</p>
            <button
              onClick={fetchRoomTypes}
              className="mt-6 inline-block rounded-xl bg-[#d4af37] px-6 py-3 font-bold text-black transition-all hover:brightness-110"
            >
              Thử lại
            </button>
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-black/5 bg-white p-16 text-center shadow-sm">
            <p className="text-xl font-bold text-[#141414]">
              Không có loại phòng nào
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {roomTypes.map((type, i) => {
                const thumbnail = type.images?.find((img: any) => img.isThumbnail)?.imageUrl || type.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

                return (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={thumbnail}
                        alt={type.type}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight text-[#111]">
                            {type.type} ROOM
                          </h3>
                          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#5a5a5a]">
                            <span className="flex items-center gap-1">
                              👥 {type.defaultCapacity} - {type.maxCapacity} người
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-bold uppercase tracking-widest text-[#d4af37]">Từ</span>
                          <span className="text-xl font-black text-[#141414]">
                            {type.basePrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-[#5a5a5a]">
                        {type.description}
                      </p>

                      <div className="mt-6 flex items-center gap-3">
                        <Link
                          to={`/rooms/${type.id}`}
                          className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-bold text-[#141414] transition-colors hover:bg-[#f7f7f7]"
                        >
                          Xem chi tiết
                        </Link>
                        <Link
                          to={`/booking/cart?typeId=${type.id}`}
                          className="flex-1 rounded-xl bg-[#0f0f0f] px-4 py-3 text-center text-sm font-bold text-[#d4af37] transition-all hover:bg-[#d4af37] hover:text-black shadow-lg"
                        >
                          Chọn
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsPage;
