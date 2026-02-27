import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
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
    <section className="relative h-[700px] w-full">
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
      <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-white px-4 z-10">
        <h1 className="text-5xl font-bold mb-4 text-center">
          Trải nghiệm lưu trú đẳng cấp
        </h1>
        <p className="text-xl mb-10 text-center">
          Khám phá không gian riêng tư, sang trọng
        </p>

        <div className="w-full max-w-6xl">
          <SearchBox />
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;