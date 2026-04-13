import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, User, MessageSquare } from 'lucide-react';

const BookingInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const room = location.state?.room;
  const searchData = location.state?.searchData;

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    specialRequest: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email';
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      navigate('/payment', {
        state: { room, searchData, bookingInfo: formData },
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (!room || !searchData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">Không tìm thấy thông tin đặt phòng</p>
          <button
            onClick={() => navigate('/rooms')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Quay lại
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
    <div className="min-h-screen bg-background py-8 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:text-primary-dark mb-8 font-semibold transition"
        >
          <ChevronLeft size={20} />
          Quay lại
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-border">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Thông Tin Đặt Phòng
              </h1>
              <p className="text-text-muted mb-8">
                Vui lòng hoàn thành thông tin để tiếp tục thanh toán
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={18} className="text-primary" />
                      Họ và Tên
                    </div>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Nhập họ và tên đầy đủ"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                      errors.fullName ? 'border-error' : 'border-border focus:border-primary'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-error text-sm mt-2">{errors.fullName}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone size={18} className="text-primary" />
                      Số Điện Thoại
                    </div>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Nhập số điện thoại"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                      errors.phone ? 'border-error' : 'border-border focus:border-primary'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-error text-sm mt-2">{errors.phone}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail size={18} className="text-primary" />
                      Email
                    </div>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Nhập email"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                      errors.email ? 'border-error' : 'border-border focus:border-primary'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-error text-sm mt-2">{errors.email}</p>
                  )}
                </div>

                {/* Special Request */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={18} className="text-primary" />
                      Yêu Cầu Đặc Biệt (Tùy Chọn)
                    </div>
                  </label>
                  <textarea
                    name="specialRequest"
                    value={formData.specialRequest}
                    onChange={handleInputChange}
                    placeholder="Nhập các yêu cầu đặc biệt của bạn..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 text-lg mt-8"
                >
                  Tiếp Tục Thanh Toán
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-border sticky top-24 h-fit">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Tóm Tắt Đặt Phòng
              </h3>

              {/* Room Info */}
              <div className="space-y-4 pb-6 border-b-2 border-border">
                <div>
                  <p className="text-text-muted text-sm mb-1">Phòng</p>
                  <p className="text-lg font-bold text-foreground">{room.name}</p>
                  <p className="text-sm text-text-muted">{room.type}</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted text-sm mb-1">Nhận Phòng</p>
                    <p className="font-semibold text-foreground">
                      {new Date(searchData.checkIn).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-sm mb-1">Trả Phòng</p>
                    <p className="font-semibold text-foreground">
                      {new Date(searchData.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-text-muted text-sm mb-1">Số Đêm</p>
                  <p className="font-semibold text-foreground">{nights} đêm</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 py-6 border-b-2 border-border">
                <div className="flex justify-between items-center">
                  <p className="text-text-muted">
                    {room.price.toLocaleString('vi-VN')}đ × {nights} đêm
                  </p>
                  <p className="font-semibold text-foreground">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-foreground font-bold">Tổng Cộng</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <p className="text-xs text-text-muted text-center">
                  Chưa bao gồm các phí khác
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingInfo;
