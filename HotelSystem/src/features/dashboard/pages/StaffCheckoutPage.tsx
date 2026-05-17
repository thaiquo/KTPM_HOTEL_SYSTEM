import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineCash, HiOutlineCreditCard, HiOutlineFilter, HiOutlineChartBar, HiOutlineSearch, HiOutlineLogout, HiOutlineCalendar } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  paymentApi,
  roomApi,
  staffBookingApi,
  vietnamTodayISO,
  type CheckInOutStats,
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
    case 'EARLY': return 'Checkout sớm (Hoàn tiền)';
    case 'LATE': return 'Checkout trễ (Phụ thu)';
    case 'EARLY_AND_LATE': return 'Checkout sớm + Phụ thu trễ';
    case 'NORMAL': return 'Checkout đúng hạn';
    default: return value || 'Bình thường';
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
    case 'USER': return 'Người đặt (User)';
    case 'REPRESENTATIVE_GUEST': return 'Khách / đại diện đã thanh toán';
    case 'WALK_IN_GUEST': return 'Khách tại quầy';
    default: return t || '-';
  }
};

const purposeVi = (p?: string) => {
  switch (p) {
    case 'DEPOSIT': return 'Cọc';
    case 'FULL_PAYMENT': return 'Thanh toán 100%';
    case 'REMAINING': return 'Phần còn lại';
    default: return p || '-';
  }
};

const StaffCheckoutPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'STAYING' | 'DONE'>('TODAY');
  const [showStatsFilter, setShowStatsFilter] = useState(false);
  const [statsDate, setStatsDate] = useState(vietnamTodayISO());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [stats, setStats] = useState<CheckInOutStats | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, CheckoutResponse>>({});
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeBooking, setActiveBooking] = useState<BookingRow | null>(null);
  const [activeStep, setActiveStep] = useState<'PREVIEW' | 'PAYMENT' | null>(null);
  const [lateFeeMethod, setLateFeeMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [lateFeeCashReceived, setLateFeeCashReceived] = useState('');

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryDate = (activeTab === 'TODAY' || !showAllHistory) ? statsDate : undefined;

      const getListPromise = () => {
        switch (activeTab) {
          case 'TODAY': return staffBookingApi.getTodayCheckoutList(queryDate);
          case 'STAYING': return staffBookingApi.getCheckoutList(); // Staying is based on current guest list
          case 'DONE': return staffBookingApi.getAlreadyCheckedOutTodayList(queryDate);
          default: return staffBookingApi.getCheckoutList();
        }
      };

      const [bookings, todayStats] = await Promise.all([
        getListPromise(),
        staffBookingApi.getTodayStats(statsDate).catch(() => null),
      ]);
      setStats(todayStats);

      const enriched = await Promise.all(bookings.map(async (booking) => ({
        ...booking,
        room: await roomApi.getById(booking.roomId).catch(() => undefined),
      })));
      setItems(enriched);
    } catch (error: any) {
      console.error('Fetch checkout data error:', error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || 'Không thể tải danh sách checkout';
      toast.error(status ? `[${status}] ${msg}` : msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statsDate, showAllHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeResult = activeBooking ? checkoutResult[String(activeBooking.id)] : undefined;
  const lateFeeAmount = Number(activeResult?.lateCheckoutFee || 0);
  const lateFeeMinutes = Number(activeResult?.lateMinutes || 0);
  const hasLateCheckout = lateFeeAmount > 0 || lateFeeMinutes > 0;
  const hasEarlyCheckout = Boolean(activeResult?.checkoutType?.includes('EARLY'));
  const refundRate = Number(activeResult?.refundRate ?? 0);
  const unusedNights = Number(activeResult?.unusedNights ?? 0);
  const refundAmount = Number(activeResult?.refundAmount ?? 0);
  const apiNightly = Number(activeResult?.effectivePricePerNight ?? 0);
  const refundNightlyAmount = apiNightly > 0 ? apiNightly : (unusedNights > 0 && refundRate > 0 ? refundAmount / unusedNights / refundRate : 0);
  const latePercent = lateCheckoutPercent(lateFeeMinutes);
  const lateBaseAmount = latePercent > 0 ? lateFeeAmount / (latePercent / 100) : 0;

  const lateFeeChangeDue = useMemo(() => {
    if (lateFeeMethod !== 'CASH') return 0;
    return Math.max(0, Number(lateFeeCashReceived || 0) - lateFeeAmount);
  }, [lateFeeAmount, lateFeeCashReceived, lateFeeMethod]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((booking) =>
      [`${booking.id}`, booking.room?.roomNumber, booking.userId]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, searchTerm]);

  const isReadOnly = activeTab === 'DONE';

  const openCheckoutPreview = async (booking: BookingRow) => {
    try {
      setProcessing(true);
      const result = await staffBookingApi.calculateCheckout(String(booking.id));
      setCheckoutResult((prev) => ({ ...prev, [String(booking.id)]: result }));
      setActiveBooking(booking);
      setActiveStep('PREVIEW');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết checkout');
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
      console.error('Checkout error:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Hệ thống đang xử lý chậm, vui lòng kiểm tra lại sau giây lát');
      } else {
        toast.error(error?.response?.data?.message || error.message || 'Không thể hoàn tất checkout');
      }
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
      await paymentApi.markLateCheckoutPaid(String(activeBooking.id), lateFeeMethod);
      await staffBookingApi.completeCheckout(String(activeBooking.id));
      toast.success('Đã thu phí trễ và hoàn tất checkout');
      setActiveBooking(null);
      setActiveStep(null);
      fetchData();
    } catch (error: any) {
      console.error('Checkout error:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Hệ thống đang xử lý chậm, vui lòng kiểm tra lại sau giây lát');
      } else {
        toast.error(error?.response?.data?.message || error.message || 'Không thể hoàn tất checkout');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xử lý Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isReadOnly ? 'Xem lịch sử các booking đã hoàn tất checkout.' : 'Nhấn Checkout để hệ thống tự tính checkout sớm/trễ và xử lý phí phát sinh.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="TODAY">Checkout hôm nay</option>
            <option value="STAYING">Đang lưu trú</option>
            <option value="DONE">Đã checkout</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l pl-2 border-gray-100">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <button
          onClick={() => setShowStatsFilter(!showStatsFilter)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm ${showStatsFilter ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <HiOutlineChartBar className="w-4 h-4" />
          Bộ lọc & Thống kê
        </button>
      </div>

      <AnimatePresence>
        {stats && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {showStatsFilter && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-sky-700 uppercase tracking-wider mb-2">Ngày thống kê</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        disabled={activeTab === 'STAYING' || (activeTab === 'DONE' && showAllHistory)}
                        value={statsDate}
                        onChange={(e) => setStatsDate(e.target.value)}
                        className="flex-1 bg-white border border-sky-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:bg-gray-100"
                      />
                      {activeTab === 'DONE' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={showAllHistory} onChange={(e) => setShowAllHistory(e.target.checked)} className="w-5 h-5 rounded-lg border-sky-300 text-sky-600" />
                          <span className="text-sm font-bold text-sky-700">Chọn tất cả</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-sky-600 mt-5">Thống kê tự động cập nhật khi bạn thay đổi ngày.</p>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Tổng checkout dự kiến</div><div className="mt-1 text-2xl font-black text-gray-900">{stats.totalCheckOutToday}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Đã checkout</div><div className="mt-1 text-2xl font-black text-emerald-600">{stats.alreadyCheckedOut}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Chưa checkout</div><div className="mt-1 text-2xl font-black text-rose-600">{stats.notYetCheckedOut}</div></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"><div className="text-xs font-bold text-gray-400">Đang dọn phòng</div><div className="mt-1 text-2xl font-black text-cyan-600">{stats.inCleaningNow}</div></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm booking, phòng, khách..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500" />
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải booking...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Không có booking nào khớp với tìm kiếm</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Checkout chuẩn</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Thông tin lưu trú</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => {
                  const standardCheckout = new Date(`${booking.checkOut} 12:00`);
                  const checkoutTime = booking.actualCheckOutAt ? new Date(booking.actualCheckOutAt) : new Date();
                  
                  // Checkout trễ: Khi thời gian hiện tại hoặc thực tế checkout VƯỢT QUÁ 12:00 của ngày checkout dự kiến
                  const isLateCheckout = checkoutTime > standardCheckout;
                  
                  // Checkout sớm: Chỉ khi NGÀY hiện tại < NGÀY dự kiến (không tính giờ)
                  // Nếu cùng ngày mà trước 12h thì coi là Bình thường (Đúng hạn)
                  const plannedDateOnly = new Date(booking.checkOut);
                  plannedDateOnly.setHours(0, 0, 0, 0);
                  const actualDateOnly = new Date(checkoutTime);
                  actualDateOnly.setHours(0, 0, 0, 0);
                  
                  const isEarlyCheckout = actualDateOnly.getTime() < plannedDateOnly.getTime();

                  const lateMinutes = isLateCheckout 
                    ? Math.floor((checkoutTime.getTime() - standardCheckout.getTime()) / (1000 * 60))
                    : 0;

                  // Xác định màu nền hàng
                  let rowColorClass = '';
                  if (!isReadOnly) {
                    if (isLateCheckout) rowColorClass = 'bg-rose-50/50';
                    else if (isEarlyCheckout) rowColorClass = 'bg-emerald-50/50';
                  } else {
                    if (isLateCheckout) rowColorClass = 'bg-rose-50/20';
                    else if (isEarlyCheckout) rowColorClass = 'bg-emerald-50/20';
                  }

                  const getRowCheckoutDetail = () => {
                    const totalNights = booking.checkIn && booking.checkOut 
                      ? Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                      : 1;
                    const pricePerNight = (booking.totalPrice || 0) / totalNights;
                    
                    if (isLateCheckout) {
                      const percent = lateCheckoutPercent(lateMinutes);
                      const lateFee = pricePerNight * (percent / 100);
                      return (
                        <div className="text-[11px] font-black text-rose-600 mt-1">
                          Phụ thu trễ ({percent}%): +{formatCurrency(lateFee)}
                        </div>
                      );
                    }
                    if (isEarlyCheckout) {
                      const usedDays = booking.checkIn && booking.actualCheckOutAt
                        ? Math.max(1, Math.round((new Date(booking.actualCheckOutAt).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                        : 1;
                      const chargeNights = Math.max(usedDays, 1);
                      const unusedNights = Math.max(0, totalNights - chargeNights);
                      const refundAmount = unusedNights * pricePerNight * 0.8;
                      return (
                        <div className="text-[11px] font-black text-emerald-600 mt-1">
                          Hoàn trả ({unusedNights} đêm): -{formatCurrency(refundAmount)}
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] font-bold text-gray-500 mt-1">
                        Checkout đúng hạn
                      </div>
                    );
                  };

                  return (
                    <tr 
                      key={booking.id} 
                      className={`hover:bg-gray-50/40 cursor-pointer transition-colors ${rowColorClass}`}
                      onClick={() => openCheckoutPreview(booking)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-gray-900">#{booking.id}</div>
                          {isLateCheckout && (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700 uppercase animate-pulse">
                              Trễ {lateMinutes > 60 ? `${Math.floor(lateMinutes/60)}h ${lateMinutes%60}p` : `${lateMinutes}p`}
                            </span>
                          )}
                          {isEarlyCheckout && (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase">
                              Checkout Sớm
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">User #{booking.userId}</div>
                        {isReadOnly && getRowCheckoutDetail()}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-700">{booking.room?.roomNumber || booking.roomId}</td>
                      <td className="px-6 py-5">
                        <div className={`text-sm font-bold ${isLateCheckout ? 'text-rose-600' : 'text-gray-600'}`}>
                          {booking.checkOut} 12:00
                        </div>
                        {isLateCheckout && (
                          <div className="text-[10px] font-bold text-rose-400 uppercase mt-0.5">Quá hạn trả phòng</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <HiOutlineCalendar className="w-3.5 h-3.5" />
                            In: {formatDateTimeMinute(booking.actualCheckInAt)}
                          </div>
                          {booking.actualCheckOutAt && (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                              <HiOutlineLogout className="w-3.5 h-3.5" />
                              Out: {formatDateTimeMinute(booking.actualCheckOutAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isReadOnly ? (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckoutPreview(booking);
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-black bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all shadow-sm"
                          >
                            Xem chi tiết
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            disabled={processing} 
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckoutPreview(booking);
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-all ${isLateCheckout ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'} disabled:opacity-60`}
                          >
                            Checkout
                          </button>
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

      {activeBooking && activeStep && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-5">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" role="dialog">
            <div className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{activeStep === 'PAYMENT' ? 'Thu phí checkout trễ' : 'Xác nhận Checkout'}</h2>
                  <p className="mt-1 text-sm text-gray-500">Booking #{activeBooking.id} · Phòng {activeBooking.room?.roomNumber || activeBooking.roomId}</p>
                </div>
                {activeResult?.checkoutType && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${
                    activeResult.checkoutType === 'LATE' ? 'bg-rose-600 text-white' :
                    activeResult.checkoutType === 'EARLY' ? 'bg-emerald-600 text-white' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {checkoutTypeLabel(activeResult.checkoutType)}
                  </span>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {activeResult && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm space-y-2">
                    
                    {/* ĐỐI TƯỢNG VÀ THỜI GIAN GIAO DỊCH GHI NHẬN TỪ DỮ LIỆU */}
                    <div className="p-3 bg-white rounded-xl border border-sky-100/50 space-y-2 text-xs">
                      {activeResult.checkoutType === 'EARLY' ? (
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Khách nhận hoàn tiền (Đại diện)</span>
                          <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                            👤 {activeResult.representativeFullName || '—'}
                          </span>
                          {activeResult.representativeCccd && (
                            <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                              🆔 CCCD: {activeResult.representativeCccd}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Khách thanh toán phụ thu (Đại diện)</span>
                          <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                            👤 {activeResult.representativeFullName || '—'}
                          </span>
                          {activeResult.representativeCccd && (
                            <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                              🆔 CCCD: {activeResult.representativeCccd}
                            </span>
                          )}
                        </div>
                      )}

                      {activeBooking.actualCheckOutAt && (
                        <div className="border-t border-gray-100 pt-2 mt-2">
                          <span className="text-[10px] text-gray-400 uppercase font-black block">Thời gian Checkout ghi nhận thực tế</span>
                          <span className="text-sky-600 font-extrabold block mt-0.5">
                            ⏰ {formatDateTimeMinute(activeBooking.actualCheckOutAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between font-bold text-gray-900"><span>Loại checkout</span><span>{checkoutTypeLabel(activeResult.checkoutType)}</span></div>
                  <div className="rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-500 leading-relaxed">
                    Đại diện check-in: <span className="font-bold text-gray-900">{activeResult.representativeFullName || '—'}</span><br/>
                    CCCD: <span className="font-bold text-gray-900">{activeResult.representativeCccd || '—'}</span>
                  </div>
                  {activeResult.refundAllocations && activeResult.refundAllocations.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3"><div className="text-emerald-900 font-black mb-2">Phân bổ hoàn tiền</div>
                      <ul className="space-y-2">{activeResult.refundAllocations.map((line, idx) => <li key={idx} className="rounded-lg bg-white/90 px-3 py-2 text-[11px] font-bold text-gray-800">{line.recipientSummaryVi || `${formatCurrency(line.amount || 0)} → ${receiverTypeVi(line.receiverType)}`}</li>)}</ul>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                    <span className="font-bold text-gray-900">Tổng kết (Net)</span>
                    <span className={`font-black ${Number(activeResult.finalAmount || 0) < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(activeResult.finalAmount || 0) < 0 ? 'Hoàn trả: ' : 'Thu thêm: '}
                      {formatCurrency(Math.abs(Number(activeResult.finalAmount || 0)))}
                    </span>
                  </div>
                  
                  {hasLateCheckout && (
                    <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-sm font-black text-rose-700 uppercase">Phát sinh phí Checkout trễ</span>
                        </div>
                        <div className="text-lg font-black text-rose-700">{formatCurrency(Number(activeResult.lateCheckoutFee || 0))}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rose-100">
                        <div>
                          <div className="text-[10px] font-bold text-rose-400 uppercase">Thời gian trễ</div>
                          <div className="text-sm font-bold text-rose-900">
                            {activeResult.lateMinutes && activeResult.lateMinutes > 60 
                              ? `${Math.floor(activeResult.lateMinutes / 60)} giờ ${activeResult.lateMinutes % 60} phút`
                              : `${activeResult.lateMinutes || 0} phút`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-rose-400 uppercase">Mức phụ thu</div>
                          <div className="text-sm font-bold text-rose-900">
                            {activeResult.lateMinutes && activeResult.lateMinutes < 120 ? '20%' : activeResult.lateMinutes && activeResult.lateMinutes <= 360 ? '50%' : '100%'} giá phòng
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeStep === 'PAYMENT' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-rose-50 p-4"><div className="text-xs font-bold text-rose-600 uppercase">Số tiền cần thu</div><div className="text-2xl font-black text-rose-700">{formatCurrency(lateFeeAmount)}</div></div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setLateFeeMethod('BANK_TRANSFER')} className={`rounded-xl border p-4 text-left ${lateFeeMethod === 'BANK_TRANSFER' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Chuyển khoản</div></button>
                    <button onClick={() => setLateFeeMethod('CASH')} className={`rounded-xl border p-4 text-left ${lateFeeMethod === 'CASH' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}><div className="font-black">Tiền mặt</div></button>
                  </div>
                  {lateFeeMethod === 'CASH' && <input type="number" value={lateFeeCashReceived} onChange={(e) => setLateFeeCashReceived(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-black" />}
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-5 py-4">
              {isReadOnly ? (
                <button 
                  onClick={() => { setActiveBooking(null); setActiveStep(null); }} 
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 px-6 py-2 text-sm font-black text-gray-700 transition-all shadow-sm"
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button 
                    disabled={processing} 
                    onClick={() => { setActiveBooking(null); setActiveStep(null); }} 
                    className="rounded-xl border px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={processing} 
                    onClick={activeStep === 'PAYMENT' ? confirmLateFeePaymentAndComplete : confirmCheckout} 
                    className="min-w-[120px] rounded-xl bg-sky-600 px-6 py-2 text-sm font-black text-white shadow-lg shadow-sky-100 hover:bg-sky-700 disabled:opacity-70 transition-all"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xử lý...
                      </div>
                    ) : (
                      'Xác nhận'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckoutPage;
