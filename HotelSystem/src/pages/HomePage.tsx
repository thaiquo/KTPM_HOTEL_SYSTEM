import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { roomApi } from '../services/api';
import type { Room } from '../types';
import HeroCarousel from '../components/HeroCarousel';
import { Card, CardImage, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Rating } from '../components/ui/Rating';

import {
  Heart,
  Star,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Shield,
  Clock,
  Zap,
  Shield as SecureIcon,
  BookOpen,
} from 'lucide-react';

const HomePage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomList = await roomApi.getAll();
        setRooms(roomList.slice(0, 6));
      } catch (error) {
        console.error(error);
        setRooms([
          {
            id: '1',
            name: 'Phòng Deluxe',
            type: 'Deluxe',
            price: 500000,
            maxGuests: 2,
            images: [
              'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
            ],
            amenities: ['WiFi', 'TV', 'AC'],
            description: 'Phòng sang trọng với đầy đủ tiện nghi hiện đại',
            available: true,
          },
          {
            id: '2',
            name: 'Phòng VIP',
            type: 'VIP',
            price: 800000,
            maxGuests: 4,
            images: [
              'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            ],
            amenities: ['WiFi', 'TV', 'AC'],
            description: 'Phòng VIP cao cấp với view đẹp',
            available: true,
          },
          {
            id: '3',
            name: 'Phòng Suite',
            type: 'Suite',
            price: 1200000,
            maxGuests: 4,
            images: [
              'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
            ],
            amenities: ['WiFi', 'TV', 'AC'],
            description: 'Phòng Suite đẳng cấp 5 sao',
            available: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* ===== HERO SECTION ===== */}
      <HeroCarousel />

      {/* ===== MAIN CONTENT ===== */}
      <main className="w-full">
        {/* Highlights Section */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <Badge variant="primary" size="md">Tại sao chọn S-T-T</Badge>
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
                Trải Nghiệm Lưu Trú Đẳng Cấp
              </h2>
              <p className="text-lg text-text-muted max-w-2xl mx-auto">
                Khám phá sự kết hợp hoàn hảo giữa sang trọng, riêng tư và dịch vụ tuyệt vời
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Heart size={28} className="text-primary" />}
                title="Thiết Kế Sang Trọng"
                description="Không gian được trang trí tinh tế với những chi tiết cao cấp"
              />
              <FeatureCard
                icon={<Star size={28} className="text-primary" />}
                title="Dịch Vụ 5 Sao"
                description="Đội ngũ tận tâm phục vụ 24/7 với chuyên nghiệp"
              />
              <FeatureCard
                icon={<SecureIcon size={28} className="text-primary" />}
                title="An Toàn & Riêng Tư"
                description="Hệ thống bảo mật hiện đại, đảm bảo tuyệt đối"
              />
            </div>
          </div>
        </section>

        {/* Featured Rooms Section */}
        <section className="py-16 lg:py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <Badge variant="secondary" size="md">Phòng Nổi Bật</Badge>
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
                Các Phòng Tuyệt Vời
              </h2>
              <p className="text-lg text-text-muted max-w-2xl mx-auto">
                Lựa chọn từ bộ sưu tập phòng cao cấp của chúng tôi
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                  {rooms.map((room) => (
                    <Link
                      key={room.id}
                      to={`/rooms/${room.id}`}
                      className="h-full"
                    >
                      <Card hover variant="elevated" className="h-full flex flex-col overflow-hidden">
                        <CardImage>
                          <img
                            src={room.images[0]}
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                          <div className="absolute top-4 right-4 z-10">
                            <Badge variant="primary" size="md">
                              {room.price.toLocaleString('vi-VN')}đ
                            </Badge>
                          </div>
                          <div className="absolute bottom-4 left-4 z-10">
                            <Badge variant="secondary" size="md">
                              {room.type}
                            </Badge>
                          </div>
                        </CardImage>
                        <CardContent className="flex-grow flex flex-col">
                          <CardHeader>
                            <CardTitle>{room.name}</CardTitle>
                            <CardDescription>{room.description}</CardDescription>
                          </CardHeader>
                          <div className="mt-auto pt-4">
                            <div className="flex gap-4 text-text-muted text-sm mb-4">
                              <div className="flex items-center gap-1">
                                <Wifi size={16} />
                              </div>
                              <div className="flex items-center gap-1">
                                <Tv size={16} />
                              </div>
                              <div className="flex items-center gap-1">
                                <Wind size={16} />
                              </div>
                            </div>
                            <Button className="w-full" variant="primary" size="md">
                              Xem chi tiết
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                <div className="text-center">
                  <Link to="/rooms">
                    <Button size="lg">
                      Xem Tất Cả Phòng
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 lg:py-24 bg-accent text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold">
                Tại Sao Chọn S-T-T?
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Chúng tôi cung cấp những trải nghiệm không quên
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <WhyCard icon={<Clock size={32} />} title="Phục vụ 24/7" description="Hỗ trợ bất cứ lúc nào" />
              <WhyCard icon={<SecureIcon size={32} />} title="An Toàn" description="Bảo mật tuyệt đối" />
              <WhyCard icon={<Zap size={32} />} title="WiFi Nhanh" description="Tốc độ cao, ổn định" />
              <WhyCard icon={<BookOpen size={32} />} title="Tiện Ích" description="Tất cả những gì bạn cần" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;

/* ===== SUB COMPONENTS ===== */

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: JSX.Element;
  title: string;
  description: string;
}) => (
  <Card variant="elevated" hover className="p-8 text-center">
    <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-primary/10 rounded-xl">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
    <p className="text-text-muted leading-relaxed">{description}</p>
  </Card>
);

const WhyCard = ({
  icon,
  title,
  description,
}: {
  icon: JSX.Element;
  title: string;
  description: string;
}) => (
  <div className="text-center space-y-4">
    <div className="w-16 h-16 mx-auto flex items-center justify-center bg-white/10 rounded-xl text-primary">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      <p className="text-white/70 text-sm">{description}</p>
    </div>
  </div>
);
