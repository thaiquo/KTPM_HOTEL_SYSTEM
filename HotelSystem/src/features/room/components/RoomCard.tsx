import { Link } from 'react-router-dom';
import { ChevronRight, Tv, Users, Wifi, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Room } from '../../../types';
import { cn } from '../../../shared/lib/cn';

type RoomCardProps = {
  room: Room;
  className?: string;
};

export default function RoomCard({ room, className }: RoomCardProps) {
  const imageUrl = room.images?.[0];

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to={`/rooms/${room.id}`}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all duration-500 hover:shadow-xl',
          className
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="md:col-span-2 relative min-h-56 overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={room.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full bg-gray-100" />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/0 to-black/60" />

            <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-bold tracking-widest text-white">
              {room.type}
            </div>

            <div className="absolute right-4 top-4 inline-flex items-center rounded-full bg-[#d4af37] px-3 py-1 text-xs font-extrabold tracking-tight text-black shadow-lg">
              {room.price.toLocaleString('vi-VN')}đ
            </div>
          </div>

          <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-between gap-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
                TriStar Collection
              </div>
              <h3 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-[#111]">
                {room.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a5a5a] line-clamp-2">
                {room.description || "Tận hưởng không gian sang trọng và riêng tư với đầy đủ tiện nghi cao cấp."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-[#5a5a5a]">
                <div className="inline-flex items-center gap-2">
                  <Users size={16} className="text-[#d4af37]" />
                  <span>{room.maxGuests} khách</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wifi size={16} className="text-[#d4af37]" />
                  <span>WiFi miễn phí</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Tv size={16} className="text-[#d4af37]" />
                  <span>Smart TV</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wind size={16} className="text-[#d4af37]" />
                  <span>Điều hòa</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-5">
              <div className="text-sm font-medium text-[#5a5a5a]">
                Giá mỗi <span className="font-bold text-[#141414]">đêm</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-none bg-[#0f0f0f] px-6 py-2.5 text-sm font-bold text-[#d4af37] transition-colors group-hover:bg-[#d4af37] group-hover:text-black">
                  Xem chi tiết
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
