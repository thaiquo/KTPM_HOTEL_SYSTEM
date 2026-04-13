import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import { Wifi, Tv, Wind, Users, ArrowLeft } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { useAuth } from '../../../contexts/AuthContext';

export default function RoomDetailPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await roomApi.getById(id);
        setRoom(data);
      } catch (err) {
        console.error('Error fetching room:', err);
        setRoom(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <Spinner className="h-16 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold">
            <ArrowLeft size={18} />
            Quay lại danh sách phòng
          </Link>
          <div className="mt-8 bg-white rounded-xl shadow p-8 text-center">
            <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
            <p className="text-gray-600 mt-2">Vui lòng thử lại hoặc chọn phòng khác.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <Link to="/rooms" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold">
          <ArrowLeft size={18} />
          Quay lại danh sách phòng
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 overflow-hidden">
            <div className="h-80 bg-gray-200">
              <img
                src={room.images?.[0]}
                alt={room.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
                  <p className="text-gray-600 mt-1">Loại phòng: {room.type}</p>
                </div>
                <div className="shrink-0 bg-orange-500 text-white px-4 py-2 rounded-full font-semibold">
                  {room.price.toLocaleString('vi-VN')}đ / đêm
                </div>
              </div>

              <p className="text-gray-700 mt-5 leading-relaxed">{room.description}</p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="inline-flex items-center gap-2">
                  <Users size={16} />
                  <span>{room.maxGuests} khách</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wifi size={16} />
                  <span>WiFi</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Tv size={16} />
                  <span>TV</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wind size={16} />
                  <span>AC</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold">Tóm tắt</h2>
              <div className="mt-4 space-y-3 text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Giá</span>
                  <span className="font-semibold">{room.price.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tối đa</span>
                  <span className="font-semibold">{room.maxGuests} khách</span>
                </div>
              </div>

              <Button
                className="mt-6 w-full py-3"
                type="button"
                onClick={() => {
                  const bookingPath = `/booking?roomId=${encodeURIComponent(room.id)}`;
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=${encodeURIComponent(bookingPath)}`);
                    return;
                  }

                  navigate(bookingPath);
                }}
              >
                Đặt phòng
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
