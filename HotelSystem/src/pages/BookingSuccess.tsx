import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Eye } from 'lucide-react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const room = location.state?.room;
  const searchData = location.state?.searchData;
  const bookingInfo = location.state?.bookingInfo;
  const paymentMethod = location.state?.paymentMethod;
  const bookingId = location.state?.bookingId;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary py-12 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Icon */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <CheckCircle size={120} className="text-primary relative" />
            </div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Đặt Phòng Thành Công!
          </h1>
          <p className="text-lg text-text-muted">
            Chúng tôi đã nhận được yêu cầu đặt phòng của bạn
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 border-2 border-border mb-8">
          {/* Booking ID */}
          <div className="mb-8 pb-8 border-b-2 border-border">
            <p className="text-text-muted text-sm mb-2">Mã Đặt Phòng</p>
            <p className="text-3xl font-bold text-primary font-mono">
              {bookingId}
            </p>
            <p className="text-text-muted text-sm mt-2">
              Lưu mã này để tham khảo sau
            </p>
          </div>

          {/* Room & Dates */}
          <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b-2 border-border">
            {/* Room */}
            <div>
              <p className="text-text-muted text-sm mb-3 font-semibold">
                PHÒNG ĐẶT
              </p>
              <p className="text-2xl font-bold text-foreground mb-1">
                {room.name}
              </p>
              <p className="text-text-muted">{room.type}</p>
            </div>

            {/* Check-in/out */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-muted text-sm mb-2 font-semibold">
                  NHẬN PHÒNG
                </p>
                <p className="text-xl font-bold text-foreground">
                  {new Date(searchData.checkIn).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-sm mb-2 font-semibold">
                  TRẢ PHÒNG
                </p>
                <p className="text-xl font-bold text-foreground">
                  {new Date(searchData.checkOut).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Guest & Payment Info */}
          <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b-2 border-border">
            {/* Guest Info */}
            <div>
              <p className="text-text-muted text-sm mb-3 font-semibold">
                THÔNG TIN KHÁCH
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-text-muted text-xs">Tên</p>
                  <p className="font-semibold text-foreground">
                    {bookingInfo.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Số điện thoại</p>
                  <p className="font-semibold text-foreground">
                    {bookingInfo.phone}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Email</p>
                  <p className="font-semibold text-foreground">
                    {bookingInfo.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div>
              <p className="text-text-muted text-sm mb-3 font-semibold">
                THANH TOÁN
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-text-muted text-xs">Phương thức</p>
                  <p className="font-semibold text-foreground">
                    {paymentMethod?.name || 'Chưa chọn'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Số đêm</p>
                  <p className="font-semibold text-foreground">
                    {nights} đêm
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Tổng giá</p>
                  <p className="text-lg font-bold text-primary">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-secondary/50 rounded-xl p-6 border-2 border-primary/20">
            <h3 className="font-bold text-foreground mb-3">Bước Tiếp Theo</h3>
            <ul className="space-y-2 text-text-muted text-sm">
              <li className="flex items-start gap-3">
                <span className="font-bold text-primary mt-1">1.</span>
                <span>Chúng tôi sẽ gửi email xác nhận đến {bookingInfo.email}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-primary mt-1">2.</span>
                <span>
                  {paymentMethod?.id === 'cash'
                    ? 'Thanh toán tại lễ tân khách sạn khi nhận phòng'
                    : 'Hoàn tất thanh toán theo hướng dẫn trong email'}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-primary mt-1">3.</span>
                <span>Đến nhận phòng vào ngày {new Date(searchData.checkIn).toLocaleDateString('vi-VN')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() =>
              navigate('/my-bookings', { state: { bookingId } })
            }
            className="flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 text-center"
          >
            <Eye size={20} />
            Xem Phòng Đã Đặt
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-secondary text-foreground font-bold rounded-lg hover:bg-border transition-all duration-200 border-2 border-border"
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
