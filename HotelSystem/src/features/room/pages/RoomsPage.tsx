import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { roomApi } from '../../../services/api';
import type { Room, SearchFilters } from '../../../types';
import { Filter, X } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import RoomCard from '../components/RoomCard';

const RoomsPage = () => {
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: 2000000,
    roomType: '',
    maxGuests: 0,
  });

  const fetchRooms = async () => {
    setLoading(true);
    setError('');

    try {
      const queryFilters: SearchFilters = {
        checkIn: searchParams.get('checkIn') || undefined,
        checkOut: searchParams.get('checkOut') || undefined,
        ...filters,
      };

      const roomList = await roomApi.getAll(queryFilters);
      setRooms(roomList);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setRooms([]);
      setError('Không thể tải danh sách phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filters]);

  const filteredRooms = rooms.filter((room) => {
    if (filters.priceMin && room.price < filters.priceMin) return false;
    if (filters.priceMax && room.price > filters.priceMax) return false;
    if (filters.roomType && room.type !== filters.roomType) return false;
    if (filters.maxGuests && room.maxGuests < filters.maxGuests) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-on-surface-variant font-label">
            Search results
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface font-headline">
            Danh sách phòng
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Tìm thấy {filteredRooms.length} phòng phù hợp
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:w-64"
          >
            <Card className="p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold tracking-tight text-on-surface font-headline flex items-center gap-2">
                  <Filter size={18} className="text-primary-fixed-dim" />
                  Bộ lọc
                </h2>
                {showFilters && (
                  <button onClick={() => setShowFilters(false)} className="lg:hidden">
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">
                  Khoảng giá (VNĐ)
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Từ"
                    value={filters.priceMin || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMin: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Đến"
                    value={filters.priceMax || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMax: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-highest/70 text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                  />
                </div>
              </div>

              {/* Room Type */}
              <div className="mb-6">
                <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">
                  Loại phòng
                </label>
                <select
                  value={filters.roomType || ''}
                  onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-highest/70 text-on-surface outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                >
                  <option value="">Tất cả</option>
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="VIP">VIP</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>

              {/* Max Guests */}
              <div className="mb-6">
                <label className="block text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2 font-label">
                  Số khách tối đa
                </label>
                <select
                  value={filters.maxGuests || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, maxGuests: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-highest/70 text-on-surface outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/20 transition-all"
                >
                  <option value="0">Không giới hạn</option>
                  <option value="2">2 người</option>
                  <option value="3">3 người</option>
                  <option value="4">4 người</option>
                </select>
              </div>

              {/* Reset Button */}
              <Button
                onClick={() =>
                  setFilters({
                    priceMin: 0,
                    priceMax: 2000000,
                    roomType: '',
                    maxGuests: 0,
                  })
                }
                variant="outline"
                className="w-full py-2"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          </motion.div>

          {/* Rooms Grid */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mb-4 w-full py-3"
            >
              <Filter size={20} />
              Bộ lọc
            </Button>

            {loading ? (
              <div className="text-center py-12">
                <Spinner className="h-16 w-16" />
              </div>
            ) : error ? (
              <Card className="p-8 rounded-lg text-center">
                <p className="text-on-surface font-semibold">{error}</p>
                <Button className="mt-4" onClick={fetchRooms}>
                  Thử lại
                </Button>
              </Card>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-low rounded-lg border border-outline-variant/15">
                <p className="text-on-surface-variant text-lg">
                  Không tìm thấy phòng phù hợp
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {filteredRooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <RoomCard room={room} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomsPage;
