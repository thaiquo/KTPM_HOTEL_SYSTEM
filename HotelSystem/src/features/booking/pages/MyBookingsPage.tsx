import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Info, ShieldAlert } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, paymentApi } from '../../../services/api';
import { roomApi } from '../../../services/apiRoom';
import type { Booking, BookingGuest, Room } from '../../../types';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { CHECK_IN_TIME_LABEL, CHECK_OUT_TIME_LABEL } from '../../../shared/lib/bookingPricing';
import BookingCard from '../components/BookingCard';
import BookingDetailModal from '../components/BookingDetailModal';
import type { BookingWithRoom } from '../components/bookingHistoryView';
import { formatCurrency } from '../components/bookingHistoryView';
import { isPaidBookingRecord } from '../utils/bookingHistory';

const isValidRoomId = (value: unknown): value is string | number => {
  if (value == null) return false;
  const normalized = String(value).trim();
  return Boolean(normalized) && normalized !== 'undefined' && normalized !== 'null' && normalized !== 'NaN';
};

const buildPlaceholderRoom = (roomId: string) => ({
  id: roomId,
  name: `Phòng ${roomId}`,
  roomNumber: roomId,
  maxCapacity: 0,
  viewType: '',
  areaM2: 0,
  hasBalcony: false,
  hasBathtub: false,
  smokingPolicy: 'NON_SMOKING' as const,
  isAccessible: false,
  isConnecting: false,
  floorNumber: 0,
  floorLevel: '',
  status: 'RESERVED',
  maintenanceStatus: 'OK',
  roomType: {
    id: '',
    type: `Phòng ${roomId}`,
    basePrice: 0,
    maxCapacity: 0,
    defaultCapacity: 0,
    description: '',
    images: [],
  },
  beds: [],
  amenities: [],
});

const getPolicyTypeText = (policyType?: string) => {
  switch ((policyType || '').toUpperCase()) {
    case 'HOLIDAY':
      return 'giai đoạn Lễ/Tết';
    case 'NON_REFUNDABLE':
      return 'đặt phòng không hoàn tiền';
    default:
      return 'ngày thường';
  }
};

const getCancelTypeText = (cancelType?: string) => {
  switch ((cancelType || '').toUpperCase()) {
    case 'FREE_CANCEL':
      return 'Hủy miễn phí';
    case 'LATE_CANCEL':
      return 'Hủy sát ngày nhận phòng';
    case 'NO_SHOW':
      return 'Không đến nhận phòng';
    case 'NOT_ALLOWED':
      return 'Không được hủy';
    default:
      return cancelType || 'Theo chính sách';
  }
};

const getPolicyReasonText = (reason?: string) => {
  switch (reason) {
    case 'Free cancellation before 24 hours':
      return 'Hủy miễn phí trước 24 giờ.';
    case 'Free cancellation before 72 hours':
      return 'Hủy miễn phí trước 72 giờ.';
    case 'Late cancel: charge one night':
      return 'Hủy sát ngày nhận phòng nên hệ thống tính phí 1 đêm.';
    case 'Late cancel for DEPOSIT: lose deposit':
      return 'Hủy sát ngày nhận phòng nên khách mất khoản đặt cọc.';
    case 'No-show: charge one night':
      return 'Không đến nhận phòng nên hệ thống tính phí 1 đêm.';
    case 'No-show for FULL payment: no refund':
      return 'Không đến nhận phòng với thanh toán toàn bộ nên không hoàn tiền.';
    case 'Non-refundable booking cannot be cancelled':
      return 'Gói đặt phòng không hoàn tiền nên không thể hủy.';
    default:
      return reason || 'Áp dụng theo chính sách hủy phòng hiện tại.';
  }
};

