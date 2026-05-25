import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Clock3, MapPin, ShieldCheck, X } from 'lucide-react';

import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { CHECK_IN_TIME_LABEL, CHECK_OUT_TIME_LABEL } from '../../../shared/lib/bookingPricing';
import { cn } from '../../../shared/lib/cn';
import { canRequestBookingCancel } from '../utils/bookingHistory';
import GuestInfoCard from './GuestInfoCard';
import PaymentSummary from './PaymentSummary';
import RoomCard from './RoomCard';
import type { BookingWithRoom } from './bookingHistoryView';
import {
  HOTEL_LOCATION_LABEL,
  formatDateTime,
  getBookingStatusLabel,
  getBookingRooms,
  getCancellationPolicySummary,
  getDisplayBookingStatus,
  getNights,
  getSpecialRequestText,
  getStatusTone,
} from './bookingHistoryView';

type BookingDetailModalProps = {
  booking: BookingWithRoom | null;
  onClose: () => void;
  onCancel: (bookingId: string) => void;
};

export default function BookingDetailModal({ booking, onClose, onCancel }: BookingDetailModalProps) {
  if (!booking) return null;

  const status = getDisplayBookingStatus(booking);
  const tone = getStatusTone(status);
  const rooms = getBookingRooms(booking);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-90 flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.96 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="relative max-h-[94vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#f5f1ea] shadow-[0_40px_120px_rgba(15,23,42,0.32)]"
        >
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16),transparent_52%)]" />

          <div className="relative flex max-h-[94vh] flex-col">
            <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#f5f1ea]/92 px-5 py-5 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="pr-12">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-amber-700">Booking detail</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-3xl font-black tracking-tight text-slate-950">Booking #{booking.id}</h3>
                    <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]', tone.badge)}>
                      {getBookingStatusLabel(booking)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-5 text-sm font-medium text-slate-600">
                    <span>Tạo lúc {formatDateTime(booking.createdAt)}</span>
                    <span>{rooms.length || booking.items.length || 1} phòng</span>
                    <span>{getNights(booking.checkIn, booking.checkOut)} đêm lưu trú</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canRequestBookingCancel(booking) && (
                    <Button
                      variant="outline"
                      onClick={() => onCancel(booking.id)}
                      className="rounded-full border-rose-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-rose-700 hover:bg-rose-50"
                    >
                      Hủy booking
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    aria-label="Đóng modal booking detail"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
              {!booking.detailsLoaded ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/75">
                  <Spinner className="h-12 w-12" />
                  <div className="mt-4 text-sm font-bold text-slate-600">Đang đồng bộ thông tin phòng và khách lưu trú...</div>
                </div>
              ) : (
                <div className="space-y-8">
                  <section>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Danh sách phòng đã đặt</div>
                        <h4 className="mt-2 text-2xl font-black text-slate-950">Phòng trong booking #{booking.id}</h4>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                      {rooms.length > 0 ? rooms.map((room) => (
                        <RoomCard key={room.id} booking={booking} room={room} />
                      )) : (
                        <div className="xl:col-span-2 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                          <div className="text-lg font-black text-slate-900">Chưa tải được thông tin phòng</div>
                          <div className="mt-2 text-sm font-medium text-slate-500">
                            Booking này hiện chưa trả về đủ `roomIds` để render `RoomCard`. Mình đã thêm fallback lấy từ danh sách khách lưu trú; nếu vẫn trống thì cần kiểm tra payload backend của booking.
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <GuestInfoCard booking={booking} />
                    <PaymentSummary booking={booking} />
                  </section>

                  <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Thông tin lưu trú</div>
                      <h4 className="mt-3 text-xl font-black text-slate-950">Lịch trình và chính sách</h4>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-slate-700" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ngày nhận phòng</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{booking.checkIn}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Clock3 size={18} className="text-slate-700" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ngày trả phòng</div>
                              <div className="mt-1 text-sm font-black text-slate-900">{booking.checkOut}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 px-4 py-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Giờ check-in / check-out</div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {CHECK_IN_TIME_LABEL} / {CHECK_OUT_TIME_LABEL}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 px-4 py-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Tổng số đêm</div>
                          <div className="mt-1 text-sm font-bold text-slate-900">{getNights(booking.checkIn, booking.checkOut)} đêm</div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl bg-[#f8f5ef] px-5 py-5">
                        <div className="flex items-start gap-3">
                          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-700" />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Chính sách hủy</div>
                            <div className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                              {getCancellationPolicySummary(booking)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Thông tin thêm</div>
                      <h4 className="mt-3 text-xl font-black text-slate-950">Khách sạn và yêu cầu</h4>

                      <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-5">
                        <div className="flex items-start gap-3">
                          <MapPin size={18} className="mt-0.5 shrink-0 text-slate-700" />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Địa điểm khách sạn</div>
                            <div className="mt-2 text-sm font-bold text-slate-900">{HOTEL_LOCATION_LABEL}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-slate-200 px-5 py-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Yêu cầu đặc biệt</div>
                        <div className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                          {getSpecialRequestText(booking)}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
