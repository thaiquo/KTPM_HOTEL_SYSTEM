import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  Hotel,
  Info,
  MapPin,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { bookingApi, paymentApi, roomApi, type PaymentRecord } from '../../../services/api';
import type { Booking, Room } from '../../../types';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import {
  canRequestBookingCancel,
  getBookingPaidAmount,
  getBookingStatusText,
  isPaidBookingRecord,
} from '../utils/bookingHistory';

type BookingWithRoom = Booking & { room?: Room | null; payments?: PaymentRecord[] };

const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const formatCurrency = (amount: number) => `${Number(amount || 0).toLocaleString('vi-VN')} VND`;

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getLatestSuccessfulPayment = (booking: BookingWithRoom) => {
  const payments = booking.payments || [];
  const successful = payments.filter((payment) => payment.status.toUpperCase() === 'SUCCESS');
  const candidates = successful.length > 0 ? successful : payments;
  return [...candidates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
};

const getDisplayPaidAmount = (booking: BookingWithRoom) => {
  const payment = getLatestSuccessfulPayment(booking);
  return payment?.paidAmount || getBookingPaidAmount(booking);
};

const getDisplayOrderReference = (booking: BookingWithRoom) => {
  const payment = getLatestSuccessfulPayment(booking);
  if (payment?.transactionId) return payment.transactionId;
  return booking.paymentTransactionId || `BOOKING-${booking.id}`;
};

const getDisplayPaymentMethod = (booking: BookingWithRoom) => {
  const payment = getLatestSuccessfulPayment(booking);
  const method = payment?.method || booking.paymentType || '';
  if (method.toUpperCase() === 'VNPAY') return 'VNPay';
  if (method.toUpperCase() === 'FULL') return 'Thanh toán toàn bộ';
  if (method.toUpperCase() === 'DEPOSIT') return 'Đặt cọc';
  return method || 'Chưa có dữ liệu';
};

const getStatusBadge = (status: Booking['status']) => {
  const baseClasses = 'px-3 py-1 rounded-full text-[10px] font-black tracking-[0.18em] uppercase border backdrop-blur-md ';
  switch (status) {
    case 'confirmed':
      return <span className={baseClasses + 'bg-green-500/15 border-green-500/30 text-green-600'}>Đã xác nhận</span>;
    case 'deposit_paid':
      return <span className={baseClasses + 'bg-blue-500/15 border-blue-500/30 text-blue-600'}>Đã đặt cọc</span>;
    case 'pending_payment':
      return <span className={baseClasses + 'bg-orange-500/15 border-orange-500/30 text-orange-600'}>Chờ thanh toán</span>;
    case 'checked_in':
      return <span className={baseClasses + 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600'}>Đã nhận phòng</span>;
    case 'completed':
      return <span className={baseClasses + 'bg-teal-500/15 border-teal-500/30 text-teal-600'}>Hoàn thành</span>;
    case 'cancelled':
      return <span className={baseClasses + 'bg-error/15 border-error/30 text-error'}>Đã hủy</span>;
    case 'no_show':
      return <span className={baseClasses + 'bg-gray-500/15 border-gray-500/30 text-gray-600'}>Không đến</span>;
    default:
      return <span className={baseClasses + 'bg-primary/15 border-primary/30 text-primary-fixed-dim'}>{status}</span>;
  }
};

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRoom | null>(null);

  const loadBookings = async () => {
    if (!user) return;
    setFetching(true);
    setError('');
    try {
      const list = await bookingApi.getByUser(user.id);
      const enriched = await Promise.all(
        list.map(async (booking) => {
          const [room, payments] = await Promise.all([
            roomApi.getById(booking.roomId).catch(() => null),
            paymentApi.getByBooking(booking.id, user.id).catch(() => []),
          ]);

          const latestPayment = payments.find((payment) => payment.status.toUpperCase() === 'SUCCESS');
          return {
            ...booking,
            room,
            payments,
            paidAmount: latestPayment?.paidAmount || booking.paidAmount,
            paymentTransactionId: latestPayment?.transactionId || booking.paymentTransactionId,
            paymentStatus: latestPayment ? 'PAID' : booking.paymentStatus,
          };
        })
      );

      setItems(enriched.filter(isPaidBookingRecord));
    } catch (e) {
      console.error(e);
      setItems([]);
      setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (!bookingId || fetching) return;
    const matched = items.find((item) => item.id === bookingId);
    if (matched) setSelectedBooking(matched);
  }, [fetching, items, searchParams]);

  const handleShowPolicy = async (id: string) => {
    setCancellingId(id);
    setPolicy(null);
    try {
      setPolicy(await bookingApi.getPolicy(id));
    } catch (e) {
      console.error(e);
      setCancellingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId) return;
    setIsSubmittingCancel(true);
    try {
      await bookingApi.cancel(cancellingId, 'Khách hủy đặt phòng trên website');
      setCancellingId(null);
      await loadBookings();
    } catch (e) {
      console.error(e);
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
    <div className="min-h-screen bg-background py-16 pb-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div>
            <Link to="/" className="group inline-flex items-center gap-2 text-primary-fixed-dim hover:text-primary font-bold transition-all mb-4">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Về trang chủ
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Phòng đã đặt</h1>
            <p className="text-on-surface-variant mt-2 font-medium">Theo dõi và quản lý các đặt phòng của bạn.</p>
          </div>

          <Link to="/rooms">
            <Button variant="outline" className="rounded-2xl px-6 py-3 font-bold border-outline-variant/30 hover:bg-surface-container-high transition-all">
              Tiếp tục tìm phòng
            </Button>
          </Link>
        </motion.div>

        <div className="mt-12">
          {fetching ? (
            <div className="py-20 text-center">
              <Spinner className="h-12 w-12" />
              <div className="mt-4 text-on-surface-variant font-bold tracking-widest uppercase text-xs">Đang truy xuất dữ liệu...</div>
            </div>
          ) : error ? (
            <div className="py-20 text-center rounded-3xl border-2 border-dashed border-error/20 bg-error/5">
              <h3 className="text-2xl font-extrabold text-error font-headline leading-tight">{error}</h3>
              <Button onClick={loadBookings} className="mt-8 px-10 py-4 rounded-2xl font-black tracking-widest uppercase text-sm">
                Thử lại
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border-2 border-dashed border-outline-variant/20 bg-surface-container-low">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 mb-6">
                <Hotel size={40} />
              </div>
              <h3 className="text-2xl font-extrabold text-on-surface font-headline leading-tight">Chưa có đặt phòng nào</h3>
              <Link to="/rooms" className="inline-block mt-8">
                <Button className="px-10 py-4 rounded-2xl font-black tracking-widest uppercase text-sm shadow-xl shadow-primary/20">Tìm phòng ngay</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((booking) => (
                <Card key={booking.id} className="group overflow-hidden border-outline-variant/10 hover:border-primary/30 transition-all duration-500 shadow-lg">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-48 md:h-auto bg-surface-container-highest shrink-0 relative overflow-hidden">
                      <img src={booking.room?.images?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Phòng khách sạn" />
                      <div className="absolute top-4 left-4">{getStatusBadge(booking.status)}</div>
                    </div>

                    <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-5">
                          <div>
                            <div className="text-[10px] tracking-widest uppercase text-on-surface-variant font-black">Mã #{booking.id}</div>
                            <h2 className="text-2xl font-black tracking-tight text-on-surface font-headline mt-1">{booking.room?.name || `Phòng ${booking.roomId}`}</h2>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-on-surface">{formatCurrency(booking.totalPrice || 0)}</div>
                            <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Tổng cộng</div>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><Calendar size={18} /></div>
                            <div><div className="text-[9px] font-black uppercase text-on-surface-variant">Ngày nhận</div><div className="text-sm font-bold">{booking.checkIn}</div></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><Clock size={18} /></div>
                            <div><div className="text-[9px] font-black uppercase text-on-surface-variant">Thời lượng</div><div className="text-sm font-bold">{getNights(booking.checkIn, booking.checkOut)} đêm</div></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary"><CreditCard size={18} /></div>
                            <div><div className="text-[9px] font-black uppercase text-on-surface-variant">Trạng thái</div><div className="text-sm font-bold">{getBookingStatusText(booking.status)}</div></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary-fixed-dim text-sm font-bold"><MapPin size={16} /> Quận 1, TP. Hồ Chí Minh</div>
                        <div className="flex items-center gap-4">
                          {canRequestBookingCancel(booking) && (
                            <button
                              onClick={() => handleShowPolicy(booking.id)}
                              className="text-xs font-black uppercase tracking-widest text-error hover:underline flex items-center gap-1.5"
                            >
                              <Trash2 size={14} /> Hủy phòng
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="font-black text-xs uppercase tracking-widest text-on-surface hover:text-primary flex items-center gap-2"
                          >
                            Chi tiết <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {cancellingId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
                className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container-high shadow-2xl"
              >
                <div className="border-b border-outline-variant/10 p-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10 text-error">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-on-surface font-headline">Xác nhận hủy phòng</h3>
                      <p className="mt-1 text-sm font-medium text-on-surface-variant">Hệ thống sẽ tạo yêu cầu hoàn tiền thật nếu đơn đủ điều kiện.</p>
                    </div>
                  </div>
                </div>

                {!policy ? (
                  <div className="p-10 text-center">
                    <Spinner className="mx-auto" />
                    <p className="mt-4 text-sm font-bold text-on-surface-variant">Đang tính chính sách hủy và hoàn tiền...</p>
                  </div>
                ) : (
                  <div className="space-y-5 p-7">
                    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-highest p-5">
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-on-surface-variant">Số tiền đã thanh toán</span>
                          <span className="font-black text-on-surface">{formatCurrency(policy.paidAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-on-surface-variant">Số tiền giữ lại / hao hụt</span>
                          <span className="font-black text-error">{formatCurrency(Math.max(0, Number(policy.paidAmount || 0) - Number(policy.refundAmount || 0)))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="font-medium text-on-surface-variant">Phí hủy ({getCancelTypeText(policy.cancelType)})</span>
                          <span className="font-black text-error">{formatCurrency(policy.cancellationFee)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5 border-t border-outline-variant/10 pt-4">
                          <span className="font-black uppercase tracking-wider text-on-surface">Hoàn lại dự kiến</span>
                          <span className="text-xl font-black text-primary">{formatCurrency(policy.refundAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <Info size={18} className="mt-0.5 shrink-0 text-primary" />
                        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
                          {getPolicyReasonText(policy.reason)} Chính sách áp dụng cho {getPolicyTypeText(policy.policyType)}. Số tiền hoàn dựa trên tiền thực đã thanh toán, không vượt quá số tiền khách đã trả.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <Button variant="outline" disabled={isSubmittingCancel} onClick={() => setCancellingId(null)} className="rounded-2xl py-4 font-black uppercase text-xs tracking-widest">
                        Quay lại
                      </Button>
                      <Button disabled={isSubmittingCancel} loading={isSubmittingCancel} onClick={handleConfirmCancel} className="rounded-2xl py-4 font-black uppercase text-xs tracking-widest bg-error hover:bg-error/90">
                        Xác nhận hủy
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {false && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmittingCancel && setCancellingId(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-surface-container-high rounded-[2rem] p-8 shadow-2xl overflow-hidden border border-outline-variant/10"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center"><ShieldAlert size={24} /></div>
                  <h3 className="text-2xl font-black text-on-surface font-headline">Xác nhận hủy phòng</h3>
                </div>

                {!policy ? (
                  <div className="py-10 text-center">
                    <Spinner className="mx-auto" />
                    <p className="mt-4 text-sm font-bold text-on-surface-variant">Đang tính toán chính sách hoàn tiền...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-surface-container-highest border border-outline-variant/10 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant font-medium">Số tiền đã trả:</span>
                        <span className="font-black text-on-surface">{formatCurrency(policy.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant font-medium">Phí hủy phòng ({policy.cancelType}):</span>
                        <span className="font-black text-error">{formatCurrency(policy.cancellationFee)}</span>
                      </div>
                      <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                        <span className="font-black text-on-surface uppercase tracking-wider">Hoàn lại dự kiến:</span>
                        <span className="text-xl font-black text-primary">{formatCurrency(policy.refundAmount)}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 flex items-start gap-3">
                      <Info size={18} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                        Lý do: <strong>{policy.reason}</strong>. Quy định áp dụng cho {policy.policyType === 'HOLIDAY' ? 'giai đoạn Lễ/Tết' : 'ngày thường'}.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <Button variant="outline" disabled={isSubmittingCancel} onClick={() => setCancellingId(null)} className="rounded-2xl py-4 font-black uppercase text-xs tracking-widest">Quay lại</Button>
                      <Button disabled={isSubmittingCancel} loading={isSubmittingCancel} onClick={handleConfirmCancel} className="rounded-2xl py-4 font-black uppercase text-xs tracking-widest bg-error hover:bg-error/90">Xác nhận hủy</Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedBooking && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBooking(null)}
                className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 18 }}
                className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white text-slate-950 border border-slate-200 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg border border-slate-200 hover:bg-slate-50"
                  aria-label="Đóng chi tiết đặt phòng"
                >
                  <X size={18} />
                </button>
                <div className="h-56 bg-slate-100 overflow-hidden">
                  <img src={selectedBooking.room?.images?.[0]} alt="Phòng khách sạn" className="h-full w-full object-cover" />
                </div>
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="text-[10px] tracking-widest uppercase text-slate-500 font-black">Đặt phòng #{selectedBooking.id}</div>
                      <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 font-headline">
                        {selectedBooking.room?.name || `Phòng ${selectedBooking.roomId}`}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-slate-600">
                        {selectedBooking.checkIn} - {selectedBooking.checkOut} · {getNights(selectedBooking.checkIn, selectedBooking.checkOut)} đêm
                      </p>
                    </div>
                    {getStatusBadge(selectedBooking.status)}
                  </div>

                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      ['Tổng tiền', formatCurrency(selectedBooking.totalPrice || 0)],
                      ['Đã thanh toán', formatCurrency(getDisplayPaidAmount(selectedBooking))],
                      ['Hình thức', getDisplayPaymentMethod(selectedBooking)],
                      ['Trạng thái', getBookingStatusText(selectedBooking.status)],
                      ['Mã thanh toán', getDisplayOrderReference(selectedBooking)],
                      ['Ngày tạo', formatDateTime(selectedBooking.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{label}</div>
                        <div className="mt-1 font-black text-slate-950 break-words">{value}</div>
                      </div>
                    ))}
                  </div>

                  {selectedBooking.status === 'cancelled' && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                      Đặt phòng đã hủy{selectedBooking.cancellationReason ? `: ${selectedBooking.cancellationReason}` : ''}.
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                    <Button variant="outline" onClick={() => setSelectedBooking(null)} className="rounded-2xl px-6">
                      Đóng
                    </Button>
                    {canRequestBookingCancel(selectedBooking) && (
                      <Button
                        onClick={() => {
                          setSelectedBooking(null);
                          handleShowPolicy(selectedBooking.id);
                        }}
                        className="rounded-2xl px-6 bg-error hover:bg-error/90"
                      >
                        Hủy phòng
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