export default function MyBookingsPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const [items, setItems] = useState<BookingWithRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const selectedBooking = useMemo(
    () => (selectedBookingId ? items.find((item) => item.id === selectedBookingId) || null : null),
    [items, selectedBookingId]
  );

  const hydrateBooking = useCallback(async (booking: Booking): Promise<BookingWithRoom> => {
    if (!user) {
      return {
        ...booking,
        bookingGuests: [],
        payments: [],
        rooms: [],
        detailsLoaded: false,
      };
    }

    try {
      const fullBooking = booking;
      const [guests, payments] = await Promise.all([
        bookingApi.getGuests(fullBooking.id).catch(() => []),
        paymentApi.getByBooking(fullBooking.id, user.id).catch(() => []),
      ]);

      const primaryRoomIds = (fullBooking.items || [])
        .map((item) => item.roomId)
        .filter(isValidRoomId)
        .map((roomId) => String(roomId));
      const fallbackRoomIds = [
        ...(isValidRoomId(fullBooking.roomId) ? [String(fullBooking.roomId)] : []),
        ...guests
          .map((guest) => guest.roomId)
          .filter(isValidRoomId)
          .map((roomId) => String(roomId)),
      ];
      const roomIds = Array.from(new Set([...primaryRoomIds, ...fallbackRoomIds]));
      const fetchedRooms = await Promise.all(roomIds.map((roomId) => roomApi.getById(roomId).catch(() => null)));
      const roomById = new Map(
        roomIds.map((roomId, index) => [roomId, fetchedRooms[index] || buildPlaceholderRoom(roomId)] as const)
      );
      const rooms: Room[] = roomIds.map((roomId) => roomById.get(roomId)).filter(Boolean) as Room[];
      const guestsByRoom = new Map<string, BookingGuest[]>();
      guests.forEach((guest) => {
        const roomKey = String(guest.bookingRoomId || guest.roomId || '');
        if (!roomKey) return;
        guestsByRoom.set(roomKey, [...(guestsByRoom.get(roomKey) || []), guest]);
      });

      const items = (fullBooking.items || []).map((item) => {
        const itemKey = String(item.id || '');
        const roomKey = String(item.roomId || '');
        return {
          ...item,
          guests: guestsByRoom.get(itemKey) || guestsByRoom.get(roomKey) || item.guests || [],
        };
      });

      const latestPayment = payments.find((payment) => payment.status.toUpperCase() === 'SUCCESS');
      const totalPaidAmount = payments
        .filter((payment) => payment.status.toUpperCase() === 'SUCCESS')
        .reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);

      return {
        ...fullBooking,
        items,
        guestCount: fullBooking.guests,
        room: rooms.length === 1 ? rooms[0] : null,
        rooms,
        bookingGuests: guests,
        payments,
        paidAmount: totalPaidAmount || fullBooking.paidAmount,
        paymentTransactionId: latestPayment?.transactionId || fullBooking.paymentTransactionId,
        paymentStatus: fullBooking.paymentStatus,
        detailsLoaded: true,
      };
    } catch (hydrateError) {
      console.error(hydrateError);
      return {
        ...booking,
        guestCount: booking.guests,
        bookingGuests: [],
        payments: [],
        rooms: [],
        detailsLoaded: true,
      };
    }
  }, [user]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [allPaidBookings, setAllPaidBookings] = useState<Booking[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const PAGE_SIZE = 5;

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError('');
    try {
      const list = await bookingApi.getByUser(user.id);
      const paidBookings = list
        .filter(isPaidBookingRecord)
        .sort((a, b) => new Date(b.createdAt || b.checkIn || 0).getTime() - new Date(a.createdAt || a.checkIn || 0).getTime());

      setAllPaidBookings(paidBookings);
    } catch (loadError) {
      console.error(loadError);
      setItems([]);
      setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại.');
      setFetching(false);
    }
  }, [user]);

  // Apply filters on allPaidBookings
  useEffect(() => {
    if (allPaidBookings.length === 0 && !fetching) return;

    let filtered = [...allPaidBookings];
    if (statusFilter) {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (dateFilter) {
      const today = new Date();
      filtered = filtered.filter(b => {
        const ci = new Date(b.checkIn || 0);
        if (dateFilter === 'TODAY') return ci.toDateString() === today.toDateString();
        if (dateFilter === 'FUTURE') return ci > today;
        if (dateFilter === 'PAST') return ci < today;
        return true;
      });
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter(b => 
        (b.bookingCode || '').toLowerCase().includes(kw) ||
        String(b.id).includes(kw)
      );
    }

    setTotalElements(filtered.length);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
    loadPage(1, filtered);
  }, [allPaidBookings, statusFilter, dateFilter, searchKeyword]);


  const loadPage = useCallback(async (targetPage: number, sourceList = allPaidBookings) => {
    setFetching(true);
    try {
      const start = (targetPage - 1) * PAGE_SIZE;
      const currentChunk = sourceList.slice(start, start + PAGE_SIZE);
      const hydratedChunk = await Promise.all(currentChunk.map(booking => hydrateBooking(booking)));
      
      setItems(hydratedChunk);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
      toast.error('Không thể lấy chi tiết một số booking');
    } finally {
      setFetching(false);
    }
  }, [allPaidBookings, hydrateBooking]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const handleFocus = () => {
      loadBookings();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadBookings]);

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (bookingId) {
      setSelectedBookingId(bookingId);
    }
  }, [searchParams]);

  const handleShowPolicy = async (bookingId: string) => {
    setCancellingId(bookingId);
    setPolicy(null);
    try {
      setPolicy(await bookingApi.getPolicy(bookingId));
    } catch (policyError) {
      console.error(policyError);
      setCancellingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId) return;
    setIsSubmittingCancel(true);
    try {
      await bookingApi.cancel(cancellingId, 'Khách hủy đặt phòng trên website');
      setCancellingId(null);
      if (selectedBookingId === cancellingId) {
        setSelectedBookingId(null);
      }
      await loadBookings();
    } catch (cancelError) {
      console.error(cancelError);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (loading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ec_0%,#fafafa_26%,#f5f6f8_100%)] py-16 pb-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-3xl">
            <Link to="/" className="group mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900">
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              Về trang chủ
            </Link>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Booking history</div>
            <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950">Lịch sử đặt phòng</h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600">
              Theo dõi toàn bộ booking theo mô hình chuyên nghiệp: mỗi đơn đặt là một booking, bên trong có thể chứa nhiều phòng, thông tin thanh toán và danh sách khách lưu trú.
            </p>
          </div>

          <Link to="/rooms">
            <Button variant="outline" className="rounded-full border-slate-300 bg-white px-6 py-3 font-black uppercase tracking-[0.16em] text-slate-800 hover:bg-slate-50">
              Tiếp tục tìm phòng
            </Button>
          </Link>
        </motion.div>

        {/* Filters */}
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-3">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CHECKED_IN">Đang lưu trú</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <select 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">Tất cả thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="FUTURE">Sắp tới</option>
            <option value="PAST">Đã qua</option>
          </select>
          <input 
            type="text" 
            placeholder="Tìm mã booking..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
          />
        </div>

        <div className="mt-12">
          {fetching ? (
            <div className="rounded-4xl border border-white/70 bg-white/80 py-24 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <Spinner className="h-12 w-12" />
              <div className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Đang tải lịch sử booking...</div>
            </div>
          ) : error ? (
            <div className="rounded-4xl border border-rose-200 bg-rose-50 px-8 py-20 text-center">
              <h3 className="text-2xl font-black text-rose-700">{error}</h3>
              <Button onClick={loadBookings} className="mt-8 rounded-full px-8 py-3 text-xs font-black uppercase tracking-[0.18em]">
                Thử lại
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white/80 px-8 py-24 text-center shadow-[0_20px_80px_rgba(15,23,42,0.05)]">
              <div className="text-2xl font-black text-slate-900">Chưa có booking nào</div>
              <p className="mt-3 text-sm font-medium text-slate-500">Khi bạn đặt phòng thành công, lịch sử booking sẽ hiện tại đây với đầy đủ phòng, khách lưu trú và thanh toán.</p>
              <Link to="/rooms" className="mt-8 inline-block">
                <Button className="rounded-full px-8 py-3 text-xs font-black uppercase tracking-[0.18em]">
                  Tìm phòng ngay
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onOpenDetails={setSelectedBookingId}
                  onCancel={handleShowPolicy}
                />
              ))}

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => {
                        loadPage(page - 1);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="px-4 font-bold text-slate-700">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => {
                        loadPage(page + 1);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBookingId(null)}
          onCancel={handleShowPolicy}
        />

        <AnimatePresence>
          {cancellingId && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmittingCancel && setCancellingId(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                className="relative w-full max-w-lg overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.3)]"
              >
                <div className="border-b border-slate-200 p-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-950">Xác nhận hủy booking</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">Hệ thống sẽ tạo yêu cầu hoàn tiền nếu booking đủ điều kiện theo chính sách.</p>
                    </div>
                  </div>
                </div>

                {!policy ? (
                  <div className="p-10 text-center">
                    <Spinner className="mx-auto" />
                    <p className="mt-4 text-sm font-bold text-slate-500">Đang tính chính sách hủy và hoàn tiền...</p>
                  </div>
                ) : (
                  <div className="space-y-5 p-7">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-slate-500">Số tiền đã thanh toán</span>
                          <span className="font-black text-slate-900">{formatCurrency(policy.paidAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-slate-500">Số tiền giữ lại / hao hụt</span>
                          <span className="font-black text-rose-700">
                            {formatCurrency(Math.max(0, Number(policy.paidAmount || 0) - Number(policy.refundAmount || 0)))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-slate-500">Phí hủy ({getCancelTypeText(policy.cancelType)})</span>
                          <span className="font-black text-rose-700">{formatCurrency(policy.cancellationFee)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5 border-t border-slate-200 pt-4">
                          <span className="font-black uppercase tracking-wider text-slate-900">Hoàn lại dự kiến</span>
                          <span className="text-xl font-black text-emerald-700">{formatCurrency(policy.refundAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Info size={18} className="mt-0.5 shrink-0 text-amber-700" />
                        <p className="text-sm font-medium leading-relaxed text-slate-700">
                          {getPolicyReasonText(policy.reason)} Chính sách áp dụng cho {getPolicyTypeText(policy.policyType)}. Mốc check-in tiêu chuẩn là {CHECK_IN_TIME_LABEL}, check-out là {CHECK_OUT_TIME_LABEL}. Số tiền hoàn dựa trên tiền thực đã thanh toán.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <Button variant="outline" disabled={isSubmittingCancel} onClick={() => setCancellingId(null)} className="rounded-full py-4 text-xs font-black uppercase tracking-[0.18em]">
                        Quay lại
                      </Button>
                      <Button disabled={isSubmittingCancel} loading={isSubmittingCancel} onClick={handleConfirmCancel} className="rounded-full bg-rose-600 py-4 text-xs font-black uppercase tracking-[0.18em] hover:bg-rose-500">
                        Xác nhận hủy
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
