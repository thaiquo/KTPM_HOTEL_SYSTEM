import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import { motion } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/effect-fade';

const images = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1920',
];

const HeroCarousel = () => {
  return (
    <section className="relative w-full">
      <div className="relative h-[72vh] min-h-[520px] w-full overflow-hidden">
        <Swiper
          modules={[Autoplay, EffectFade]}
          autoplay={{ delay: 5000 }}
          effect="fade"
          loop
          className="h-full"
        >
          {images.map((img, index) => (
            <SwiperSlide key={index}>
              <div
                className="h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Overlay */}
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/75" />
          <div className="absolute inset-0 [background:radial-gradient(900px_520px_at_18%_20%,rgba(212,175,55,0.18),transparent_60%)]" />

          <div className="container-custom flex h-full items-end pb-16">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="text-xs uppercase tracking-[0.52em] text-[#d4af37] font-semibold">
                TriStar Hotel
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
                TriStar Hotel - Không gian riêng tư, đẳng cấp
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
                Trải nghiệm lưu trú hiện đại, tinh tế và tuyệt đối riêng tư ngay tại trung tâm TP. Hồ Chí Minh.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
