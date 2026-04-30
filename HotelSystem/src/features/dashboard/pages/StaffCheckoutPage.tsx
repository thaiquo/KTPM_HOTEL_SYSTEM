import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { paymentApi, roomApi, staffBookingApi, type CheckoutResponse } from '../../../services/api';
import type { Booking, Room } from '../../../types';

type BookingRow = Booking & { room?: Room };

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const StaffCheckoutPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, CheckoutResponse>>({});

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

  const handleCalculate = async (bookingId: string) => {
    try {
      const result = await staffBookingApi.calculateCheckout(bookingId);
      setCheckoutResult({ ...checkoutResult, [bookingId]: result });
      toast.success(result.paymentRequired ? 'Đã tính phí checkout trễ' : 'Không phát sinh phí trễ');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tính checkout');
    }
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      const result = await staffBookingApi.confirmCheckout(bookingId);
      setCheckoutResult({ ...checkoutResult, [bookingId]: result });
      if (result.paymentRequired) {
        toast.success('Đã tạo khoản thu phí checkout trễ');
      } else {
        toast.success('Checkout thành công');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Checkout thất bại');
    }
  };

  const handleCompletePaidCheckout = async (bookingId: string) => {
    try {
      await paymentApi.markLateCheckoutPaid(bookingId);
      await staffBookingApi.completeCheckout(bookingId);
      toast.success('Đã thu phí trễ và hoàn tất checkout');
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể hoàn tất checkout');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">Checkout trễ được hệ thống tự tính, nhân viên không nhập tay phí.</p>
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
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phí trễ</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((booking) => {
                  const result = checkoutResult[booking.id];
                  return (
                    <tr key={booking.id}>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                        <div className="text-xs text-gray-400">User #{booking.userId}</div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-700">{booking.room?.roomNumber || booking.roomId}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{booking.checkOut} 12:00</td>
                      <td className="px-6 py-5">
                        {result ? (
                          <div>
                            <div className="text-sm font-bold text-gray-900">{formatCurrency(result.lateCheckoutFee)}</div>
                            <div className="text-xs text-gray-500">{result.lateMinutes} phút trễ</div>
                          </div>
                        ) : <span className="text-sm text-gray-400">Chưa tính</span>}
                      </td>
                      <td className="px-6 py-5 text-right space-x-2">
                        <button onClick={() => handleCalculate(booking.id)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Tính phí</button>
                        <button onClick={() => handleConfirm(booking.id)} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">Checkout</button>
                        {result?.paymentRequired && (
                          <button onClick={() => handleCompletePaidCheckout(booking.id)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Đã thu phí</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffCheckoutPage;
