import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClipboardCheck,
  HiOutlineCurrencyDollar,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineOfficeBuilding,
  HiOutlineClock,
  HiX,
  HiOutlinePhone,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { staffInvoiceApi, bookingApi, roomApi, userApi, type InvoiceSummary, type PaymentRecord } from '../../../services/api';
import type { Booking, Room } from '../../../types';

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const getInvoiceCategory = (invoice: PaymentRecord): 'BOOKING' | 'CHECKIN' | 'CHECKOUT' | 'REFUND' => {
  const type = (invoice.paymentType || '').toUpperCase();
  if (type === 'DEPOSIT' || type === 'FULL') return 'BOOKING';
  if (type === 'EARLY_CHECKIN_FEE' || type === 'REMAINING') return 'CHECKIN';
  if (type === 'LATE_CHECKOUT_FEE') return 'CHECKOUT';
  if (type === 'REFUND' || type === 'EARLY_CHECKOUT_REFUND') return 'REFUND';
  
  const cat = (invoice.invoiceCategory || '').toUpperCase();
  if (cat === 'BOOKING' || cat === 'CHECKIN' || cat === 'CHECKOUT' || cat === 'REFUND') {
    return cat as any;
  }
  return 'BOOKING';
};

const normalizeInvoiceStatus = (invoice: PaymentRecord) => {
  if (invoice.paymentType === 'REFUND') return 'REFUNDED';
  if (invoice.status === 'SUCCESS') return 'PAID';
  if (invoice.status === 'PENDING') return 'PENDING';
  if (invoice.status === 'FAILED') return 'CANCELLED';
  if (invoice.status === 'EXPIRED') return 'EXPIRED';
  return invoice.status || 'PENDING';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return <span className="px-3 py-1 text-[10px] font-bold bg-green-100 text-green-600 rounded-full uppercase tracking-wider border border-green-200 whitespace-nowrap">Đã thanh toán</span>;
    case 'REFUNDED':
      return <span className="px-3 py-1 text-[10px] font-bold bg-sky-100 text-sky-600 rounded-full uppercase tracking-wider border border-sky-200 whitespace-nowrap">Đã hoàn tiền</span>;
    case 'PENDING':
      return <span className="px-3 py-1 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full uppercase tracking-wider border border-amber-200 whitespace-nowrap">Chờ xử lý</span>;
    case 'CANCELLED':
      return <span className="px-3 py-1 text-[10px] font-bold bg-red-100 text-red-600 rounded-full uppercase tracking-wider border border-red-200 whitespace-nowrap">Đã hủy</span>;
    case 'EXPIRED':
      return <span className="px-3 py-1 text-[10px] font-bold bg-gray-500 text-white rounded-full uppercase tracking-wider border border-gray-600 shadow-sm whitespace-nowrap">Quá hạn / No-Show</span>;
    default:
      return <span className="px-3 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-full uppercase tracking-wider whitespace-nowrap">{status}</span>;
  }
};

const getCategoryBadge = (category?: string) => {
  switch (category) {
    case 'BOOKING':
      return <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-600 rounded border border-indigo-100 uppercase whitespace-nowrap">Đặt phòng</span>;
    case 'CHECKIN':
      return <span className="px-2 py-0.5 text-[9px] font-black bg-teal-50 text-teal-600 rounded border border-teal-100 uppercase whitespace-nowrap">Giai đoạn Check-in</span>;
    case 'CHECKOUT':
      return <span className="px-2 py-0.5 text-[9px] font-black bg-rose-50 text-rose-600 rounded border border-rose-100 uppercase whitespace-nowrap">Giai đoạn Checkout</span>;
    case 'REFUND':
      return <span className="px-2 py-0.5 text-[9px] font-black bg-cyan-50 text-cyan-600 rounded border border-cyan-100 uppercase whitespace-nowrap">Hoàn trả</span>;
    default:
      return null;
  }
};

