import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Eye, Copy, Download } from 'lucide-react';
import { useState } from 'react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const room = location.state?.room;
  const searchData = location.state?.searchData;
  const bookingInfo = location.state?.bookingInfo;
  const paymentMethod = location.state?.paymentMethod;
  const bookingId = location.state?.bookingId;
  const [copied, setCopied] = useState(false);

  if (!room || !searchData || !bookingInfo || !bookingId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">Không tìm thấy thông tin đặt phòng</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(searchData.checkOut).getTime() - new Date(searchData.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const totalPrice = room.price * nights;

  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary py-12 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-2xl">
                <CheckCircle size={80} className="text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Đặt Phòng Thành Công!
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Chúng tôi đã nhận được yêu cầu đặt phòng của bạn. Vui lòng kiểm tra email để nhận xác nhận chi tiết.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-border mb-8">
          {/* Booking ID Section */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 lg:px-10 py-10 border-b-2 border-border">
            <p className="text-text-muted text-sm mb-3 font-semibold uppercase tracking-wide">
              Mã Đặt Phòng
            </p>
            <div className="flex items-center gap-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary font-mono tracking-wide">
                {bookingId}
              </p>
              <button
                onClick={handleCopyBookingId}
                className="p-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                title="Sao chép mã đặt phòng"
              >
                <Copy size={20} />
              </button>
            </div>
            <p className="text-text-muted text-sm mt-3">
              {copied ? '✓ Đã sao chép!' : 'Nhấn vào biểu tượng để sao chép mã đặt phòng'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="p-8 lg:p-10">
            {/* Room & Dates */}
            <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b-2 border-border">
              <div>
                <p className="text-text-muted text-xs mb-2 font-semibold uppercase tracking-wide">
                  Phòng Đặt
                </p>
                <p className="text-3xl font-bold text-foreground mb-2">
                  {room.name}
                </p>
                <p className="text-text-muted text-sm mb-4">{room.type}</p>
                <div className="w-16 h-1 bg-primary rounded-full" />
              </div>

              <div>
                <p className="text-text-muted text-xs mb-2 font-semibold uppercase tracking-wide">
                  Thời Gian Lưu Trú
                </p>
                <p className="text-sm text-foreground mb-4">
                  <span className="font-bold">Nhận phòng:</span>{' '}
                  {new Date(searchData.checkIn).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-bold">Trả phòng:</span>{' '}
                  {new Date(searchData.checkOut).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Guest & Payment Info */}
            <div className="grid md:grid-cols-2 gap-8 pb-8 border-b-2 border-border">
              <div>
                <p className="text-text-muted text-xs mb-2 font-semibold uppercase tracking-wide">
                  Thông Tin Khách
                </p>
                <p className="text-lg font-bold text-foreground mb-2">
                  {bookingInfo.fullName}
                </p>
                <p className="text-sm text-text-muted mb-1">{bookingInfo.email}</p>
                <p className="text-sm text-text-muted">{bookingInfo.phone}</p>
              </div>

              <div>
                <p className="text-text-muted text-xs mb-2 font-semibold uppercase tracking-wide">
                  Phương Thức Thanh Toán
                </p>
                <p className="text-lg font-bold text-foreground">
                  {paymentMethod?.name}
                </p>
                <p className="text-sm text-text-muted mt-2">
                  {paymentMethod?.description}
                </p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-8 pb-8 border-b-2 border-border">
              <div className="flex justify-between items-center">
                <p className="text-foreground">
                  {room.price.toLocaleString('vi-VN')}đ × {nights} đêm
                </p>
                <p className="font-semibold text-foreground">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </p>
              </div>
              <div className="flex justify-between items-center pt-4">
                <p className="text-lg font-bold text-foreground">Tổng Cộng</p>
                <p className="text-4xl font-bold text-primary">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-primary/5 rounded-xl p-6 border-2 border-primary/20 mb-8">
              <h3 className="font-bold text-foreground mb-4">Các Bước Tiếp Theo</h3>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-3">
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Kiểm tra email xác nhận chi tiết đặt phòng</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Đóng tiền trước (nếu cần) theo hướng dẫn trong email
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Liên hệ khách sạn để xác nhận ngày nhận phòng</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Eye size={20} />
            Xem Phòng Đã Đặt
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-secondary text-foreground font-bold rounded-xl hover:bg-border transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-border"
          >
            <Home size={20} />
            Về Trang Chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
