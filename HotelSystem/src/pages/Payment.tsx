import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Building2, CreditCard, Smartphone, Lock } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const room = location.state?.room;
  const searchData = location.state?.searchData;
  const bookingInfo = location.state?.bookingInfo;

  const [selectedMethod, setSelectedMethod] = useState<string>('bank');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Thanh Toán Tại Khách Sạn',
      icon: <Building2 size={28} />,
      description: 'Thanh toán tiền mặt khi nhận phòng',
    },
    {
      id: 'bank',
      name: 'Chuyển Khoản Ngân Hàng',
      icon: <CreditCard size={28} />,
      description: 'Chuyển khoản trực tiếp vào tài khoản',
    },
    {
      id: 'wallet',
      name: 'MoMo / ZaloPay',
      icon: <Smartphone size={28} />,
      description: 'Thanh toán qua ứng dụng di động',
    },
    {
      id: 'card',
      name: 'Thẻ Tín Dụng / Debit',
      icon: <CreditCard size={28} />,
      description: 'Thanh toán bằng thẻ ngân hàng',
    },
  ];

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate('/booking-success', {
      state: {
        room,
        searchData,
        bookingInfo,
        paymentMethod: paymentMethods.find((m) => m.id === selectedMethod),
        bookingId: 'STT' + Date.now(),
      },
    });
  };

  if (!room || !searchData || !bookingInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">Không tìm thấy thông tin thanh toán</p>
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
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-border">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Chọn Phương Thức Thanh Toán
              </h1>
              <p className="text-text-muted mb-8">
                Chọn cách thanh toán phù hợp với bạn
              </p>

              {/* Payment Methods Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left group ${
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl transition-all ${
                          selectedMethod === method.id
                            ? 'bg-primary text-white'
                            : 'bg-secondary text-primary group-hover:bg-primary/10'
                        }`}
                      >
                        {method.icon}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-lg text-foreground mb-1">
                          {method.name}
                        </h3>
                        <p className="text-text-muted text-sm">
                          {method.description}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedMethod === method.id
                            ? 'border-primary bg-primary'
                            : 'border-border'
                        }`}
                      >
                        {selectedMethod === method.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Security Info */}
              <div className="bg-accent/5 border-2 border-accent/20 rounded-xl p-6 flex items-start gap-4">
                <Lock className="text-primary flex-shrink-0 mt-1" size={24} />
                <div>
                  <p className="font-semibold text-foreground mb-1">Thanh Toán An Toàn</p>
                  <p className="text-text-muted text-sm">
                    Tất cả giao dịch thanh toán của bạn được mã hóa và bảo vệ bằng các tiêu chuẩn bảo mật quốc tế
                  </p>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="w-full px-6 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 text-lg mt-8 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Phòng'}
              </button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-border sticky top-24 h-fit">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Tóm Tắt Thanh Toán
              </h3>

              {/* Room & Dates */}
              <div className="space-y-4 pb-6 border-b-2 border-border">
                <div>
                  <p className="text-text-muted text-sm mb-1">Phòng</p>
                  <p className="text-lg font-bold text-foreground">{room.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted mb-1">Nhận</p>
                    <p className="font-semibold text-foreground">
                      {new Date(searchData.checkIn).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-1">Trả</p>
                    <p className="font-semibold text-foreground">
                      {new Date(searchData.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 py-6 border-b-2 border-border">
                <div className="flex justify-between">
                  <p className="text-text-muted">
                    {room.price.toLocaleString('vi-VN')}đ × {nights} đêm
                  </p>
                  <p className="font-semibold text-foreground">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Guest Info */}
              <div className="space-y-3 py-6">
                <div>
                  <p className="text-text-muted text-sm mb-1">Khách Hàng</p>
                  <p className="font-semibold text-foreground">
                    {bookingInfo.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-sm mb-1">Liên Hệ</p>
                  <p className="font-semibold text-foreground text-sm">
                    {bookingInfo.phone}
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6 border-t-2 border-border">
                <div className="flex justify-between items-center">
                  <p className="text-foreground font-bold">Tổng Cộng</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
