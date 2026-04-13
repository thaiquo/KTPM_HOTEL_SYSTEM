import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roomApi } from '../../../services/api';
import type { Room, SearchFilters } from '../../../types';
import { Wifi, Tv, Wind, Users, Filter, X } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Danh sách phòng</h1>
          <p className="text-gray-600">Tìm thấy {filteredRooms.length} phòng phù hợp</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64">
            <Card className="p-6 sticky top-24 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Filter size={20} />
                  Bộ lọc
                </h2>
                {showFilters && (
                  <button onClick={() => setShowFilters(false)} className="lg:hidden">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Khoảng giá (VNĐ)</label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Từ"
                    value={filters.priceMin || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMin: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Đến"
                    value={filters.priceMax || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMax: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Room Type */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Loại phòng</label>
                <select
                  value={filters.roomType || ''}
                  onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
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
                <label className="block text-sm font-semibold mb-2">Số khách tối đa</label>
                <select
                  value={filters.maxGuests || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, maxGuests: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
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
                className="w-full py-2 rounded-lg"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          </div>

          {/* Rooms Grid */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mb-4 w-full py-3 rounded-lg"
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
                <p className="text-gray-700 font-semibold">{error}</p>
                <Button className="mt-4" onClick={fetchRooms}>
                  Thử lại
                </Button>
              </Card>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500 text-lg">Không tìm thấy phòng phù hợp</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                  <Link
                    key={room.id}
                    to={`/rooms/${room.id}`}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={room.images[0]}
                        alt={room.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                      />
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {room.price.toLocaleString('vi-VN')}đ
                      </div>
                      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                        {room.type}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {room.description}
                      </p>

                      <div className="flex items-center gap-4 mb-4 text-gray-500 text-sm">
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          <span>{room.maxGuests} khách</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wifi size={16} />
                        </div>
                        <div className="flex items-center gap-1">
                          <Tv size={16} />
                        </div>
                        <div className="flex items-center gap-1">
                          <Wind size={16} />
                        </div>
                      </div>

                      <div className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition font-semibold text-center">
                        Xem chi tiết
                      </div>
                    </div>
                  </Link>
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
