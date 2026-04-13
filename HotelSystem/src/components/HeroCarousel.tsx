import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import SearchBox from './SearchBox';

const images = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1920&h=1080&fit=crop',
];

const HeroCarousel = () => {
  return (
    <section className="relative h-screen max-h-[700px] lg:max-h-screen w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        effect="fade"
        loop
        pagination={{ clickable: true, dynamicBullets: true }}
        className="h-full w-full"
      >
        {images.map((img, index) => (
          <SwiperSlide key={index}>
            <div
              className="h-full w-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${img})` }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Premium Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50 z-10" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center px-4 z-20">
        <div className="max-w-2xl text-center space-y-6 animate-fade-in">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            Trải Nghiệm <span className="text-primary">Đẳng Cấp</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-white/90 font-light">
            Khám phá không gian riêng tư, sang trọng và thoải mái tại S-T-T Love Hotel
          </p>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-6xl mt-12 animate-slide-up">
          <SearchBox />
        </div>
      </div>

      {/* Decorative Elements */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s both;
        }
        
        .swiper-pagination-bullet {
          background-color: rgba(255, 255, 255, 0.5) !important;
          opacity: 1 !important;
        }
        
        .swiper-pagination-bullet-active {
          background-color: var(--color-primary) !important;
        }
      `}</style>
    </section>
  );
};

export default HeroCarousel;
