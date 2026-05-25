import { Mail, Phone, UserRound } from 'lucide-react';

import type { BookingWithRoom } from './bookingHistoryView';
import {
  getBookingGuestNames,
  getBookingRepresentative,
  getSpecialRequestText,
} from './bookingHistoryView';

type GuestInfoCardProps = {
  booking: BookingWithRoom;
};

export default function GuestInfoCard({ booking }: GuestInfoCardProps) {
  const representative = getBookingRepresentative(booking);
  const guests = getBookingGuestNames(booking);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Thông tin khách hàng</div>
      <h4 className="mt-3 text-xl font-black text-slate-950">Người đại diện đặt phòng</h4>

      <div className="mt-5 rounded-3xl bg-slate-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            <UserRound size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-950">{representative.name}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Mail size={14} />
              <span className="break-all">{representative.email}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Phone size={14} />
              <span>{representative.phone}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">Ngày sinh: {representative.dateOfBirth}</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Danh sách khách lưu trú</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {guests.length > 0 ? guests.map((guest) => (
            <span
              key={guest}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              {guest}
            </span>
          )) : (
            <span className="text-sm font-medium text-slate-500">Chưa có dữ liệu khách lưu trú.</span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Ghi chú đặc biệt</div>
        <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-relaxed text-slate-700">
          {getSpecialRequestText(booking)}
        </div>
      </div>
    </div>
  );
}
