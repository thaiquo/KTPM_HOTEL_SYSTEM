import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineCash, HiOutlineCreditCard } from 'react-icons/hi';
import { paymentApi, roomApi, staffBookingApi, type CheckoutResponse } from '../../../services/api';
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
  const latePercent = lateCheckoutPercent(lateFeeMinutes);
  const lateBaseAmount = latePercent > 0 ? lateFeeAmount / (latePercent / 100) : 0;
  const refundNightlyAmount = unusedNights > 0 && refundRate > 0 ? refundAmount / unusedNights / refundRate : 0;

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900">
              {activeStep === 'PAYMENT' ? 'Thu phí checkout trễ' : 'Xác nhận Checkout'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Booking #{activeBooking.id} · Phòng {activeBooking.room?.roomNumber || activeBooking.roomId}</p>

            {activeResult && (
              <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 font-bold">Loại checkout</div>
                  <div className="font-black text-gray-900">{checkoutTypeLabel(activeResult.checkoutType)}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="text-gray-400 font-bold">Người xác minh checkout</div>
                  <div className="mt-1 font-black text-gray-900">{activeResult.representativeFullName || '-'}</div>
                  <div className="text-xs font-bold text-gray-500">
                    {activeResult.representativePhone || '-'} · CCCD {activeResult.representativeCccd || '-'}
                  </div>
                </div>
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
                    <div>Hoàn tiền = Số đêm không dùng x Giá 1 đêm x Tỷ lệ hoàn</div>
                    <div>
                      {formatCurrency(refundAmount)} = {unusedNights} x {formatCurrency(refundNightlyAmount)} x {formatPercent(refundRate)}
                    </div>
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

            <div className="mt-6 flex justify-end gap-3">
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
