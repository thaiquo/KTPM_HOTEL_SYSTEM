import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Clock, X, ChevronRight } from 'lucide-react';

interface Booking {
  id: string;
  roomName: string;
  roomType: string;
  roomImage: string;
  checkIn: string;
  checkOut: string;
  price: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>(
    'upcoming'
  );

  // Mock bookings data
  const bookings: Booking[] = [
    {
      id: 'STT1234567',
      roomName: 'Phòng Deluxe',
      roomType: 'Deluxe',
      roomImage: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
      checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 1500000,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'STT1234568',
      roomName: 'Phòng VIP',
      roomType: 'VIP',
      roomImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
      checkIn: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOut: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 2400000,
      status: 'completed',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const filteredBookings = bookings.filter((b) => b.status === activeTab);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: {
        bg: 'bg-warning/10',
        text: 'text-warning',
        label: 'Sắp tới',
      },
      completed: {
        bg: 'bg-success/10',
        text: 'text-success',
        label: 'Đã hoàn thành',
      },
      cancelled: {
        bg: 'bg-error/10',
        text: 'text-error',
        label: 'Đã hủy',
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-border hover:shadow-2xl transition-all duration-300">
      <div className="grid md:grid-cols-3 gap-6 p-6">
        {/* Image */}
        <div className="md:col-span-1">
          <img
            src={booking.roomImage}
            alt={booking.roomName}
            className="w-full h-48 md:h-full object-cover rounded-xl"
          />
        </div>

        {/* Details */}
        <div className="md:col-span-1 space-y-4">
          <div>
            <p className="text-text-muted text-sm mb-1">Phòng</p>
            <h3 className="text-xl font-bold text-foreground">{booking.roomName}</h3>
            <p className="text-text-muted text-sm">{booking.roomType}</p>
          </div>

          <div>
            <p className="text-text-muted text-sm mb-1">Ngày</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-primary" />
              <span className="font-semibold text-foreground">
                {new Date(booking.checkIn).toLocaleDateString('vi-VN')} -{' '}
                {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          <div>
            <p className="text-text-muted text-sm mb-1">Mã Đặt</p>
            <p className="font-mono font-bold text-primary text-sm">
              {booking.id}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="mb-4">{getStatusBadge(booking.status)}</div>
            <div className="mb-4">
              <p className="text-text-muted text-sm mb-1">Tổng Cộng</p>
              <p className="text-2xl font-bold text-primary">
                {booking.price.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 flex flex-col">
            <button
              onClick={() => navigate(`/rooms/${booking.id}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all"
            >
              <Clock size={18} />
              Xem Chi Tiết
            </button>

            {booking.status === 'upcoming' && (
              <button
                onClick={() =>
                  confirm('Bạn có chắc chắn muốn hủy đặt phòng này?') &&
                  alert('Yêu cầu hủy phòng đã được gửi')
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error/10 text-error font-semibold rounded-lg hover:bg-error/20 transition-all"
              >
                <X size={18} />
                Hủy Phòng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs: Array<{ id: 'upcoming' | 'completed' | 'cancelled'; label: string; count: number }> = [
    {
      id: 'upcoming',
      label: 'Sắp Tới',
      count: bookings.filter((b) => b.status === 'upcoming').length,
    },
    {
      id: 'completed',
      label: 'Đã Hoàn Thành',
      count: bookings.filter((b) => b.status === 'completed').length,
    },
    {
      id: 'cancelled',
      label: 'Đã Hủy',
      count: bookings.filter((b) => b.status === 'cancelled').length,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-2">
            Đặt Phòng Của Tôi
          </h1>
          <p className="text-lg text-text-muted">
            Quản lý và theo dõi tất cả các đặt phòng của bạn
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 lg:gap-4 mb-8 border-b-2 border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-bold border-b-4 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2.5 py-1 rounded-full text-sm bg-opacity-20 inline-block">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <MapPin size={48} className="mx-auto text-text-muted/30" />
            </div>
            <p className="text-text-muted text-lg mb-6">
              {activeTab === 'upcoming'
                ? 'Bạn chưa có đặt phòng sắp tới'
                : activeTab === 'completed'
                  ? 'Bạn chưa có đặt phòng hoàn thành'
                  : 'Bạn chưa hủy phòng nào'}
            </p>
            <button
              onClick={() => navigate('/rooms')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition"
            >
              Đặt Phòng Ngay
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
