import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Building2, CreditCard, Smartphone, Lock, CheckCircle } from 'lucide-react';

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
      icon: <Building2 size={32} />,
      description: 'Thanh toán tiền mặt khi nhận phòng',
    },
    {
      id: 'bank',
      name: 'Chuyển Khoản Ngân Hàng',
      icon: <CreditCard size={32} />,
      description: 'Chuyển khoản trực tiếp vào tài khoản',
    },
    {
      id: 'wallet',
      name: 'MoMo / ZaloPay',
      icon: <Smartphone size={32} />,
      description: 'Thanh toán qua ứng dụng di động',
    },
    {
      id: 'card',
      name: 'Thẻ Tín Dụng / Debit',
      icon: <CreditCard size={32} />,
      description: 'Thanh toán bằng thẻ ngân hàng',
    },
  ];

  const handleConfirm = async () => {
    setIsProcessing(true);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-6 font-semibold transition"
          >
            <ChevronLeft size={20} />
            Quay lại
          </button>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-2">
            Chọn Phương Thức Thanh Toán
          </h1>
          <p className="text-lg text-text-muted">
            Chọn cách thức thanh toán phù hợp với bạn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2 space-y-4">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border bg-white hover:border-primary/50 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg transition-colors ${
                      selectedMethod === method.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-text-muted'
                    }`}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {method.name}
                    </h3>
                    <p className="text-text-muted text-sm">
                      {method.description}
                    </p>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* Security Info */}
            <div className="mt-8 p-6 bg-white rounded-2xl border-2 border-border">
              <div className="flex items-start gap-3">
                <Lock size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground mb-1">
                    Thanh Toán Được Bảo Vệ
                  </h4>
                  <p className="text-text-muted text-sm">
                    Tất cả giao dịch của bạn được mã hóa và bảo vệ bằng công nghệ SSL tiêu chuẩn ngành.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted text-sm mb-1">Nhận</p>
                    <p className="font-semibold text-foreground text-sm">
                      {new Date(searchData.checkIn).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-sm mb-1">Trả</p>
                    <p className="font-semibold text-foreground text-sm">
                      {new Date(searchData.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-text-muted text-sm mb-1">Khách</p>
                  <p className="font-semibold text-foreground">{bookingInfo.fullName}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 py-6 border-b-2 border-border">
                <div className="flex justify-between items-center">
                  <p className="text-text-muted text-sm">
                    {room.price.toLocaleString('vi-VN')}đ × {nights} đêm
                  </p>
                  <p className="font-semibold text-foreground">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-foreground font-bold">Tổng Cộng</p>
                  <p className="text-3xl font-bold text-primary">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`w-full px-6 py-4 font-bold rounded-lg transition-all duration-200 text-lg shadow-lg hover:shadow-xl ${
                  isProcessing
                    ? 'bg-text-muted text-white cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark'
                }`}
              >
                {isProcessing ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Phòng'}
              </button>

              <p className="text-xs text-text-muted text-center mt-4">
                Bằng cách xác nhận, bạn đồng ý với điều khoản dịch vụ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
