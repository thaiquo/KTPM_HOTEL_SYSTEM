import React, { useEffect, useMemo, useState } from 'react';
import { HiOutlineSearch, HiOutlineClipboardCheck, HiOutlineCash, HiOutlineCreditCard } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { paymentApi, roomApi, staffBookingApi } from '../../../services/api';
import type { Booking, Room } from '../../../types';

type BookingRow = Booking & { room?: Room; remainingAmount: number };
type PaymentMethod = 'BANK_TRANSFER' | 'CASH';

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const isValidCccd = (value: string | undefined) => /^\d{12}$/.test((value || '').trim());

const StaffCheckInPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cccdByBooking, setCccdByBooking] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const bookings = await staffBookingApi.getCheckInList();
      const enriched = await Promise.all(bookings.map(async (booking) => {
        const [room, payments] = await Promise.all([
          roomApi.getById(booking.roomId).catch(() => undefined),
          paymentApi.getByBooking(booking.id).catch(() => []),
        ]);
        const successfulPaymentAmount = payments
          .filter((payment) => payment.status === 'SUCCESS')
          .reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
        const paidAmount = successfulPaymentAmount > 0 ? successfulPaymentAmount : (booking.paidAmount || 0);
        return {
          ...booking,
          room,
          remainingAmount: Math.max(0, (booking.totalPrice || 0) - paidAmount),
          paidAmount: Math.max(booking.paidAmount || 0, paidAmount),
        };
      }));
      setItems(enriched);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách check-in');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((booking) =>
      [`${booking.id}`, booking.room?.roomNumber, booking.room?.name, booking.userId]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, searchTerm]);

  const openCheckInFlow = async (booking: BookingRow, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const representativeCccd = cccdByBooking[booking.id]?.trim();
    if (!isValidCccd(representativeCccd)) {
      toast.error('CCCD người đại diện phải gồm đúng 12 số');
      return;
    }
    if (booking.remainingAmount > 0) {
      setSelectedBooking(booking);
      setPaymentMethod('BANK_TRANSFER');
      setCashReceived(String(Math.round(booking.remainingAmount)));
      return;
    }
    await doCheckIn(booking);
  };

  const doCheckIn = async (booking: BookingRow) => {
    const representativeCccd = cccdByBooking[booking.id]?.trim();
    if (!isValidCccd(representativeCccd)) {
      toast.error('CCCD người đại diện phải gồm đúng 12 số');
      return;
    }
    try {
      setProcessing(true);
      await staffBookingApi.checkIn(booking.id, representativeCccd);
      toast.success(`Check-in thành công booking #${booking.id}`);
      setSelectedBooking(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Check-in thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const confirmRemainingPayment = async () => {
    if (!selectedBooking) return;
    const requiredAmount = selectedBooking.remainingAmount;
    const received = Number(cashReceived || 0);
    if (paymentMethod === 'CASH' && received < requiredAmount) {
      toast.error('Số tiền khách đưa chưa đủ để thanh toán phần còn lại');
      return;
    }
    try {
      setProcessing(true);
      await staffBookingApi.collectRemainingPayment(selectedBooking.id, {
        amount: requiredAmount,
        userId: Number(selectedBooking.userId),
        method: paymentMethod,
        transactionId: `${paymentMethod}_${selectedBooking.id}_${Date.now()}`,
      });
      toast.success('Đã ghi nhận thanh toán phần còn lại');
      await doCheckIn({ ...selectedBooking, remainingAmount: 0, paidAmount: selectedBooking.totalPrice });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể ghi nhận thanh toán');
    } finally {
      setProcessing(false);
    }
  };

  const changeDue = selectedBooking && paymentMethod === 'CASH'
    ? Math.max(0, Number(cashReceived || 0) - selectedBooking.remainingAmount)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">Nhập CCCD đại diện; nếu còn tiền cọc thì thu phần còn lại trước khi check-in.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm booking, phòng, khách..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải booking...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking cần check-in</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Lưu trú</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thanh toán</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">CCCD đại diện</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50/40">
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                      <div className="text-xs text-gray-400">User #{booking.userId}</div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-gray-700">{booking.room?.roomNumber || booking.roomId}</td>
                    <td className="px-6 py-5 text-sm text-gray-600">{booking.checkIn} → {booking.checkOut}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalPrice)}</div>
                      <div className="text-xs text-gray-500">Đã cọc/trả {formatCurrency(booking.paidAmount || 0)} · Còn {formatCurrency(booking.remainingAmount)}</div>
                    </td>
                    <td className="px-6 py-5">
                      <input
                        value={cccdByBooking[booking.id] || ''}
                        onChange={(event) => setCccdByBooking({
                          ...cccdByBooking,
                          [booking.id]: event.target.value.replace(/\D/g, '').slice(0, 12),
                        })}
                        placeholder="12 số CCCD"
                        inputMode="numeric"
                        maxLength={12}
                        className={`w-44 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                          cccdByBooking[booking.id] && !isValidCccd(cccdByBooking[booking.id])
                            ? 'border-rose-300 bg-rose-50'
                            : 'border-gray-200'
                        }`}
                      />
                      {cccdByBooking[booking.id] && !isValidCccd(cccdByBooking[booking.id]) && (
                        <div className="mt-1 text-[11px] font-bold text-rose-500">CCCD phải đúng 12 số</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={(event) => openCheckInFlow(booking, event)}
                        disabled={processing || !isValidCccd(cccdByBooking[booking.id])}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <HiOutlineClipboardCheck className="w-5 h-5" />
                        Check-in
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900">Thu phần còn lại</h2>
            <p className="mt-1 text-sm text-gray-500">Booking #{selectedBooking.id} cần thanh toán đủ trước khi check-in.</p>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-gray-50 p-4 text-sm">
              <div>
                <div className="text-gray-400 font-bold">Tổng tiền</div>
                <div className="font-black">{formatCurrency(selectedBooking.totalPrice)}</div>
              </div>
              <div>
                <div className="text-gray-400 font-bold">Đã cọc</div>
                <div className="font-black text-emerald-600">{formatCurrency(selectedBooking.paidAmount || 0)}</div>
              </div>
              <div>
                <div className="text-gray-400 font-bold">Còn thiếu</div>
                <div className="font-black text-rose-600">{formatCurrency(selectedBooking.remainingAmount)}</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`rounded-2xl border p-4 text-left ${paymentMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
              >
                <HiOutlineCreditCard className="h-6 w-6 text-sky-600" />
                <div className="mt-2 font-black">Ngân hàng / QR</div>
                <div className="text-xs text-gray-500">Khách đã chuyển khoản đủ</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`rounded-2xl border p-4 text-left ${paymentMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
              >
                <HiOutlineCash className="h-6 w-6 text-emerald-600" />
                <div className="mt-2 font-black">Tiền mặt</div>
                <div className="text-xs text-gray-500">Nhập tiền khách đưa</div>
              </button>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="mt-5">
                <label className="text-xs font-bold uppercase text-gray-400">Số tiền khách đưa</label>
                <input
                  type="number"
                  min={0}
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <div className="mt-2 text-sm font-bold text-gray-600">Tiền thối lại: <span className="text-emerald-600">{formatCurrency(changeDue)}</span></div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={confirmRemainingPayment}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận thu tiền & Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckInPage;
