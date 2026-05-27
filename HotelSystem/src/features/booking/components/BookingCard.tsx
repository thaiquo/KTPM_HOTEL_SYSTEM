import { Calendar, ChevronRight, Clock, CreditCard, MapPin, Trash2 } from 'lucide-react';

import Card from '../../../shared/components/ui/Card';
import { cn } from '../../../shared/lib/cn';
import { canRequestBookingCancel } from '../utils/bookingHistory';
import type { BookingWithRoom } from './bookingHistoryView';
import {
  HOTEL_LOCATION_LABEL,
  formatCurrency,
  getBookingRepresentative,
  getBookingRoomPreview,
  getBookingStatusLabel,
  getBookingThumbnail,
  getDisplayBookingStatus,
  getDisplayPaymentMethod,
  getNights,
  getStatusTone,
} from './bookingHistoryView';

type BookingCardProps = {
  booking: BookingWithRoom;
  onOpenDetails: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
};

export default function BookingCard({ booking, onOpenDetails, onCancel }: BookingCardProps) {
  const status = getDisplayBookingStatus(booking);
  const tone = getStatusTone(status);
  const representative = getBookingRepresentative(booking);
  const roomPreview = getBookingRoomPreview(booking);

  return (
    <Card className="group overflow-hidden rounded-4xl border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="relative h-64 overflow-hidden bg-zinc-100">
          <img
            src={getBookingThumbnail(booking)}
            alt={`Booking ${booking.id}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute left-5 top-5 flex flex-wrap items-center gap-3">
            <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]', tone.badge)}>
              {getBookingStatusLabel(booking)}
            </span>
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/72">Booking #{booking.id}</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-white">
              {formatCurrency(booking.totalPrice || 0)}
            </div>
            <div className="mt-1 text-sm font-medium text-white/72">Tổng giá trị đơn đặt</div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Đơn đặt phòng</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {roomPreview.count} phòng đã đặt
              </h2>
              <div className="mt-4 space-y-2">
                {roomPreview.primary.map((title) => (
                  <div key={title} className="text-lg font-semibold text-slate-800">
                    {title}
                  </div>
                ))}
                {roomPreview.extraCount > 0 && (
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                    +{roomPreview.extraCount} phòng khác
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
              <div className="rounded-3xl bg-[#f6f3ed] px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Người đặt booking</div>
                <div className="mt-2 text-sm font-black text-slate-900">{representative.name}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{representative.phone}</div>
              </div>
              <div className="rounded-3xl bg-[#f7f7f8] px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Thanh toán</div>
                <div className="mt-2 text-sm font-black text-slate-900">{getDisplayPaymentMethod(booking)}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{getBookingStatusLabel(booking)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Check-in</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{booking.checkIn}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Lưu trú</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {booking.checkOut} · {getNights(booking.checkIn, booking.checkOut)} đêm
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Số phòng</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{roomPreview.count} phòng</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Địa điểm</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{HOTEL_LOCATION_LABEL}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className={cn('h-2.5 w-2.5 rounded-full', tone.accent)} />
              Booking #{booking.id} đang được hiển thị theo mô hình nhiều phòng
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canRequestBookingCancel(booking) && (
                <button
                  type="button"
                  onClick={() => onCancel(booking.id)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                  Hủy booking
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenDetails(booking.id)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
              >
                Xem chi tiết
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
