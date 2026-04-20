import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import { motion } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/effect-fade';
import SearchBox from './SearchBox';

const images = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1920',
];

const HeroCarousel = () => {
  return (
    <section className="relative w-full">
      <div className="relative h-screen w-full overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30" />
          <div className="absolute inset-0 [background:radial-gradient(900px_520px_at_15%_20%,rgba(255,106,0,0.14),transparent_60%)]" />

          <div className="relative h-full flex flex-col justify-end items-center px-8 md:px-20 pb-8">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="max-w-3xl text-center mb-12"
            >
              <div className="text-xs uppercase tracking-[0.5em] text-white/70 font-label">
                S-T-T Love Hotel
              </div>
              <h1 className="mt-4 font-headline text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-[0.92]">
                Sự Sang Trọng
                <br />
                <span className="text-primary-fixed-dim italic">Thầm Lặng</span>
              </h1>
              <p className="mt-6 text-white/70 max-w-md mx-auto text-lg font-light leading-relaxed">
                Khám phá không gian lưu trú tinh tế, nơi riêng tư và lãng mạn được đặt lên hàng đầu.
              </p>
            </motion.div>

            {/* Floating Search Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="w-full max-w-5xl"
            >
              <SearchBox />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
