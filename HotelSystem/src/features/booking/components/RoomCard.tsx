import { Bath, BedDouble, Coffee, MonitorSmartphone, Trees, Users, Wifi, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../shared/lib/cn';
import type { BookingWithRoom } from './bookingHistoryView';
import {
  formatCurrency,
  getDisplayBookingStatus,
  getRoomAmenityLabels,
  getRoomDisplayName,
  getRoomHeroImage,
  getRoomLabel,
  getRoomMetaLine,
  getRoomPricing,
  getRoomStatusText,
  getStatusTone,
} from './bookingHistoryView';

type RoomCardProps = {
  booking: BookingWithRoom;
  room: NonNullable<BookingWithRoom['rooms']>[number];
};

const amenityIcons: Record<string, ReactNode> = {
  Wifi: <Wifi size={14} />,
  'Smart TV': <MonitorSmartphone size={14} />,
  'Mini Bar': <Coffee size={14} />,
  Bathtub: <Bath size={14} />,
  Balcony: <Trees size={14} />,
  Breakfast: <Coffee size={14} />,
  'Air Conditioner': <Wind size={14} />,
  Workspace: <BedDouble size={14} />,
  'Coffee Machine': <Coffee size={14} />,
};

export default function RoomCard({ booking, room }: RoomCardProps) {
  const pricing = getRoomPricing(booking, room);
  const roomStatus = getRoomStatusText(booking);
  const tone = getStatusTone(getDisplayBookingStatus(booking));
  const amenityLabels = getRoomAmenityLabels(room);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="relative h-60 overflow-hidden bg-slate-100">
        <img
          src={getRoomHeroImage(room)}
          alt={getRoomDisplayName(room)}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-5 top-5 inline-flex rounded-full bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700 backdrop-blur">
          {getRoomLabel(room)}
        </div>
        <div className={cn('absolute right-5 top-5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]', tone.badge)}>
          {roomStatus}
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/72">Loại phòng</div>
          <h4 className="mt-2 text-2xl font-black tracking-tight text-white">{getRoomDisplayName(room)}</h4>
          <p className="mt-2 text-sm font-medium text-white/80">{getRoomMetaLine(room)}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">View phòng</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{room.viewType}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Sức chứa</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users size={14} />
              {room.maxCapacity} khách
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Diện tích</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{room.areaM2} m2</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Giá mỗi đêm</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(pricing.nightlyPrice)}</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Số đêm</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{pricing.nights} đêm</div>
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Giá phòng</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(room.roomType.basePrice)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Thành tiền</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(pricing.total)}</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Tiện nghi</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {amenityLabels.length > 0 ? amenityLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                {amenityIcons[label] || <BedDouble size={14} />}
                {label}
              </span>
            )) : (
              <span className="text-sm font-medium text-slate-500">Tiện nghi đang được cập nhật.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
