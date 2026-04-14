import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { ArrowLeft, Calendar, Users, BedDouble, CheckCircle2 } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Alert from '../../../shared/components/ui/Alert';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';

export default function BookingInfoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get('roomId') || '';
  const initialCheckIn = searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd');
  const initialCheckOut = searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [room, setRoom] = useState<Room | null>(null);
  const [fetchingRoom, setFetchingRoom] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    guests: 2,
    rooms: 1,
  });

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) {
        setRoom(null);
        setFetchingRoom(false);
        return;
      }

      setFetchingRoom(true);
      try {
        const data = await roomApi.getById(roomId);
        setRoom(data);
      } catch (e) {
        console.error(e);
        setRoom(null);
      } finally {
        setFetchingRoom(false);
      }
    };

    loadRoom();
  }, [roomId]);

  const nights = useMemo(() => {
    const n = differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [form.checkIn, form.checkOut]);

  const total = useMemo(() => {
    if (!room) return 0;
    return room.price * nights * (form.rooms || 1);
  }, [room, nights, form.rooms]);

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const canSubmit = !!room && nights > 0 && !submitting;

  const handleCreateBooking = async () => {
    if (!canSubmit || !room) return;
    setError('');
    setSubmitting(true);

    try {
      const roomId = Number(room.id);
      const userId = Number(user.id);

      if (!Number.isFinite(roomId) || !Number.isFinite(userId)) {
        throw new Error('Invalid roomId/userId');
      }

      await bookingApi.create({ roomId, userId, checkIn: form.checkIn, checkOut: form.checkOut });

      navigate('/my-bookings?created=1');
    } catch (e) {
      console.error(e);
      setError('Đặt phòng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={room ? `/rooms/${room.id}` : '/rooms'}
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Link>
          <Link
            to="/my-bookings"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Xem phòng đã đặt
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <h1 className="text-2xl font-bold text-gray-900">Xác nhận đặt phòng</h1>
              <p className="text-gray-600 mt-1">Thanh toán sau (khi trả phòng).</p>

              {error && (
                <Alert variant="error" className="mt-4">{error}</Alert>
              )}

              <div className="mt-6">
                {fetchingRoom ? (
                  <div className="py-10 text-center">
                    <Spinner className="h-10 w-10" />
                  </div>
                ) : !room ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">Không tìm thấy thông tin phòng.</p>
                    <Link to="/rooms" className="inline-block mt-4 text-orange-600 font-semibold">
                      Quay lại danh sách phòng
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                    <div className="md:col-span-2 rounded-xl overflow-hidden bg-gray-100">
                      <img src={room.images?.[0]} alt={room.name} className="w-full h-48 object-cover" />
                    </div>
                    <div className="md:col-span-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold">{room.name}</h2>
                          <p className="text-gray-600">{room.type}</p>
                        </div>
                        <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-semibold">
                          {room.price.toLocaleString('vi-VN')}đ / đêm
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-2">
                            <Calendar size={16} />
                            Nhận phòng
                          </span>
                          <input
                            type="date"
                            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            value={form.checkIn}
                            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-2">
                            <Calendar size={16} />
                            Trả phòng
                          </span>
                          <input
                            type="date"
                            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            min={form.checkIn}
                            value={form.checkOut}
                            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-2">
                            <Users size={16} />
                            Số khách
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            value={form.guests}
                            onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-2">
                            <BedDouble size={16} />
                            Số phòng
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            value={form.rooms}
                            onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })}
                          />
                        </label>
                      </div>

                      <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={16} className="text-orange-600" />
                        <span>Miễn phí huỷ trong 1 giờ (demo).</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Summary */}
          <div className="lg:col-span-2">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold">Tóm tắt</h2>

              <div className="mt-4 space-y-3 text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Số đêm</span>
                  <span className="font-semibold">{nights}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Số phòng</span>
                  <span className="font-semibold">{form.rooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tổng tiền</span>
                  <span className="font-bold text-gray-900">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCreateBooking}
                disabled={!canSubmit}
                loading={submitting}
                className="mt-6 w-full py-3"
              >
                {submitting ? 'Đang đặt phòng...' : 'Xác nhận đặt phòng'}
              </Button>

              <p className="mt-3 text-xs text-gray-500">
                Tạm thời bỏ qua thanh toán: trạng thái booking sẽ là PENDING.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
