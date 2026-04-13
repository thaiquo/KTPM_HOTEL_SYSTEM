import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import HeroCarousel from '../components/HeroCarousel';
import Card from '../../../shared/components/ui/Card';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';

import {
  Heart,
  Star,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Shield,
  Clock,
} from 'lucide-react';

const HomePage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const roomList = await roomApi.getAll();
      setRooms(roomList.slice(0, 6));
    } catch (error) {
      console.error(error);
      setRooms([]);
      setError('Không thể tải danh sách phòng nổi bật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {/* ===== HERO (full width) ===== */}
      <div className="w-full">
        <HeroCarousel />
      </div>

      {/* ===== CONTENT WRAPPER (CENTER) ===== */}
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* ===== FEATURES ===== */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
            Những trải nghiệm lưu trú mới
          </h2>
          <p className="text-center text-gray-600 mb-12">S-T-T</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Feature
              icon={<Heart size={30} className="text-red-500" />}
              title="Thiết kế hiện đại"
              desc="Không gian tinh tế, sang trọng với tiện nghi cao cấp"
            />
            <Feature
              icon={<Star size={30} className="text-orange-500" />}
              title="Dịch vụ 5 sao"
              desc="Đội ngũ nhân viên tận tâm phục vụ 24/7"
            />
            <Feature
              icon={<Shield size={30} className="text-blue-500" />}
              title="An toàn & Riêng tư"
              desc="Đảm bảo sự riêng tư tuyệt đối"
            />
          </div>
        </section>

        {/* ===== ROOMS ===== */}
        <section className="py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Phòng nổi bật
          </h2>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-12 w-12" />
            </div>
          ) : error ? (
            <Card className="p-8 rounded-xl text-center">
              <p className="text-gray-700 font-semibold">{error}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button onClick={fetchRooms}>Thử lại</Button>
                <Link to="/rooms" className="text-orange-600 font-semibold hover:text-orange-700">
                  Xem tất cả phòng
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/rooms/${room.id}`}
                  className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition group"
                >
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src={room.images[0]}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                    <span className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      {room.price.toLocaleString('vi-VN')}đ / đêm
                    </span>
                  </div>

                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {room.description}
                    </p>

                    <div className="flex justify-center gap-6 text-gray-600 text-sm mb-4">
                      <IconText icon={<Wifi size={16} />} text="WiFi" />
                      <IconText icon={<Tv size={16} />} text="TV" />
                      <IconText icon={<Wind size={16} />} text="AC" />
                    </div>

                    <div className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition font-semibold">
                      Xem chi tiết
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <br />
          <div className="text-center mt-80 mb-20">
            <Link
              to="/rooms"
              className="inline-block bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition font-semibold"
            >
              Xem tất cả phòng
            </Link>
          </div>
        </section>
      </div>
      <br />

      <section className="w-full py-16 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-5">
            HÃY ĐẾN VỚI CHÚNG TÔI
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 place-items-center mt-12">
            <Why icon={<Clock size={32} />} title="Phục vụ 24/7" desc="Phục vụ mọi lúc" />
            <Why icon={<Shield size={32} />} title="An toàn" desc="Bảo mật" />
            <Why icon={<Wifi size={32} />} title="WiFi mạnh" desc="Tốc độ cao" />
            <Why icon={<Coffee size={32} />} title="Tiện ích" desc="Cao cấp" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

/* ===== SUB COMPONENT ===== */

const Feature = ({
  icon,
  title,
  desc,
}: {
  icon: JSX.Element;
  title: string;
  desc: string;
}) => (
  <Card className="p-8 rounded-xl hover:shadow-xl transition text-center">
    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-600">{desc}</p>
  </Card>
);

const IconText = ({
  icon,
  text,
}: {
  icon: JSX.Element;
  text: string;
}) => (
  <div className="flex items-center gap-1">
    {icon}
    <span>{text}</span>
  </div>
);

const Why = ({
  icon,
  title,
  desc,
}: {
  icon: JSX.Element;
  title: string;
  desc: string;
}) => (
  <div className="text-center max-w-xs">
    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow text-orange-500">
      {icon}
    </div>
    <h3 className="font-bold mb-1">{title}</h3>
    <p className="text-gray-600 text-sm">{desc}</p>
  </div>
);
