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
          'group relative overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-low shadow-xl hover:shadow-2xl hover:shadow-primary-container/10 transition-shadow duration-500',
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
              <div className="h-full w-full bg-surface-container-high" />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/0 to-black/60" />

            <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-bold tracking-widest text-white">
              {room.type}
            </div>

            <div className="absolute right-4 top-4 inline-flex items-center rounded-full bg-gradient-to-br from-primary to-primary-container px-3 py-1 text-xs font-extrabold tracking-tight text-on-primary-container shadow-lg shadow-primary-container/15">
              {room.price.toLocaleString('vi-VN')}đ
            </div>
          </div>

          <div className="md:col-span-3 p-6 md:p-7 flex flex-col justify-between gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-on-surface-variant font-label">
                Noir Luxe Collection
              </div>
              <h3 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                {room.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant line-clamp-2">
                {room.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                <div className="inline-flex items-center gap-2">
                  <Users size={16} className="text-primary-fixed-dim" />
                  <span>{room.maxGuests} khách</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wifi size={16} className="text-primary-fixed-dim" />
                  <span>WiFi</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Tv size={16} className="text-primary-fixed-dim" />
                  <span>TV</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wind size={16} className="text-primary-fixed-dim" />
                  <span>AC</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">/ đêm</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl bg-primary-container text-on-primary-container px-5 py-2.5 text-sm font-bold transition-all group-hover:shadow-md group-hover:shadow-primary-container/20">
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
