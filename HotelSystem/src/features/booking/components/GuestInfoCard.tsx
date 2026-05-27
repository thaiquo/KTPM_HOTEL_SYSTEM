import { Mail, Phone, UserRound } from 'lucide-react';

import type { BookingWithRoom } from './bookingHistoryView';
import {
  getBookingGuestNames,
  getBookingRepresentative,
  getBookingRooms,
  getGuestsForRoom,
  getRoomRepresentative,
  getSpecialRequestText,
} from './bookingHistoryView';

type GuestInfoCardProps = {
  booking: BookingWithRoom;
};

export default function GuestInfoCard({ booking }: GuestInfoCardProps) {
  const representative = getBookingRepresentative(booking);
  const guests = getBookingGuestNames(booking);
  const rooms = getBookingRooms(booking);

  return (
    <div className="border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]" style={{ borderRadius: '2rem' }}>
      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Thông tin khách hàng</div>
      <h4 className="mt-3 text-xl font-black text-slate-950">Người đặt booking</h4>

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
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Người đại diện theo từng phòng</div>
        <div className="mt-3 space-y-3">
          {rooms.length > 0 ? rooms.map((room) => {
            const roomRepresentative = getRoomRepresentative(booking, room.id);
            const roomGuests = getGuestsForRoom(booking, room.id);
            const companions = roomGuests.filter((guest) => guest.id !== roomRepresentative?.id);
            return (
              <div key={room.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-black text-slate-950">Phòng {room.roomNumber || room.id}</div>
                  <div className="text-xs font-bold text-slate-500">{room.roomType?.type || 'Phòng'}</div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <div><span className="font-black text-slate-900">Đại diện:</span> {roomRepresentative?.fullName || '-'}</div>
                  <div><span className="font-black text-slate-900">SĐT:</span> {roomRepresentative?.phone || '-'}</div>
                  <div><span className="font-black text-slate-900">CCCD/Passport:</span> {roomRepresentative?.cccd || roomRepresentative?.passport || '-'}</div>
                  <div><span className="font-black text-slate-900">Ngày sinh:</span> {roomRepresentative?.dateOfBirth || '-'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {companions.length > 0 ? companions.map((guest) => (
                    <span
                      key={guest.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      {guest.fullName}
                    </span>
                  )) : (
                    <span className="text-xs font-medium text-slate-500">Chưa có khách đi cùng.</span>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-medium text-slate-500">
              {guests.length > 0 ? 'Dữ liệu khách đã có nhưng chưa tách được theo phòng.' : 'Chưa có dữ liệu khách lưu trú.'}
            </div>
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