const getMethodBadge = (method?: string) => {
  if (!method) return <span className="px-2 py-0.5 text-[9px] font-bold bg-gray-50 text-gray-400 rounded border border-gray-100 uppercase whitespace-nowrap">-</span>;
  const m = method.toUpperCase();
  if (m.includes('CASH')) {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-50 text-emerald-600 rounded border border-emerald-100 uppercase whitespace-nowrap">
        💵 Tiền mặt
      </span>
    );
  }
  if (m.includes('BANK') || m.includes('TRANSFER') || m.includes('CONF_')) {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase whitespace-nowrap">
        💳 Chuyển khoản
      </span>
    );
  }
  if (m.includes('VNPAY')) {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-600 rounded border border-indigo-100 uppercase whitespace-nowrap">
        🏦 VNPAY
      </span>
    );
  }
  if (m.includes('MOMO')) {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black bg-pink-50 text-pink-600 rounded border border-pink-100 uppercase whitespace-nowrap">
        🌸 MoMo
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-[9px] font-black bg-purple-50 text-purple-600 rounded border border-purple-100 uppercase whitespace-nowrap">
      ⚡ {method}
    </span>
  );
};

const getPaymentTypeLabel = (type?: string) => {
  if (!type) return '-';
  switch (type.toUpperCase()) {
    case 'DEPOSIT': return 'Tiền cọc';
    case 'FULL': return 'Thanh toán trọn gói';
    case 'REMAINING': return 'Thanh toán còn lại';
    case 'EARLY_CHECKIN_FEE': return 'Phí check-in sớm';
    case 'LATE_CHECKOUT_FEE': return 'Phí checkout trễ';
    case 'EARLY_CHECKOUT_REFUND': return 'Hoàn tiền checkout sớm';
    case 'REFUND': return 'Hóa đơn hoàn trả';
    default: return type;
  }
};

const InvoiceManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    monthlyRevenue: 0,
    paidTotal: 0,
    pendingTotal: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'BOOKING' | 'CHECKIN' | 'CHECKOUT' | 'REFUND'>('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  // Detail modal state variables
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);
  const [guestList, setGuestList] = useState<any[]>([]);

  // Cache states for table rows
  const [userNameByUser, setUserNameByUser] = useState<Record<string, string>>({});
  const [guestsByBooking, setGuestsByBooking] = useState<Record<string, any[]>>({});

  // Background data resolver
  useEffect(() => {
    if (invoices.length === 0) return;

    const uniqueUserIds = Array.from(new Set(invoices.map(inv => inv.userId).filter(Boolean)));
    const uniqueBookingIds = Array.from(new Set(invoices.map(inv => inv.bookingId).filter(Boolean)));

    uniqueUserIds.forEach(async (userId) => {
      const uId = String(userId);
      if (userNameByUser[uId]) return;
      try {
        const res = await userApi.getUserById(Number(uId));
        let name = '';
        if (res.data?.data?.name) {
          name = res.data.data.name;
        } else if (res.data?.data?.fullName) {
          name = res.data.data.fullName;
        } else if (res.data?.name) {
          name = res.data.name;
        } else if (res.data?.fullName) {
          name = res.data.fullName;
        }
        if (name.trim()) {
          setUserNameByUser(prev => ({ ...prev, [uId]: name }));
        } else {
          setUserNameByUser(prev => ({ ...prev, [uId]: `User #${uId}` }));
        }
      } catch (err) {
        setUserNameByUser(prev => ({ ...prev, [uId]: `User #${uId}` }));
      }
    });

    uniqueBookingIds.forEach(async (bookingId) => {
      const bId = String(bookingId);
      if (guestsByBooking[bId]) return;
      try {
        const guests = await bookingApi.getGuests(bId).catch(() => []);
        setGuestsByBooking(prev => ({ ...prev, [bId]: guests }));
      } catch (err) {
        setGuestsByBooking(prev => ({ ...prev, [bId]: [] }));
      }
    });
  }, [invoices]);

  const getSelectedRepresentative = (bookingId: number, category: string) => {
    const list = guestsByBooking[String(bookingId)] || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => {
      if (category === 'BOOKING') {
        if (a.primaryGuest && !b.primaryGuest) return -1;
        if (!a.primaryGuest && b.primaryGuest) return 1;
        return 0;
      } else {
        if (a.checkInPerson && !b.checkInPerson) return -1;
        if (!a.checkInPerson && b.checkInPerson) return 1;
        if (a.primaryGuest && !b.primaryGuest) return -1;
        if (!a.primaryGuest && b.primaryGuest) return 1;
        return 0;
      }
    })[0];
  };

  const handleRowClick = async (invoice: PaymentRecord) => {
    try {
      setSelectedInvoice(invoice);
      setDetailsLoading(true);
      setBookingDetails(null);
      setRoomDetails(null);
      setGuestList([]);

      // Fetch booking details
      const booking = await bookingApi.getById(String(invoice.bookingId)).catch(() => null);
      if (booking) {
        setBookingDetails(booking);
        // Fetch room details
        if (booking.roomId) {
          const room = await roomApi.getById(String(booking.roomId)).catch(() => null);
          setRoomDetails(room);
        }
      }
      // Fetch guest list
      const guests = await bookingApi.getGuests(String(invoice.bookingId)).catch(() => []);
      setGuestList(guests);
    } catch (err) {
      console.error('Fetch invoice details error:', err);
      toast.error('Không thể tải chi tiết hóa đơn.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const [summaryData, invoiceData] = await Promise.all([
        staffInvoiceApi.getSummary(),
        staffInvoiceApi.getAll(),
      ]);
      setSummary(summaryData);
      setInvoices(invoiceData);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    
    if (activeCategory !== 'ALL') {
      result = result.filter(inv => getInvoiceCategory(inv) === activeCategory);
    }

    if (timeRange !== 'ALL') {
      const now = new Date();
      result = result.filter(inv => {
        if (!inv.createdAt) return false;
        const invDate = new Date(inv.createdAt);
        
        if (timeRange === 'TODAY') {
          return invDate.toDateString() === now.toDateString();
        }
        
        if (timeRange === 'WEEK') {
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 7);
          
          return invDate >= startOfWeek && invDate < endOfWeek;
        }
        
        if (timeRange === 'MONTH') {
          return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        }
        
        if (timeRange === 'CUSTOM' && customDate) {
          const selected = new Date(customDate);
          return invDate.toDateString() === selected.toDateString();
        }
        
        return true;
      });
    }

    const keyword = searchTerm.trim().toLowerCase();
    if (keyword) {
      result = result.filter((invoice) =>
        [`INV-${invoice.id}`, invoice.bookingId, invoice.userId, invoice.transactionId]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      );
    }
    // Hide cancelled/failed invoices that are not refunds to match backend rule:
    // booking invoices should only show real payment invoices; cancellations without refund shouldn't create visible cancel invoices.
    result = result.filter(inv => {
      const isRefund = (inv.paymentType || '').toUpperCase() === 'REFUND' || ((inv.invoiceCategory || '').toUpperCase() === 'REFUND');
      const isCancelledLike = (inv.status === 'CANCELLED' || inv.status === 'FAILED');
      if (isCancelledLike && !isRefund) return false;
      return true;
    });
    
    return result;
  }, [invoices, searchTerm, activeCategory, timeRange, customDate]);

  const refundStats = useMemo(() => {
    const refundInvoices = invoices.filter((inv) => getInvoiceCategory(inv) === 'REFUND');
    const refundedSuccess = refundInvoices.filter((inv) => normalizeInvoiceStatus(inv) === 'REFUNDED');
    const refundedPending = refundInvoices.filter((inv) => normalizeInvoiceStatus(inv) === 'PENDING');
    const refundAmount = refundInvoices.reduce((sum, inv) => sum + Number(inv.amount || inv.totalAmount || 0), 0);
    return {
      total: refundInvoices.length,
      success: refundedSuccess.length,
      pending: refundedPending.length,
      amount: refundAmount,
    };
  }, [invoices]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Xử lý Hóa đơn</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý dòng tiền: Đặt cọc, Thanh toán Check-in/Checkout và Hoàn trả.</p>
        </div>
        <button 
          onClick={fetchInvoices}
          className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          Làm mới dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-hover hover:shadow-md duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <HiOutlineCurrencyDollar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Tháng {new Date().getMonth() + 1}</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Doanh thu thực tế</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.monthlyRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-hover hover:shadow-md duration-300">
          <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4">
            <HiOutlineClipboardCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tổng tiền đã thu</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.paidTotal)}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">{summary.paidCount} giao dịch thành công</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-hover hover:shadow-md duration-300">
          <div className="p-3 bg-amber-50 rounded-2xl w-fit mb-4">
            <HiOutlineCalendar className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang chờ thanh toán</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.pendingTotal)}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">{summary.pendingCount} hóa đơn chưa tất toán</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-hover hover:shadow-md duration-300">
          <div className="p-3 bg-cyan-50 rounded-2xl w-fit mb-4">
            <HiOutlineCurrencyDollar className="w-6 h-6 text-cyan-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hoàn tiền</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(refundStats.amount)}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">
            {refundStats.success}/{refundStats.total} hóa đơn refund đã thành công · {refundStats.pending} chờ xử lý
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl w-fit">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'BOOKING', label: 'Đặt phòng' },
              { id: 'CHECKIN', label: 'Check-in' },
              { id: 'CHECKOUT', label: 'Checkout' },
              { id: 'REFUND', label: 'Hoàn trả' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeCategory === tab.id 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã, booking, khách..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Date Filter sub-bar */}
        <div className="px-6 py-4 bg-gray-50/30 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider mr-2">Khoảng thời gian:</span>
            <div className="flex items-center p-0.5 bg-gray-100 rounded-xl w-fit">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'TODAY', label: 'Hôm nay' },
                { id: 'WEEK', label: 'Tuần này' },
                { id: 'MONTH', label: 'Tháng này' },
                { id: 'CUSTOM', label: 'Chọn ngày...' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeRange === range.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
              <span className="text-xs font-bold text-gray-400">Chọn ngày:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
               <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm font-bold text-gray-400">Đang đồng bộ hóa đơn...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                <HiOutlineClipboardCheck className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Không tìm thấy hóa đơn</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-[280px]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Giao dịch</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Nghiệp vụ</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Hình thức</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 min-w-[220px]">Booking / Khách</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Số tiền</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Trạng thái</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((invoice) => {
                  const status = normalizeInvoiceStatus(invoice);
                  return (
                    <tr 
                      key={invoice.id} 
                      onClick={() => handleRowClick(invoice)}
                      className="group hover:bg-indigo-50/20 cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-indigo-500"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-indigo-600">INV-{invoice.id}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate max-w-[120px]">{invoice.transactionId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          {getCategoryBadge(getInvoiceCategory(invoice))}
                          {getInvoiceCategory(invoice) === 'REFUND' && (
                            <span className="inline-flex items-center rounded bg-cyan-50 px-1.5 py-0.5 text-[9px] font-black text-cyan-700 uppercase border border-cyan-200 w-fit mt-0.5">
                              {normalizeInvoiceStatus(invoice) === 'REFUNDED' ? 'Hoàn tiền thành công' : 'Hóa đơn hoàn tiền'}
                            </span>
                          )}
                          <span className="text-xs font-bold text-gray-700">{getPaymentTypeLabel(invoice.paymentType)}</span>
                          {invoice.paymentType === 'DEPOSIT' && (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 uppercase border border-amber-200 w-fit mt-0.5">Hóa đơn cọc</span>
                          )}
                          {invoice.paymentType === 'FULL' && (
                            <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 uppercase border border-emerald-200 w-fit mt-0.5">T.Toán 100%</span>
                          )}
                          {invoice.paymentType === 'EARLY_CHECKIN_FEE' && (
                            <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-700 uppercase border border-rose-200 w-fit mt-0.5">
                              Check-in sớm ({invoice.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}: {formatCurrency(invoice.amount || invoice.totalAmount)})
                            </span>
                          )}
                          {invoice.paymentType === 'REMAINING' && (
                            <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black text-indigo-700 uppercase border border-indigo-200 w-fit mt-0.5">
                              Thanh toán còn lại ({invoice.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}: {formatCurrency(invoice.amount || invoice.totalAmount)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {getMethodBadge(invoice.method)}
                      </td>
                      <td className="px-6 py-5 min-w-[220px]">
                        <div className="space-y-2">
                          {/* Booking ID */}
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600">
                              <HiOutlineClipboardCheck className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-black text-gray-900">Booking #{invoice.bookingId}</span>
                          </div>

                          {/* Info card */}
                          {(() => {
                            const category = getInvoiceCategory(invoice);
                            const rep = getSelectedRepresentative(invoice.bookingId, category);
                            const repPhone = rep?.phone || rep?.phoneNumber || '-';
                            const repName = rep?.fullName || 'Chưa có thông tin';
                            const repCccd = rep?.cccd || rep?.idNumber || '-';

                            return (
                              <div className="bg-gray-50/70 rounded-2xl p-3 border border-gray-100/50 space-y-1.5 text-[11px] w-full">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-gray-400 font-bold shrink-0">Tài khoản:</span>
                                  <span className="text-gray-800 font-black truncate max-w-[120px]" title={userNameByUser[invoice.userId] || `User #${invoice.userId}`}>
                                    {userNameByUser[invoice.userId] || `User #${invoice.userId}`}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 border-t border-gray-100/40 pt-1.5">
                                  <span className="text-gray-400 font-bold shrink-0">Đại diện:</span>
                                  <span className="text-gray-800 font-black truncate max-w-[120px]" title={repName}>
                                    {repName}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 border-t border-gray-100/40 pt-1.5">
                                  <span className="text-gray-400 font-bold shrink-0">SĐT:</span>
                                  <span className="text-sky-600 font-black flex items-center gap-1">
                                    <HiOutlinePhone className="w-3 h-3" />
                                    {repPhone}
                                  </span>
                                </div>
                                {category === 'CHECKOUT' && (
                                  <div className="flex items-center justify-between gap-3 border-t border-gray-100/40 pt-1.5">
                                    <span className="text-gray-400 font-bold shrink-0">CCCD:</span>
                                    <span className="text-gray-800 font-black">{repCccd}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{formatCurrency(invoice.amount || invoice.totalAmount)}</span>
                          <span className="text-[10px] text-gray-400 font-bold">Thực nhận: {formatCurrency(invoice.paidAmount)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {getStatusBadge(status)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('vi-VN') : '-'}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal chi tiết hóa đơn */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-5 animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-50 px-8 py-6 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600/10 text-indigo-600 rounded-2xl">
                  <HiOutlineClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Chi tiết Hóa đơn & Giao dịch</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">INV-{selectedInvoice.id}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{selectedInvoice.transactionId}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)} 
                className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-700 transition-all"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {detailsLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-gray-400">Đang truy vấn thông tin lưu trú...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cột trái: Thông tin tổng quan và Khách hàng */}
                  <div className="space-y-6">
                    {/* Hóa đơn & Trạng thái */}
                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/50 space-y-3.5">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông tin giao dịch</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Hình thức</div>
                          <div className="mt-1">{getMethodBadge(selectedInvoice.method)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Trạng thái</div>
                          <div className="mt-1">{getStatusBadge(normalizeInvoiceStatus(selectedInvoice))}</div>
                        </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold">Loại hóa đơn</div>
                            <div className="mt-1">{getCategoryBadge(getInvoiceCategory(selectedInvoice))}</div>
                          </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Mã Booking</div>
                          <div className="mt-1 text-sm font-black text-gray-900">#Booking {selectedInvoice.bookingId}</div>
                        </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold">Mã giao dịch hóa đơn</div>
                            <div className="mt-1 text-sm font-black text-gray-900 break-all">{selectedInvoice.transactionId || '-'}</div>
                          </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Thời gian GD</div>
                          <div className="mt-1 text-sm font-black text-gray-900 flex items-center gap-1">
                            <HiOutlineClock className="w-3.5 h-3.5 text-gray-400" />
                            {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('vi-VN') : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Khách hàng */}
                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/50 space-y-3.5">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Khách hàng đại diện</h4>
                      {guestList.length > 0 ? (
                        <div className="space-y-3">
                          {[
                            [...guestList].sort((a, b) => {
                              const isBookingInvoice = selectedInvoice.invoiceCategory === 'BOOKING';
                              if (isBookingInvoice) {
                                if (a.primaryGuest && !b.primaryGuest) return -1;
                                if (!a.primaryGuest && b.primaryGuest) return 1;
                                return 0;
                              } else {
                                if (a.checkInPerson && !b.checkInPerson) return -1;
                                if (!a.checkInPerson && b.checkInPerson) return 1;
                                if (a.primaryGuest && !b.primaryGuest) return -1;
                                if (!a.primaryGuest && b.primaryGuest) return 1;
                                return 0;
                              }
                            })[0]
                          ].map((guest, idx) => {
                            if (!guest) return null;
                            return (
                              <div key={guest.id || idx} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <HiOutlineUser className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-gray-900">{guest.fullName}</div>
                                    <div className="text-[10px] font-bold text-gray-400">CCCD: {guest.cccd || guest.idNumber || 'Chưa cung cấp'}</div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-600 pl-8 pt-1">
                                  <div>
                                    <span className="text-[10px] text-gray-400 font-bold block">Điện thoại</span>
                                    <span>{guest.phone || guest.phoneNumber || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-400 font-bold block">Email</span>
                                    <span className="truncate block max-w-[150px]">{guest.email || '—'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-gray-400 pl-2">Mã Khách hàng: Khách #{selectedInvoice.userId}</div>
                      )}
                    </div>

                    {/* Phòng số mấy */}
                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/50 space-y-3.5">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông tin Phòng & Lưu trú</h4>
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          <HiOutlineOfficeBuilding className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-indigo-600">
                            {roomDetails ? `Phòng ${roomDetails.roomNumber}` : `Phòng ID ${bookingDetails?.roomId || selectedInvoice.bookingId}`}
                          </div>
                          {roomDetails && (
                            <div className="text-[10px] text-gray-400 font-bold">
                              Tầng {roomDetails.floor} • Loại {roomDetails.roomType?.name || 'Standard'}
                            </div>
                          )}
                        </div>
                      </div>

                      {bookingDetails && (
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600 border-t border-gray-100 pt-3 mt-3">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">Ngày nhận (Check-in)</span>
                            <span className="text-gray-900">{bookingDetails.checkIn}</span>
                            {bookingDetails.actualCheckInAt && (
                              <span className="text-[10px] text-emerald-600 block font-bold text-ellipsis overflow-hidden">
                                Thực tế: {new Date(bookingDetails.actualCheckInAt).toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">Ngày trả (Check-out)</span>
                            <span className="text-gray-900">{bookingDetails.checkOut}</span>
                            {bookingDetails.actualCheckOutAt && (
                              <span className="text-[10px] text-sky-600 block font-bold text-ellipsis overflow-hidden">
                                Thực tế: {new Date(bookingDetails.actualCheckOutAt).toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Nghiệp vụ tài chính (Chi tiết thu / hoàn) */}
                  <div className="space-y-6 flex flex-col justify-between">
                    <div className="space-y-5">
                      <div className="border border-indigo-100 rounded-2xl bg-indigo-50/20 p-5 space-y-4">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Chi tiết nghiệp vụ</h4>
                        {getInvoiceCategory(selectedInvoice) === 'REFUND' && (
                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">
                            Đây là hóa đơn hoàn tiền. Nếu trạng thái là <span className="font-black">Đã hoàn tiền</span>, giao dịch refund đã được ghi nhận thành công.
                          </div>
                        )}
                        
                        {/* ĐỐI TƯỢNG VÀ THỜI GIAN GIAO DỊCH GHI NHẬN TỪ DỮ LIỆU */}
                        {(() => {
                          const representativeGuest = [...guestList].sort((a, b) => {
                            const isBookingInvoice = selectedInvoice.invoiceCategory === 'BOOKING';
                            if (isBookingInvoice) {
                              if (a.primaryGuest && !b.primaryGuest) return -1;
                              if (!a.primaryGuest && b.primaryGuest) return 1;
                              return 0;
                            } else {
                              if (a.checkInPerson && !b.checkInPerson) return -1;
                              if (!a.checkInPerson && b.checkInPerson) return 1;
                              if (a.primaryGuest && !b.primaryGuest) return -1;
                              if (!a.primaryGuest && b.primaryGuest) return 1;
                              return 0;
                            }
                          })[0];
                          const repCccd = representativeGuest?.cccd || representativeGuest?.idNumber;
                          
                          return (
                            <div className="p-3 bg-white rounded-xl border border-indigo-100/50 space-y-2 text-xs">
                              {['REFUND', 'EARLY_CHECKOUT_REFUND'].includes(selectedInvoice.paymentType?.toUpperCase() || '') ? (
                                <div>
                                  <span className="text-[10px] text-gray-400 uppercase font-black block">Người nhận hoàn tiền (Khách hàng)</span>
                                  <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                                    👤 {representativeGuest?.fullName || `Khách hàng đại diện (ID: ${selectedInvoice.userId})`}
                                  </span>
                                  {repCccd && (
                                    <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                                      🆔 CCCD: {repCccd}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[10px] text-gray-400 uppercase font-black block">Người thanh toán (Khách hàng)</span>
                                  <span className="text-gray-950 font-extrabold text-sm block mt-0.5">
                                    👤 {representativeGuest?.fullName || `Khách hàng đại diện (ID: ${selectedInvoice.userId})`}
                                  </span>
                                  {repCccd && (
                                    <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">
                                      🆔 CCCD: {repCccd}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="border-t border-gray-100 pt-2 mt-2">
                                <span className="text-[10px] text-gray-400 uppercase font-black block">Thời gian thanh toán ghi nhận thực tế</span>
                                <span className="text-indigo-600 font-extrabold block mt-0.5">
                                  ⏰ {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('vi-VN') : '-'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* 1. GIAI ĐOẠN CHECK-IN */}
                        {(selectedInvoice.invoiceCategory === 'CHECKIN' || ['DEPOSIT', 'FULL', 'REMAINING', 'EARLY_CHECKIN_FEE'].includes(selectedInvoice.paymentType?.toUpperCase() || '')) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-600 rounded">NHẬN PHÒNG (CHECK-IN)</span>
                            </div>
                            
                            {selectedInvoice.paymentType === 'EARLY_CHECKIN_FEE' ? (
                              <div className="text-xs font-bold text-gray-600 space-y-1">
                                <p className="text-gray-900 font-black">Nghiệp vụ: Check-in Sớm</p>
                                <p className="text-[11px] text-gray-400 font-bold">Khách yêu cầu nhận phòng sớm hơn khung giờ tiêu chuẩn (14:00).</p>
                                <p className="text-rose-600 font-black">Phụ thu phát sinh: +{formatCurrency(selectedInvoice.amount || selectedInvoice.totalAmount)}</p>
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-gray-600 space-y-1">
                                <p className="text-gray-900 font-black">Loại: {getPaymentTypeLabel(selectedInvoice.paymentType)}</p>
                                {bookingDetails?.earlyCheckInFee && bookingDetails.earlyCheckInFee > 0 && (
                                  <div className="flex justify-between items-center text-[11px] text-rose-600 font-bold mt-1">
                                    <span>Trong đó phụ thu check-in sớm:</span>
                                    <span>+{formatCurrency(bookingDetails.earlyCheckInFee)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. GIAI ĐOẠN CHECKOUT */}
                        {(selectedInvoice.invoiceCategory === 'CHECKOUT' || ['LATE_CHECKOUT_FEE'].includes(selectedInvoice.paymentType?.toUpperCase() || '')) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-600 rounded">TRẢ PHÒNG (CHECKOUT)</span>
                            </div>
                            
                            {selectedInvoice.paymentType === 'LATE_CHECKOUT_FEE' && (
                              <div className="text-xs font-bold text-gray-600 space-y-1">
                                <p className="text-gray-900 font-black">Nghiệp vụ: Checkout Trễ</p>
                                <p className="text-[11px] text-gray-400 font-bold">Khách trả phòng muộn hơn khung giờ quy định (12:00).</p>
                                <p className="text-rose-600 font-black">Phụ thu phát sinh: +{formatCurrency(selectedInvoice.amount || selectedInvoice.totalAmount)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. HOÀN TRẢ / HỦY GIAO DỊCH */}
                        {(selectedInvoice.invoiceCategory === 'REFUND' || ['EARLY_CHECKOUT_REFUND', 'REFUND'].includes(selectedInvoice.paymentType?.toUpperCase() || '')) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-black bg-cyan-100 text-cyan-600 rounded">HOÀN TRẢ</span>
                            </div>
                            
                            {selectedInvoice.paymentType === 'EARLY_CHECKOUT_REFUND' ? (
                              <div className="text-xs font-bold text-gray-600 space-y-2">
                                <p className="text-gray-900 font-black">Nghiệp vụ: Hoàn tiền Checkout Sớm</p>
                                <p className="text-[11px] text-gray-400 font-bold">Khách trả phòng sớm hơn ngày dự kiến. Hoàn trả 80% chi phí các đêm chưa sử dụng.</p>
                                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] font-bold border border-emerald-100">
                                  <span>Đã được nhân viên xử lý hoàn tiền thành công!</span>
                                  <span className="block mt-0.5 font-normal text-emerald-600">Thời gian: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('vi-VN') : '-'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-gray-600 space-y-1">
                                <p className="text-gray-900 font-black">Nghiệp vụ: Hoàn trả hủy phòng</p>
                                <p className="text-[11px] text-gray-400 font-bold">Giao dịch hoàn trả tiền cọc cho khách hàng khi hủy phòng theo chính sách.</p>
                              </div>
                            )}
                            <div className="mt-3 rounded-2xl border border-cyan-100 bg-white p-3 text-[11px] font-bold text-gray-700">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-gray-400 uppercase tracking-wider">Số tiền refund</span>
                                <span className="text-cyan-700">{formatCurrency(selectedInvoice.amount || selectedInvoice.totalAmount)}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                                <span className="text-gray-400 uppercase tracking-wider">Trạng thái refund</span>
                                <span className="text-emerald-700">{normalizeInvoiceStatus(selectedInvoice) === 'REFUNDED' ? 'Thành công' : normalizeInvoiceStatus(selectedInvoice)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Net Summary block */}
                    <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tổng tiền hóa đơn</span>
                        <span className="text-lg font-black">{formatCurrency(selectedInvoice.amount || selectedInvoice.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-indigo-300 font-black uppercase tracking-wider">Số tiền thực nhận</span>
                        <span className="text-2xl font-black text-indigo-400">{formatCurrency(selectedInvoice.paidAmount)}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 text-center font-bold pt-2 border-t border-gray-800/50">
                        Hóa đơn được phát hành hợp lệ bởi Hệ thống Khách sạn
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex justify-end gap-3 border-t border-gray-100 px-8 py-5 bg-gray-50/50">
              <button 
                onClick={() => setSelectedInvoice(null)} 
                className="rounded-2xl bg-gray-900 hover:bg-gray-800 px-6 py-2.5 text-sm font-black text-white transition-all shadow-md shadow-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagementPage;
