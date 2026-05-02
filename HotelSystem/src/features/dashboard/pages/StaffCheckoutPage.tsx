import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineCash, HiOutlineCreditCard } from 'react-icons/hi';
import {
  paymentApi,
  roomApi,
  staffBookingApi,
  type CheckoutResponse,
  type RefundAllocationLine,
} from '../../../services/api';
import type { Booking, Room } from '../../../types';

type BookingRow = Booking & { room?: Room };
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const formatDateTimeMinute = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const checkoutTypeLabel = (value?: string) => {
  switch (value) {
    case 'EARLY':
      return 'Checkout sớm';
    case 'LATE':
      return 'Checkout trễ';
    case 'EARLY_AND_LATE':
      return 'Checkout sớm + trễ';
    case 'NORMAL':
      return 'Checkout đúng hạn';
    default:
      return value || '-';
  }
};
const lateCheckoutPercent = (minutes: number) => {
  if (minutes < 30) return 0;
  if (minutes < 120) return 20;
  if (minutes <= 360) return 50;
  return 100;
};
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const receiverTypeVi = (t?: string) => {
  switch (t) {
    case 'USER':
      return 'Người đặt (User)';
    case 'REPRESENTATIVE_GUEST':
      return 'Khách / đại diện đã thanh toán';
    case 'WALK_IN_GUEST':
      return 'Khách tại quầy';
    default:
      return t || '-';
  }
};

const purposeVi = (p?: string) => {
  switch (p) {
    case 'DEPOSIT':
      return 'Cọc';
    case 'FULL_PAYMENT':
      return 'Thanh toán 100%';
    case 'REMAINING':
      return 'Phần còn lại';
    default:
      return p || '-';
  }
};

const StaffCheckoutPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, CheckoutResponse>>({});
  const [processing, setProcessing] = useState(false);

  const [activeBooking, setActiveBooking] = useState<BookingRow | null>(null);
  const [activeStep, setActiveStep] = useState<'PREVIEW' | 'PAYMENT' | null>(null);
  const [lateFeeMethod, setLateFeeMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [lateFeeCashReceived, setLateFeeCashReceived] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const bookings = await staffBookingApi.getCheckoutList();
      const enriched = await Promise.all(bookings.map(async (booking) => ({
        ...booking,
        room: await roomApi.getById(booking.roomId).catch(() => undefined),
      })));
      setItems(enriched);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách checkout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeResult = activeBooking ? checkoutResult[String(activeBooking.id)] : undefined;

  const lateFeeAmount = Number(activeResult?.lateCheckoutFee || 0);
  const lateFeeMinutes = Number(activeResult?.lateMinutes || 0);
  const hasLateCheckout = lateFeeAmount > 0 || lateFeeMinutes > 0;
  const hasEarlyCheckout = Boolean(activeResult?.checkoutType?.includes('EARLY'));
  const refundRate = Number(activeResult?.refundRate ?? 0);
  const unusedNights = Number(activeResult?.unusedNights ?? 0);
  const refundAmount = Number(activeResult?.refundAmount ?? 0);
  const apiNightly = Number(activeResult?.effectivePricePerNight ?? 0);
  const refundNightlyAmount =
    apiNightly > 0
      ? apiNightly
      : unusedNights > 0 && refundRate > 0
        ? refundAmount / unusedNights / refundRate
        : 0;
  const latePercent = lateCheckoutPercent(lateFeeMinutes);
  const lateBaseAmount = latePercent > 0 ? lateFeeAmount / (latePercent / 100) : 0;

  const lateFeeChangeDue = useMemo(() => {
    if (lateFeeMethod !== 'CASH') return 0;
    return Math.max(0, Number(lateFeeCashReceived || 0) - lateFeeAmount);
  }, [lateFeeAmount, lateFeeCashReceived, lateFeeMethod]);

  const openCheckoutPreview = async (booking: BookingRow) => {
    try {
      setProcessing(true);
      const result = await staffBookingApi.calculateCheckout(String(booking.id));
      setCheckoutResult((prev) => ({ ...prev, [String(booking.id)]: result }));
      setActiveBooking(booking);
      setActiveStep('PREVIEW');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Checkout thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const confirmCheckout = async () => {
    if (!activeBooking) return;
    try {
      setProcessing(true);
      const result = await staffBookingApi.confirmCheckout(String(activeBooking.id));
      setCheckoutResult((prev) => ({ ...prev, [String(activeBooking.id)]: result }));

      if (result.paymentRequired && Number(result.lateCheckoutFee || 0) > 0) {
        setLateFeeMethod('BANK_TRANSFER');
        setLateFeeCashReceived(String(Math.round(Number(result.lateCheckoutFee || 0))));
        setActiveStep('PAYMENT');
        toast.error('Cần thu phí checkout trễ trước khi hoàn tất checkout');
        return;
      }

      await staffBookingApi.completeCheckout(String(activeBooking.id));
      toast.success('Checkout thành công');
      setActiveBooking(null);
      setActiveStep(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể hoàn tất checkout');
    } finally {
      setProcessing(false);
    }
  };

  const confirmLateFeePaymentAndComplete = async () => {
    if (!activeBooking) return;
    const requiredAmount = lateFeeAmount;
    const received = Number(lateFeeCashReceived || 0);
    if (lateFeeMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phí checkout trễ');
      return;
    }
    try {
      setProcessing(true);
      await paymentApi.markLateCheckoutPaid(String(activeBooking.id));
      await staffBookingApi.completeCheckout(String(activeBooking.id));
      toast.success('Đã thu phí trễ và hoàn tất checkout');
      setActiveBooking(null);
      setActiveStep(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể hoàn tất checkout');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">Nhấn Checkout để hệ thống tự tính checkout sớm/trễ và xử lý phí phát sinh.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải booking...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking đang lưu trú</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Checkout chuẩn</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Checked in</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((booking) => {
                  return (
                    <tr key={booking.id}>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                        <div className="text-xs text-gray-400">User #{booking.userId}</div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-700">{booking.room?.roomNumber || booking.roomId}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{booking.checkOut} 12:00</td>
                      <td className="px-6 py-5">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{formatDateTimeMinute(booking.actualCheckInAt)}</div>
                          <div className="text-xs text-gray-500">Thời gian nhận phòng</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => openCheckoutPreview(booking)}
                          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          Checkout
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeBooking && activeStep && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-5">
          <div
            className="flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5">
              <h2 className="text-xl font-black text-gray-900">
                {activeStep === 'PAYMENT' ? 'Thu phí checkout trễ' : 'Xác nhận Checkout'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Booking #{activeBooking.id} · Phòng {activeBooking.room?.roomNumber || activeBooking.roomId}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {activeResult && (
              <div className="rounded-2xl bg-gray-50 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Loại checkout</div>
                  <div className="font-black text-gray-900">{checkoutTypeLabel(activeResult.checkoutType)}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-2">
                  <div className="text-gray-400 font-bold">Người đại diện lưu trú (theo check-in)</div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Dữ liệu chỉ đọc từ hồ sơ check-in. Staff đối chiếu trực tiếp với giấy tờ khách.{' '}
                    <span className="font-bold text-gray-700">
                      Hoàn tiền không căn cứ vào người này — xem phân bổ theo người đã thanh toán bên dưới.
                    </span>
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-1">
                    <div className="rounded-lg bg-gray-50/80 px-3 py-2">
                      <dt className="text-[11px] font-bold uppercase text-gray-400">Họ tên</dt>
                      <dd className="mt-0.5 font-bold text-gray-900">{activeResult.representativeFullName || '—'}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50/80 px-3 py-2">
                      <dt className="text-[11px] font-bold uppercase text-gray-400">Số điện thoại</dt>
                      <dd className="mt-0.5 font-bold text-gray-900">{activeResult.representativePhone || '—'}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50/80 px-3 py-2">
                      <dt className="text-[11px] font-bold uppercase text-gray-400">CCCD</dt>
                      <dd className="mt-0.5 font-bold text-gray-900">{activeResult.representativeCccd || '—'}</dd>
                    </div>
                  </dl>
                </div>
                {activeResult.refundAllocations && activeResult.refundAllocations.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-2">
                    <div className="text-emerald-900 font-black text-sm">Phân bổ hoàn tiền (theo giao dịch thanh toán gốc)</div>
                    <ul className="space-y-2">
                      {activeResult.refundAllocations.map((line: RefundAllocationLine, idx: number) => (
                        <li
                          key={idx}
                          className="rounded-lg bg-white/90 border border-emerald-100 px-3 py-2 text-xs text-gray-800"
                        >
                          {line.recipientSummaryVi ? (
                            <div className="font-bold leading-snug">{line.recipientSummaryVi}</div>
                          ) : (
                            <div className="space-y-1">
                              <div className="font-black text-emerald-800">
                                {formatCurrency(Number(line.amount || 0))}
                              </div>
                              <div>
                                → {receiverTypeVi(line.receiverType)}
                                {line.receiverUserId != null ? ` #${line.receiverUserId}` : ''}
                                {line.receiverName ? ` · ${line.receiverName}` : ''}
                                {line.receiverPhone ? ` · ${line.receiverPhone}` : ''}
                              </div>
                              <div className="text-gray-500">
                                Khoản gốc: {purposeVi(line.sourcePaymentPurpose)} · Kênh hoàn:{' '}
                                {line.refundChannel || '-'}
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Số đêm đã ở</div>
                  <div className="font-black text-gray-900">{activeResult.usedNights ?? '-'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Số đêm tính phí</div>
                  <div className="font-black text-gray-900">{activeResult.chargeNights ?? '-'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Số đêm không dùng</div>
                  <div className="font-black text-gray-900">{activeResult.unusedNights ?? '-'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Hoàn tiền (nếu có)</div>
                  <div className="font-black text-emerald-700">{formatCurrency(Number(activeResult.refundAmount || 0))}</div>
                </div>
                {hasLateCheckout && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-400 font-bold">Phí checkout trễ</div>
                      <div className="font-black text-rose-700">{formatCurrency(Number(activeResult.lateCheckoutFee || 0))}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-400 font-bold">Trễ</div>
                      <div className="font-black text-gray-900">{Number(activeResult.lateMinutes || 0)} phút</div>
                    </div>
                  </>
                )}
                {activeResult.message && (
                  <div className="pt-2 text-xs font-bold text-gray-500">{activeResult.message}</div>
                )}
              </div>
            )}

            {activeResult && (hasEarlyCheckout || hasLateCheckout) && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 text-xs text-gray-600 space-y-3">
                <div className="font-black uppercase text-gray-400">Công thức tính</div>
                {hasEarlyCheckout && (
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-700">Checkout sớm / hoàn tiền</div>
                    <div>Số đêm không dùng = Tổng số đêm - Số đêm tính phí</div>
                    <div>
                      {activeResult.unusedNights ?? 0} = {activeResult.totalNights ?? '-'} - {activeResult.chargeNights ?? '-'}
                    </div>
                    {unusedNights > 0 ? (
                      <>
                        <div>Hoàn tiền = Số đêm không dùng x Giá 1 đêm x Tỷ lệ hoàn</div>
                        <div>
                          {formatCurrency(refundAmount)} = {unusedNights} x {formatCurrency(refundNightlyAmount)} x{' '}
                          {formatPercent(refundRate)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-gray-500">
                          Không còn đêm hoàn — quy tính phí tối thiểu đã lấy hết các đêm chưa sử dụng trong booking này.
                        </div>
                        <div>Hoàn tiền: {formatCurrency(refundAmount)}</div>
                        {refundNightlyAmount > 0 && (
                          <div>Giá tham chiếu 1 đêm: {formatCurrency(refundNightlyAmount)}</div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {hasLateCheckout && (
                  <div className="space-y-1">
                    <div className="font-bold text-rose-700">Checkout trễ / phụ thu</div>
                    <div>Mốc áp dụng: 12:00-14:00 = 20%, 14:00-18:00 = 50%, sau 18:00 = 100% giá 1 đêm.</div>
                    <div>Phí trễ = Giá 1 đêm x Tỷ lệ phụ thu theo số phút trễ</div>
                    <div>
                      {formatCurrency(lateFeeAmount)} = {formatCurrency(lateBaseAmount)} x {latePercent}% ({lateFeeMinutes} phút trễ)
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeStep === 'PAYMENT' && (
              <>
                <div className="mt-5 rounded-2xl bg-white border border-gray-100 p-4 text-sm">
                  <div className="text-gray-400 font-bold">Số tiền cần thu</div>
                  <div className="mt-1 text-2xl font-black text-rose-600">{formatCurrency(lateFeeAmount)}</div>
                  <div className="mt-1 text-xs text-gray-500">Checkout trễ {lateFeeMinutes} phút</div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLateFeeMethod('BANK_TRANSFER')}
                    className={`rounded-2xl border p-4 text-left ${lateFeeMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
                  >
                    <HiOutlineCreditCard className="h-6 w-6 text-sky-600" />
                    <div className="mt-2 font-black">Ngân hàng / QR</div>
                    <div className="text-xs text-gray-500">Khách đã chuyển khoản đủ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLateFeeMethod('CASH')}
                    className={`rounded-2xl border p-4 text-left ${lateFeeMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
                  >
                    <HiOutlineCash className="h-6 w-6 text-emerald-600" />
                    <div className="mt-2 font-black">Tiền mặt</div>
                    <div className="text-xs text-gray-500">Nhập tiền khách đưa</div>
                  </button>
                </div>

                {lateFeeMethod === 'CASH' && (
                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase text-gray-400">Số tiền khách đưa</label>
                    <input
                      type="number"
                      min={0}
                      value={lateFeeCashReceived}
                      onChange={(event) => setLateFeeCashReceived(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                    <div className="mt-2 text-sm font-bold text-gray-600">
                      Tiền thối lại: <span className="text-emerald-600">{formatCurrency(lateFeeChangeDue)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setActiveBooking(null);
                  setActiveStep(null);
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              {activeStep === 'PAYMENT' ? (
                <button
                  type="button"
                  disabled={processing}
                  onClick={confirmLateFeePaymentAndComplete}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {processing ? 'Đang xử lý...' : 'Xác nhận thu phí & Hoàn tất'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={processing}
                  onClick={confirmCheckout}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {processing ? 'Đang xử lý...' : 'Xác nhận Checkout'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckoutPage;
