import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock3,
  Gem,
  Lock,
  Phone,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';

import { roomApi } from '../../../services/api';
import type { Room } from '../../../types';
import HeroCarousel from '../components/HeroCarousel';
import SearchBox from '../components/SearchBox';
import Card from '../../../shared/components/ui/Card';
import Spinner from '../../../shared/components/ui/Spinner';
import Button from '../../../shared/components/ui/Button';

const whyCards = [
  {
    icon: Lock,
    title: 'Không gian riêng tư',
    description:
      'Mỗi phòng được thiết kế tối ưu để đảm bảo sự riêng tư tuyệt đối, cách âm tốt và bố trí tinh tế, mang đến cho bạn và người thân không gian thư giãn yên tĩnh, kín đáo ngay giữa lòng thành phố.',
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
  },
  {
    icon: Sparkles,
    title: 'Thiết kế tinh tế',
    description:
      'Không gian được chăm chút trong từng chi tiết với phong cách hiện đại, sang trọng và ấm cúng. Mỗi căn phòng là một trải nghiệm khác biệt, giúp bạn tận hưởng cảm giác thư thái và đẳng cấp.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&auto=format&fit=crop',
  },
  {
    icon: Gem,
    title: 'Tiện nghi cao cấp',
    description:
      'Trang bị đầy đủ tiện ích cao cấp như giường êm ái, điều hòa, TV thông minh, phòng tắm sang trọng và nhiều dịch vụ đi kèm, đáp ứng mọi nhu cầu nghỉ ngơi và giải trí của bạn.',
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200',
  },
  {
    icon: Clock3,
    title: 'Check-in linh hoạt',
    description:
      'Quy trình nhận và trả phòng nhanh chóng, tiện lợi với nhiều khung giờ linh hoạt. Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn có trải nghiệm thuận tiện và thoải mái nhất.',
    image:
      'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=1200',
  },
];

const galleryImages = [
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1400',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1400',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1400',
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1400',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1400',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1400',
];

const fallbackImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200';

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
    } catch (err) {
      console.error(err);
      setRooms([]);
      setError('Không thể tải danh sách phòng nổi bật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="w-full bg-[#f7f7f7] text-[#141414]">
      <a href="tel:0925519789" className="fixed bottom-8 left-6 z-40" aria-label="Hotline">
        <div className="flex items-center gap-2 rounded-full border border-[#d4af37] bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-[#0f0f0f] shadow-lg transition-transform hover:scale-105">
          <Phone size={15} />
          <span>092.5519.789</span>
        </div>
      </a>

      <HeroCarousel />

      <section className="mt-28 pb-24">
        <div className="container-custom">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xl md:p-8">
            <SearchBox />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-custom">
          <SectionHeading
            title="Vì sao chọn TriStar Hotel?"
            description="Không gian lưu trú riêng tư, hiện đại và được thiết kế để bạn tận hưởng trải nghiệm thoải mái nhất."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {whyCards.map((item, index) => (
              <FlipSquareCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                image={item.image}
                delay={index * 0.08}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-custom">
          <SectionHeading
            title="Phòng nổi bật tại TriStar"
            description="Khám phá các loại phòng được yêu thích nhất tại TriStar Hotel."
          />

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-10 w-10" />
            </div>
          ) : error ? (
            <Card className="mt-8 rounded-2xl border border-red-200 p-8 text-center">
              <p className="font-semibold text-red-700">{error}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button onClick={fetchRooms}>Thử lại</Button>
                <Link to="/rooms" className="font-semibold text-[#0f0f0f] underline">
                  Xem tất cả phòng
                </Link>
              </div>
            </Card>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, idx) => (
                <motion.article
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.08 }}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <img
                    src={room.images?.[0] || fallbackImage}
                    alt={room.name}
                    className="h-56 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-[#141414]">{room.name}</h3>
                    <p className="mt-2 text-sm text-[#5a5a5a]">Loại phòng: {room.type}</p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div className="text-lg font-extrabold text-[#0f0f0f]">
                        {room.price.toLocaleString('vi-VN')}đ
                        <span className="ml-1 text-sm font-medium text-[#666]">/ đêm</span>
                      </div>
                      <Link to={`/rooms/${room.id}`}>
                        <Button className="rounded-none border border-[#d4af37] bg-[#d4af37] px-4 py-2 font-bold text-[#0f0f0f] transition-all hover:brightness-110">
                          Xem chi tiết
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20" id="gallery">
        <div className="container-custom">
          <SectionHeading
            title="Hình ảnh khách sạn"
            description="Không gian thực tế được chọn lọc để bạn dễ hình dung trải nghiệm tại TriStar."
          />

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {galleryImages.map((src, idx) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className={`overflow-hidden rounded-2xl ${idx === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <img
                  src={src}
                  alt={`TriStar ${idx + 1}`}
                  className="h-full min-h-44 w-full object-cover transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-black to-[#1a1a1a] py-20 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-black md:text-4xl">Sẵn sàng trải nghiệm TriStar?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/75 md:text-lg">
            Đặt phòng ngay hôm nay để tận hưởng không gian riêng tư, hiện đại và sang trọng tại TriStar Hotel.
          </p>
          <Link
            to="/rooms"
            className="mt-8 inline-flex items-center justify-center rounded-none bg-[#d4af37] px-8 py-3 text-base font-extrabold text-black transition hover:brightness-110"
          >
            Đặt phòng ngay
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

const SectionHeading = ({
  title,
  description,
  dark,
}: {
  title: string;
  description: string;
  dark?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="mb-16 text-center"
  >
    <h2 className={`text-3xl font-black tracking-tight md:text-4xl ${dark ? 'text-white' : 'text-[#121212]'}`}>
      {title}
    </h2>
    <p className={`mx-auto mt-4 max-w-2xl text-base leading-relaxed md:text-lg ${dark ? 'text-white/70' : 'text-[#575757]'}`}>
      {description}
    </p>
  </motion.div>
);

const FlipSquareCard = ({
  icon: Icon,
  title,
  description,
  image,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.45, delay }}
    className="group transition hover:scale-[1.02] [perspective:1000px]"
  >
    <div className="relative aspect-square w-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
      <div className="absolute inset-0 rounded-2xl border border-black/10 bg-white p-6 shadow-md transition-all duration-300 group-hover:shadow-xl [backface-visibility:hidden]">
        <div className="flex h-full flex-col items-center justify-between text-center">
          <div className="flex w-full items-center justify-between">
            <div className="inline-flex rounded-full bg-[#0f0f0f] p-3 text-[#d4af37]">
              <Icon size={24} />
            </div>
            <Star size={18} className="text-[#d4af37]" />
          </div>
          <div className="space-y-3 px-2">
            <h3 className="whitespace-nowrap text-[clamp(1rem,1.35vw,1.45rem)] font-black text-[#111]">
              {title}
            </h3>
          </div>
          <div className="h-28 w-full overflow-hidden rounded-xl">
            <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 rounded-2xl border border-[#d4af37]/25 bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.08)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="inline-flex rounded-full bg-[#0f0f0f] p-3 text-[#d4af37]">
            <Icon size={24} />
          </div>
          <h3 className="mt-4 whitespace-nowrap text-[clamp(1rem,1.35vw,1.45rem)] font-black text-[#111]">
            {title}
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-[#444]">{description}</p>
        </div>
      </div>
    </div>
  </motion.div>
);
