import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowLeft, Hotel } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, roomApi } from '../../../services/api';
import type { Booking, Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

type BookingWithRoom = Booking & { room?: Room | null };

const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

export default function MyBookingsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<BookingWithRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const created = searchParams.get('created') === '1';

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setFetching(true);
      setError('');
      try {
        const list = await bookingApi.getByUser(user.id);

        const enriched = await Promise.all(
          list.map(async (b) => {
            try {
              const room = await roomApi.getById(b.roomId);
              return { ...b, room };
            } catch {
              return { ...b, room: null };
            }
          })
        );

        setItems(enriched);
      } catch (e) {
        console.error(e);
        setItems([]);
        setError('Không thể tải danh sách booking. Vui lòng thử lại.');
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [user]);

  const handleRetry = () => {
    if (!user) return;
    setFetching(true);
    setError('');

    bookingApi
      .getByUser(user.id)
      .then(async (list) => {
        const enriched = await Promise.all(
          list.map(async (b) => {
            try {
              const room = await roomApi.getById(b.roomId);
              return { ...b, room };
            } catch {
              return { ...b, room: null };
            }
          })
        );
        setItems(enriched);
      })
      .catch((e) => {
        console.error(e);
        setItems([]);
        setError('Không thể tải danh sách booking. Vui lòng thử lại.');
      })
      .finally(() => setFetching(false));
  };

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold">
            <ArrowLeft size={18} />
            Trang chủ
          </Link>
          <Link to="/rooms" className="text-sm text-gray-600 hover:text-gray-900">
            Tiếp tục tìm phòng
          </Link>
        </div>

        <Card className="mt-6">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Phòng đã đặt</h1>
            <p className="text-gray-600 mt-1">Danh sách booking của bạn (tạm thời bỏ qua thanh toán).</p>

            {created && !error && (
              <Alert className="mt-4">
                Đặt phòng thành công. Booking của bạn đã được tạo.
              </Alert>
            )}

            {error && (
              <Alert variant="error" className="mt-4 flex items-center justify-between gap-4">
                <span>{error}</span>
                <Button variant="outline" onClick={handleRetry}>
                  Thử lại
                </Button>
              </Alert>
            )}
          </div>

          {fetching ? (
            <div className="p-10 text-center text-gray-600">
              <Spinner className="h-8 w-8" />
              <div className="mt-3">Đang tải dữ liệu...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <Hotel size={20} />
              </div>
              <p className="mt-4 text-gray-900 font-semibold">
                {error ? 'Chưa thể tải booking' : 'Bạn chưa có booking nào'}
              </p>
              <p className="text-gray-600 mt-1">Hãy tìm một phòng phù hợp và đặt ngay.</p>
              <Link
                to="/rooms"
                className="inline-flex mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
              >
                Tìm phòng
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((b) => {
                const nights = getNights(b.checkIn, b.checkOut);

                return (
                  <div key={b.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">#{b.id}</div>
                        <div className="font-semibold text-gray-900">
                          {b.room?.name || `Phòng ${b.roomId}`}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {b.checkIn} → {b.checkOut}
                          {nights > 0 ? ` · ${nights} đêm` : ''}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Tổng: {Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ · Trạng thái: {b.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`/rooms/${b.roomId}`}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition"
                      >
                        Xem phòng
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
