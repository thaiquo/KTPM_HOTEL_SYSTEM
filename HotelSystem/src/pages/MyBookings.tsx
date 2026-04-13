import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Clock, X, ChevronRight, Eye, Trash2, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';

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
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 flex flex-col ${
      booking.status === 'upcoming' ? 'border-warning/20 hover:border-warning/40' :
      booking.status === 'completed' ? 'border-success/20 hover:border-success/40' :
      'border-error/20 hover:border-error/40'
    }`}>
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={booking.roomImage}
          alt={booking.roomName}
          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4">
          {getStatusBadge(booking.status)}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex-grow flex flex-col">
        {/* Room Info */}
        <h3 className="text-xl font-bold text-foreground mb-1">
          {booking.roomName}
        </h3>
        <p className="text-text-muted text-sm mb-6">{booking.roomType}</p>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b-2 border-border">
          {/* Dates */}
          <div>
            <p className="text-text-muted text-xs font-semibold mb-2">NGÀY LƯƯU TRÚ</p>
            <div className="space-y-2">
              <div>
                <p className="text-text-muted text-xs mb-1">Nhận</p>
                <p className="font-semibold text-foreground">
                  {new Date(booking.checkIn).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Trả</p>
                <p className="font-semibold text-foreground">
                  {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>

          {/* Booking ID */}
          <div>
            <p className="text-text-muted text-xs font-semibold mb-2">MÃ ĐẶT PHÒNG</p>
            <p className="font-mono font-bold text-primary text-base">
              {booking.id}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <p className="text-text-muted text-xs font-semibold mb-2">TỔNG CỘNG</p>
          <p className="text-3xl font-bold text-primary">
            {booking.price.toLocaleString('vi-VN')}đ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-auto">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all shadow-md hover:shadow-lg">
            <Eye size={18} />
            Chi Tiết
          </button>
          
          {booking.status === 'upcoming' && (
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error/10 text-error font-semibold rounded-lg hover:bg-error/20 transition-all border-2 border-error/20">
              <Trash2 size={18} />
              Hủy
            </button>
          )}
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-6 font-semibold transition"
          >
            <ChevronLeft size={20} />
            Quay lại
          </button>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-2">
            Đặt Phòng Của Tôi
          </h1>
          <p className="text-lg text-text-muted">
            Quản lý và theo dõi tất cả các đặt phòng của bạn
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-10 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white text-foreground border-2 border-border hover:border-primary/50'
              }`}
            >
              {tab.id === 'upcoming' && <Clock size={18} />}
              {tab.id === 'completed' && <CheckCircle size={18} />}
              {tab.id === 'cancelled' && <XCircle size={18} />}
              {tab.label}
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/10 text-primary'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-border">
            <div className="mb-6">
              <div className="inline-block p-4 bg-secondary rounded-full">
                <MapPin size={40} className="text-text-muted" />
              </div>
            </div>
            <p className="text-text-muted text-lg mb-8 font-medium">
              {activeTab === 'upcoming'
                ? 'Bạn chưa có đặt phòng sắp tới'
                : activeTab === 'completed'
                  ? 'Bạn chưa có đặt phòng hoàn thành'
                  : 'Bạn chưa hủy phòng nào'}
            </p>
            <button
              onClick={() => navigate('/rooms')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition shadow-lg hover:shadow-xl"
            >
              Đặt Phòng Ngay
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
