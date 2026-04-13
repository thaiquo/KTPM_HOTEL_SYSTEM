import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roomApi } from '../services/api';
import type { Room, SearchFilters } from '../types';
import { Wifi, Tv, Wind, Users, Filter, X, ChevronDown } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary/30 py-8 border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-2">
            Danh Sách Phòng
          </h1>
          <p className="text-text-muted">
            Tìm thấy <span className="font-semibold text-foreground">{filteredRooms.length}</span> phòng phù hợp
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden w-full mb-6 flex items-center justify-between px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition"
            >
              <div className="flex items-center gap-2">
                <Filter size={20} />
                Bộ Lọc
              </div>
              <ChevronDown size={20} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters Panel */}
            {(showFilters || window.innerWidth >= 1024) && (
              <Card variant="elevated" className="p-6 sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Filter size={20} />
                    Bộ Lọc
                  </h2>
                  {showFilters && (
                    <button
                      onClick={() => setShowFilters(false)}
                      className="lg:hidden text-text-muted hover:text-foreground"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground text-sm">Khoảng Giá (VNĐ)</h3>
                  <Input
                    type="number"
                    placeholder="Từ"
                    value={filters.priceMin || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMin: Number(e.target.value) })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Đến"
                    value={filters.priceMax || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, priceMax: Number(e.target.value) })
                    }
                  />
                </div>

                {/* Room Type */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-foreground">
                    Loại Phòng
                  </label>
                  <div className="relative">
                    <select
                      value={filters.roomType || ''}
                      onChange={(e) =>
                        setFilters({ ...filters, roomType: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-secondary border-2 border-border rounded-lg
                        text-foreground
                        focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                        appearance-none transition-all duration-200 pr-10"
                    >
                      <option value="">Tất cả</option>
                      <option value="Standard">Standard</option>
                      <option value="Deluxe">Deluxe</option>
                      <option value="VIP">VIP</option>
                      <option value="Suite">Suite</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Max Guests */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-foreground">
                    Số Khách Tối Đa
                  </label>
                  <div className="relative">
                    <select
                      value={filters.maxGuests || ''}
                      onChange={(e) =>
                        setFilters({ ...filters, maxGuests: Number(e.target.value) })
                      }
                      className="w-full px-4 py-3 bg-secondary border-2 border-border rounded-lg
                        text-foreground
                        focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                        appearance-none cursor-pointer transition-all duration-200 pr-10"
                    >
                      <option value="0">Không giới hạn</option>
                      <option value="2">2 người</option>
                      <option value="3">3 người</option>
                      <option value="4">4 người</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
                  </div>
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
                  className="w-full"
                >
                  Đặt Lại Bộ Lọc
                </Button>
              </Card>
            )}
          </div>

          {/* Rooms Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-border border-t-primary" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <Card variant="outlined" className="py-16 text-center">
                <p className="text-text-muted text-lg">Không tìm thấy phòng phù hợp với bộ lọc của bạn</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {filteredRooms.map((room) => (
                  <Link
                    key={room.id}
                    to={`/rooms/${room.id}`}
                  >
                    <Card hover variant="elevated" className="h-full flex flex-col overflow-hidden">
                      <CardImage>
                        <img
                          src={room.images[0]}
                          alt={room.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        />
                        <div className="absolute top-4 right-4 z-10">
                          <Badge variant="primary" size="md">
                            {room.price.toLocaleString('vi-VN')}đ
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 left-4 z-10">
                          <Badge variant="secondary" size="md">
                            {room.type}
                          </Badge>
                        </div>
                      </CardImage>

                      <CardContent className="flex-grow flex flex-col">
                        <CardHeader>
                          <CardTitle>{room.name}</CardTitle>
                          <CardDescription>{room.description}</CardDescription>
                        </CardHeader>
                        <div className="mt-auto pt-4">
                          <div className="flex items-center gap-4 text-text-muted text-sm mb-4">
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
                          <Button className="w-full" variant="primary" size="md">
                            Xem Chi Tiết
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
