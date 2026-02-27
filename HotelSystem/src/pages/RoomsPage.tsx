import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roomApi } from '../services/api';
import type { Room, SearchFilters } from '../types';
import { Wifi, Tv, Wind, Users, Filter, X } from 'lucide-react';

const RoomsPage = () => {
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: 2000000,
    roomType: '',
    maxGuests: 0,
  });

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const queryFilters: SearchFilters = {
          checkIn: searchParams.get('checkIn') || undefined,
          checkOut: searchParams.get('checkOut') || undefined,
          ...filters,
        };

        const roomList = await roomApi.getAll(queryFilters);
        setRooms(roomList);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        // Mock data for demo
        setRooms([
          {
            id: '1',
            name: 'Phòng Standard',
            type: 'Standard',
            price: 400000,
            maxGuests: 2,
            images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'],
            amenities: ['WiFi', 'TV', 'AC'],
            description: 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản',
            available: true,
          },
          {
            id: '2',
            name: 'Phòng Deluxe',
            type: 'Deluxe',
            price: 600000,
            maxGuests: 2,
            images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'],
            amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'],
            description: 'Phòng Deluxe sang trọng với view đẹp',
            available: true,
          },
          {
            id: '3',
            name: 'Phòng VIP',
            type: 'VIP',
            price: 900000,
            maxGuests: 4,
            images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'],
            amenities: ['WiFi', 'TV', 'AC', 'Jacuzzi'],
            description: 'Phòng VIP cao cấp với jacuzzi',
            available: true,
          },
          {
            id: '4',
            name: 'Phòng Suite',
            type: 'Suite',
            price: 1500000,
            maxGuests: 4,
            images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
            amenities: ['WiFi', 'TV', 'AC', 'Jacuzzi', 'Mini Bar', 'Balcony'],
            description: 'Phòng Suite đẳng cấp 5 sao với ban công riêng',
            available: true,
          },
          {
            id: '5',
            name: 'Phòng Deluxe Plus',
            type: 'Deluxe',
            price: 750000,
            maxGuests: 3,
            images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
            amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'],
            description: 'Phòng Deluxe nâng cấp với không gian rộng rãi',
            available: true,
          },
          {
            id: '6',
            name: 'Phòng Premium',
            type: 'VIP',
            price: 1100000,
            maxGuests: 4,
            images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'],
            amenities: ['WiFi', 'TV', 'AC', 'Jacuzzi', 'Sound System'],
            description: 'Phòng Premium với hệ thống âm thanh cao cấp',
            available: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
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
          <p className="text-gray-600">
            Tìm thấy {filteredRooms.length} phòng phù hợp
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Filter size={20} />
                  Bộ lọc
                </h2>
                {showFilters && (
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
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
                <label className="block text-sm font-semibold mb-2">
                  Loại phòng
                </label>
                <select
                  value={filters.roomType || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, roomType: e.target.value })
                  }
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
                <label className="block text-sm font-semibold mb-2">
                  Số khách tối đa
                </label>
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
              <button
                onClick={() =>
                  setFilters({
                    priceMin: 0,
                    priceMax: 2000000,
                    roomType: '',
                    maxGuests: 0,
                  })
                }
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mb-4 w-full bg-orange-500 text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Filter size={20} />
              Bộ lọc
            </button>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-orange-500"></div>
              </div>
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

                      <button className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition font-semibold">
                        Xem chi tiết
                      </button>
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