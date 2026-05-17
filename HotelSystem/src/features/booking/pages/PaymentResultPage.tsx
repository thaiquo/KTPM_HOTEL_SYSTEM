import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';

export default function PaymentResultPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { clearCart } = useCart();
  const hasCleared = useRef(false);

  const code = searchParams.get('code');
  const bookingId = searchParams.get('bookingId');
  const paymentType = searchParams.get('paymentType');
  const success = code === '00';

  useEffect(() => {
    if (success && !hasCleared.current) {
      clearCart();
      hasCleared.current = true;
    }
  }, [success, clearCart]);

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background py-16 pb-32">
      <div className="mx-auto max-w-2xl px-6">
        <Card className="p-10 text-center border-outline-variant/10 shadow-xl">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            success ? 'bg-green-500/10 text-green-600' : 'bg-error/10 text-error'
          }`}>
            {success ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-on-surface font-headline">
            {success ? 'Thanh toán thành công!' : 'Thanh toán chưa thành công'}
          </h1>
          <p className="mt-3 text-on-surface-variant font-medium">
            {success
              ? paymentType === 'DEPOSIT'
                ? 'Booking của bạn đã được ghi nhận đã cọc 50%. Vui lòng thanh toán phần còn lại khi nhận phòng.'
                : 'Booking của bạn đã được xác nhận đầy đủ. Hẹn gặp bạn!'
              : 'Booking chưa được xác nhận. Vui lòng thử lại hoặc chọn phòng khác.'}
          </p>

          {bookingId && (
            <div className="mt-6 rounded-2xl bg-surface-container-high px-5 py-4 text-sm font-bold text-on-surface-variant">
              Booking #{bookingId}
            </div>
          )}

          {success && bookingId && (
            <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-left">
              <div className="text-sm font-black text-on-surface">Hoàn tất thông tin để check-in nhanh</div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-on-surface-variant">
                Bạn có thể bổ sung CCCD/hộ chiếu trước khi đến khách sạn. Thông tin này là tùy chọn và khách sạn vẫn sẽ kiểm tra giấy tờ gốc khi nhận phòng.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/my-bookings">
              <Button className="w-full sm:w-auto rounded-2xl px-8">Xem booking của tôi</Button>
            </Link>
            <Link to="/rooms">
              <Button variant="outline" className="w-full sm:w-auto rounded-2xl px-8">Tìm phòng khác</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
