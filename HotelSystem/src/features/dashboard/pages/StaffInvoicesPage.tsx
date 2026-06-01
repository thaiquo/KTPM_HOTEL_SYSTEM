import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiOutlineCalendar,
  HiOutlineClipboardCheck,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineUser,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

import { bookingApi, newInvoiceApi, staffBookingApi, userApi, type BookingInvoiceRecord, type InvoiceDetailResponse } from '../../../services/api';
import { roomApi } from '../../../services/roomApi';
import type { Booking, BookingGuest, Room } from '../../../types';

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value?: string) => {
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

type NormalizedInvoiceLine = { key: string; roomKey: string; roomName: string; label: string; amount: number };

const resolveRoomKey = (line: any) => {
  if (line.category === 'SERVICE' || line.itemType === 'DRAFT_SERVICE_LINE' || line.itemType === 'BOOKING_SERVICE') return 'SERVICE_GROUP';
  if (line.category === 'ADJUSTMENT' || line.itemType === 'EARLY_CHECKOUT_REFUND') return 'ADJUSTMENT_GROUP';
  if (line.category === 'FEE' || line.itemType === 'DAMAGE_FEE' || line.itemType === 'MANUAL_SURCHARGE' || line.itemType === 'LATE_CHECKOUT_FEE') return 'FEE_GROUP';
  return String(line.bookingRoomId || line.roomNumber || line.roomName || 'UNKNOWN_ROOM');
};

const roomDisplayName = (line: any) => {
  if (line.category === 'SERVICE' || line.itemType === 'DRAFT_SERVICE_LINE' || line.itemType === 'BOOKING_SERVICE') return 'Dịch vụ phát sinh';
  if (line.category === 'ADJUSTMENT' || line.itemType === 'EARLY_CHECKOUT_REFUND') return 'Hoàn tiền / điều chỉnh';
  if (line.category === 'FEE' || line.itemType === 'DAMAGE_FEE' || line.itemType === 'MANUAL_SURCHARGE' || line.itemType === 'LATE_CHECKOUT_FEE') return 'Phụ phí';
  
  if (line?.roomName) return String(line.roomName);
  if (line?.roomNumber) return `Phòng ${line.roomNumber}`;
  return 'Phòng chưa xác định';
};

const itemTypeLabel = (line: any) => {
  // Ưu tiên description từ backend (đã định dạng tên dịch vụ thực tế)
  let label = line.description || line.itemType || 'Khoản phí';
  
  // Dịch một số tên cóc cáy nếu backend lỡ trả raw
  if (label === 'ROOM_CHARGE') label = 'Tiền phòng';
  if (label === 'EARLY_CHECKOUT_REFUND') label = 'Hoàn checkout sớm';
  if (label === 'LATE_CHECKOUT_FEE') label = 'Phụ thu checkout trễ';
  if (label === 'DAMAGE_FEE') label = 'Phí hư hỏng';
  if (label === 'SERVICE_CHARGE' || label === 'MANUAL_SURCHARGE') label = 'Phụ thu';
  if (label === 'DRAFT_SERVICE_LINE' || label === 'BOOKING_SERVICE') label = 'Dịch vụ';
  
  // Nếu quantity > 1, nối thêm số lượng
  if (line.quantity && line.quantity > 1 && !label.includes('×')) {
    label += ` × ${line.quantity}`;
  }
  return label;
};

const normalizeInvoiceLines = (lines: any): NormalizedInvoiceLine[] => {
  if (!lines || typeof lines !== 'object') return [];
  const result: NormalizedInvoiceLine[] = [];
  const push = (key: string, label: string, amount: number) => {
    if (amount !== 0) result.push({ key, roomKey: 'summary', roomName: 'Tong ket', label, amount });
  };
  const appendSettlementLines = () => {
    const originalAmount = Number(lines.totalOriginalAmount ?? lines.roomTotal ?? 0);
    const actualRevenue = Number(lines.totalActualRevenue ?? lines.actualRoomCharge ?? lines.grandTotal ?? 0);
    const earlyRefund = Number(lines.totalEarlyCheckoutRefund ?? lines.earlyCheckoutAdjustment ?? 0);
    const paidAmount = Number(lines.totalPaidAmount ?? lines.paidAmount ?? 0);
    if (!Array.isArray(lines.invoiceItems)) push('roomTotal', 'Tien phong goc', originalAmount);
    push('earlyCheckoutRefund', 'Hoan tra checkout som', earlyRefund > 0 ? -earlyRefund : 0);
    push('actualRevenue', 'Doanh thu thuc thu', actualRevenue);
    push('paidAmount', 'Da thanh toan/coc', paidAmount > 0 ? -paidAmount : 0);
  };
  if (Array.isArray(lines.invoiceItems)) {
    lines.invoiceItems.forEach((line: any, index: number) => {
      const amount = Number(line.amount || line.lineTotal || 0);
      if (amount === 0) return;
      const roomName = roomDisplayName(line);
      const roomKey = resolveRoomKey(line);
      
      // Xóa tiền tố "Phòng X - " nếu description backend lỡ nhét dư thừa vô
      let cleanLabel = itemTypeLabel(line);
      if (line.roomNumber && String(cleanLabel).startsWith(`Phòng ${line.roomNumber} - `)) {
         cleanLabel = String(cleanLabel).replace(`Phòng ${line.roomNumber} - `, '');
      }

      result.push({
        key: String(line._id || `${line.bookingRoomId || 'room'}-${line.itemType || 'item'}-${line.serviceId || 'none'}-${index}`),
        roomKey: roomKey,
        roomName: roomName,
        label: cleanLabel,
        amount,
      });
    });
    appendSettlementLines();
    if (result.length > 0) return result;
  }

  const pushDetail = (key: string, label: string, amount: number) => {
    if (amount !== 0) result.push({ key, roomKey: 'unknown', roomName: 'Chi tiết', label, amount });
  };

  push('roomTotal', 'Tiền phòng (tổng)', Number(lines.roomTotal || 0));
  push('actualRoomCharge', 'Tiền phòng thực tế', Number(lines.actualRoomCharge || 0));
  push('remaining', 'Phần còn lại', Number(lines.remainingRoomAmount || 0));
  push('lateFee', 'Phụ thu checkout trễ', Number(lines.lateFee || 0));
  if (Array.isArray(lines.serviceLines)) {
    lines.serviceLines.forEach((line: any, index: number) => {
      result.push({
        key: `service-${line.id || index}`,
        roomKey: 'unknown',
        roomName: 'Chi tiết',
        label: `${line.name || 'Dịch vụ'} ×${line.quantity || 1}`,
        amount: Number(line.lineTotal || 0),
      });
    });
  }
  // Hoàn tiền được hiển thị âm
  const refundAmt = Number(lines.refundSettlementAmount || lines.refund || 0);
  if (refundAmt > 0) push('refund', 'Hoàn tiền checkout sớm', -refundAmt);
  return result;
};

const groupInvoiceLinesByRoom = (lines: NormalizedInvoiceLine[]) => {
  const groups = new Map<string, { roomName: string; lines: NormalizedInvoiceLine[] }>();
  lines.forEach((line) => {
    const key = line.roomKey || line.roomName;
    const group = groups.get(key) || { roomName: line.roomName, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  });
  return Array.from(groups.values());
};

const getInvoiceStatus = (invoice: BookingInvoiceRecord) => {
  if (invoice.refundStatus === 'REFUNDED' || invoice.refundStatus === 'SUCCESS') return 'REFUNDED';
  if (invoice.refundStatus === 'ASSIGNED' || invoice.refundStatus === 'PENDING' || invoice.refundStatus === 'PROCESSING') return 'REFUND_PENDING';
  return invoice.bookingStatus || 'COMPLETED';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'REFUNDED': return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'REFUND_PENDING': return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'COMPLETED': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default: return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'REFUNDED': return 'Đã hoàn tiền';
    case 'REFUND_PENDING': return 'Chờ hoàn tiền';
    case 'COMPLETED': return 'Đã checkout';
    default: return status;
  }
};

const staffName = (id?: string, names?: Record<string, string>) => {
  if (!id) return '-';
  if (id === 'MULTIPLE') return 'Nhiều nhân viên';
  return names?.[id] || `Nhân viên #${id}`;
};

const getBookingRoomIds = (booking?: Booking | null) => {
  if (!booking) return [];
  const itemIds = (booking.items || []).map((item) => item.roomId).filter(Boolean);
  if (itemIds.length > 0) return Array.from(new Set(itemIds));
  return booking.roomId ? [booking.roomId] : [];
};

// ── Date range helpers ─────────────────────────────────────────────
type DateRangeOption = 'ALL' | 'TODAY' | 'YESTERDAY' | 'MONTH' | 'CUSTOM';

const getDateRange = (option: DateRangeOption, from: string, to: string): { fromDate?: string; toDate?: string } => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  switch (option) {
    case 'TODAY': { const t = fmt(today); return { fromDate: t, toDate: t }; }
    case 'YESTERDAY': { const y = new Date(today); y.setDate(today.getDate() - 1); const ys = fmt(y); return { fromDate: ys, toDate: ys }; }
    case 'MONTH': { const m = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); return { fromDate: m, toDate: fmt(today) }; }
    case 'CUSTOM': return { fromDate: from || undefined, toDate: to || undefined };
    default: return {};
  }
};

// ──────────────────────────────────────────────────────────────────

const StaffInvoicesPage: React.FC = () => {
  const { invoiceId } = useParams();
  const hasFetched = useRef(false);
  const fetchedUserIds = useRef(new Set<string>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [invoices, setInvoices] = useState<BookingInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REFUND_PENDING' | 'REFUNDED'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<BookingInvoiceRecord | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [guestList, setGuestList] = useState<BookingGuest[]>([]);
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const [isSearched, setIsSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchInvoices = async (pageNum = 0) => {
    try {
      setLoading(true);
      setError('');
      setIsSearched(true);

      const params: any = { page: pageNum, size: 10 };
      const term = searchTerm.trim();
      if (term) {
        if (term.toUpperCase().startsWith('INV-')) {
          params.invoiceCode = term.substring(4);
        } else if (term.toUpperCase().startsWith('BK-')) {
          params.bookingCode = term;
        } else if (!isNaN(Number(term))) {
          params.bookingCode = term;
        } else {
          params.customerName = term;
        }
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'COMPLETED') params.status = ['COMPLETED'];
        if (statusFilter === 'REFUND_PENDING') params.status = ['ASSIGNED', 'PENDING', 'PROCESSING'];
        if (statusFilter === 'REFUNDED') params.status = ['REFUNDED', 'SUCCESS'];
      }

      const { fromDate, toDate } = getDateRange(dateRange, customFrom, customTo);
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const result = await staffBookingApi.searchInvoices(params);
      setInvoices(result.content || []);
      setTotalPages(result.totalPages || 0);
      setTotalElements(result.totalElements || 0);
      setPage(pageNum);
    } catch (error: any) {
      const message = error?.userMessage || error?.response?.data?.message || 'Không thể tải danh sách hóa đơn';
      setError(message);
      toast.error(message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchInvoices(0);

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateRange('ALL');
    setCustomFrom('');
    setCustomTo('');
    setIsSearched(false);
    setInvoices([]);
    setPage(0);
    setTotalPages(0);
    setTotalElements(0);
    setError('');
  };

  // Quick filter triggers search automatically
  const handleQuickFilter = (opt: DateRangeOption) => {
    setDateRange(opt);
    if (opt !== 'CUSTOM') {
      // auto search when non-custom
      setTimeout(() => fetchInvoices(0), 0);
    }
  };

  useEffect(() => {
    // Only auto-fetch if URL has invoiceId
    if (invoiceId && !isSearched) {
      const term = invoiceId.replace('INV-', '');
      setSearchTerm(term);
      fetchInvoices(0);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId || invoices.length === 0 || selectedInvoice?.id === invoiceId) return;
    const invoice = invoices.find((item) => String(item.id) === String(invoiceId));
    if (invoice) openInvoiceDetails(invoice);
  }, [invoiceId, invoices, selectedInvoice?.id]);

  useEffect(() => {
    const ids = Array.from(new Set(
      invoices.flatMap((invoice) => [invoice.customerUserId, invoice.checkoutStaffId, invoice.checkinStaffId])
        .filter((id): id is string => Boolean(id) && id !== 'MULTIPLE'),
    ));
    ids.forEach(async (id) => {
      if (userNames[id] || fetchedUserIds.current.has(id)) return;
      fetchedUserIds.current.add(id);
      try {
        const response = await userApi.getUserById(Number(id));
        const name = response.data?.data?.name
          || response.data?.data?.fullName
          || response.data?.name
          || response.data?.fullName
          || `User #${id}`;
        setUserNames((prev) => ({ ...prev, [id]: name }));
      } catch {
        setUserNames((prev) => ({ ...prev, [id]: `User #${id}` }));
      }
    });
  }, [invoices, userNames]);

  const filteredInvoices = invoices;

  const openInvoiceDetails = async (invoice: BookingInvoiceRecord) => {
    setSelectedInvoice(invoice);
    setInvoiceDetail(null);
    setDetailLoading(true);
    setBookingDetails(null);
    setGuestList([]);
    setRoomList([]);
    try {
      const [detail, booking, guests] = await Promise.all([
        newInvoiceApi.getDetail(Number(invoice.id)).catch(() => null),
        bookingApi.getById(invoice.bookingId).catch(() => null),
        bookingApi.getGuests(invoice.bookingId).catch(() => []),
      ]);
      setInvoiceDetail(detail);
      setBookingDetails(booking);
      setGuestList(guests);
      const roomIds = getBookingRoomIds(booking);
      if (roomIds.length > 0) {
        const rooms = await Promise.all(roomIds.map((roomId) => roomApi.getById(roomId).catch(() => null)));
        setRoomList(rooms.filter((room): room is Room => Boolean(room)));
      }
    } catch (error) {
      console.error('Invoice detail load failed:', error);
      toast.error('Không thể tải chi tiết hóa đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalInvoiceAmount = useMemo(
    () => filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [filteredInvoices],
  );

  const refundPendingCount = filteredInvoices.filter((inv) => getInvoiceStatus(inv) === 'REFUND_PENDING').length;
  const detailSummary = invoiceDetail?.revenueSummary;
  const detailCustomer = invoiceDetail?.customer;
  const detailRooms = invoiceDetail?.rooms || [];
  const detailLines = invoiceDetail ? {
    invoiceItems: invoiceDetail.invoiceLines,
    totalOriginalAmount: detailSummary?.grossInvoiceAmount,
    totalActualRevenue: detailSummary?.totalActualRevenue ?? detailSummary?.netRevenue,
    totalEarlyCheckoutRefund: detailSummary?.totalEarlyCheckoutRefundAmount,
    amountPaid: detailSummary?.totalPaidAmount,
    serviceTotal: Number(detailSummary?.totalServiceAmount || 0) + Number(detailSummary?.totalDamageAmount || 0),
    additionalRefundAmount: detailSummary?.additionalRefundAmount ?? detailSummary?.refundToCustomer,
    refundSettlementAmount: detailSummary?.refundToCustomer,
    additionalChargeAmount: detailSummary?.additionalChargeAmount,
    remainingBalance: detailSummary?.remainingToPay ?? detailSummary?.remainingAmount,
  } : selectedInvoice?.lines;
  const detailStatus = invoiceDetail?.refundStatus === 'PENDING'
    ? 'REFUND_PENDING'
    : invoiceDetail?.refundStatus === 'COMPLETED'
      ? 'REFUNDED'
      : selectedInvoice
        ? getInvoiceStatus(selectedInvoice)
        : 'COMPLETED';
  const detailCheckinStaff = invoiceDetail?.checkinStaffName
    || invoiceDetail?.checkinStaff
    || staffName(invoiceDetail?.checkinStaffId || selectedInvoice?.checkinStaffId, userNames);
  const detailCheckoutStaff = invoiceDetail?.checkoutStaffName
    || invoiceDetail?.checkoutStaff
    || staffName(invoiceDetail?.checkoutStaffId || selectedInvoice?.checkoutStaffId, userNames);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Xử lý Hóa đơn Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Lọc và theo dõi hóa đơn checkout, hoàn tiền và nhân viên xử lý.</p>
        </div>
      </div>

      {/* Summary cards */}
      {isSearched && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><HiOutlineClipboardCheck className="h-6 w-6" /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Tổng hóa đơn</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{totalElements}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><HiOutlineCalendar className="h-6 w-6" /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Tổng giá trị</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{formatCurrency(totalInvoiceAmount)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><HiOutlineUser className="h-6 w-6" /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Chờ hoàn tiền</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{refundPendingCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'COMPLETED', label: 'Đã checkout' },
              { id: 'REFUND_PENDING', label: 'Chờ hoàn tiền' },
              { id: 'REFUNDED', label: 'Đã hoàn tiền' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setStatusFilter(option.id as typeof statusFilter)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  statusFilter === option.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Date quick filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thời gian:</span>
            {([
              { id: 'ALL', label: 'Tất cả thời gian' },
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'YESTERDAY', label: 'Hôm qua' },
              { id: 'MONTH', label: 'Tháng này' },
              { id: 'CUSTOM', label: 'Từ ngày – đến ngày' },
            ] as { id: DateRangeOption; label: string }[]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleQuickFilter(opt.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${
                  dateRange === opt.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {dateRange === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 px-5 py-3 bg-indigo-50/30 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500">Từ ngày:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500">Đến ngày:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 min-w-0">
            <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm theo mã hóa đơn, booking, tên khách hàng..."
              className="w-full rounded-2xl border border-gray-200 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-sm shadow-indigo-200"
            >
              <HiOutlineSearch className="h-4 w-4" />
              Tìm kiếm
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-600 hover:bg-gray-50 transition-all"
            >
              <HiOutlineRefresh className="h-4 w-4" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-400">Đang tải hóa đơn...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="text-sm font-bold text-rose-600">{error}</div>
            <button
              onClick={() => fetchInvoices(0)}
              className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
            >
              Thử lại
            </button>
          </div>
        ) : !isSearched ? (
          <div className="py-28 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-lg font-bold text-gray-600">Nhập tiêu chí và nhấn Tìm kiếm để xem hóa đơn</div>
            <div className="text-sm text-gray-400 mt-2">Hoặc chọn bộ lọc thời gian nhanh bên trên để tìm kiếm ngay.</div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-24 text-center text-sm font-bold text-gray-400">Không có hóa đơn phù hợp với bộ lọc</div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Mã hóa đơn</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Booking</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Khách hàng</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Nhân viên</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Ngày tạo</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Số tiền</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => {
                    const status = getInvoiceStatus(invoice);
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => openInvoiceDetails(invoice)}
                        className="cursor-pointer transition hover:bg-slate-50 border-l-4 border-l-transparent hover:border-l-indigo-500"
                      >
                        <td className="px-6 py-4">
                          <div className="font-black text-indigo-600">INV-{invoice.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">#{invoice.bookingId}</div>
                          <div className="text-xs font-medium text-slate-500">{invoice.bookingCode || 'Không có mã'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{invoice.customerName || invoice.representativeName || 'Khách đại diện'}</div>
                          <div className="text-xs font-medium text-slate-500">{invoice.representativePhone || userNames[invoice.customerUserId || ''] || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{staffName(invoice.checkoutStaffId, userNames)}</div>
                          <div className="text-xs font-medium text-slate-500">ID: {invoice.checkoutStaffId || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatDateTime(invoice.createdAt)}</td>
                        <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(invoice.amount || 0)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(status)}`}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <span className="text-sm font-medium text-gray-400">
                Trang {page + 1} / {totalPages} (Tổng cộng {totalElements} hóa đơn)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchInvoices(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  ← Trước
                </button>
                <button
                  onClick={() => fetchInvoices(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div onClick={() => setSelectedInvoice(null)} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div onClick={(event) => event.stopPropagation()} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/30">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-600">Chi tiết hóa đơn</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{invoiceDetail?.invoiceCode || `INV-${selectedInvoice.id}`}</h2>
                <div className="mt-2 text-sm font-medium text-slate-500">
                  Booking #{invoiceDetail?.bookingId || selectedInvoice.bookingId} · {formatDateTime(invoiceDetail?.createdAt || selectedInvoice.createdAt)}
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full border border-gray-200 p-3 text-gray-500 hover:bg-gray-50 transition-all"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-gray-400">Đang tải chi tiết hóa đơn...</p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-5">
                    {/* Thông tin booking */}
                    <div className="rounded-[1.5rem] border border-gray-100 bg-slate-50 p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Thông tin booking</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-bold text-slate-400">Mã booking</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{invoiceDetail?.bookingCode || selectedInvoice.bookingCode || `#${selectedInvoice.bookingId}`}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Trạng thái booking</div>
                          <div className="mt-1">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${getStatusBadgeClass(detailStatus)}`}>
                              {getStatusLabel(detailStatus)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Ngày nhận phòng</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.checkInDate || detailRooms[0]?.checkInDate || bookingDetails?.checkIn || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Ngày trả phòng</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.checkOutDate || detailRooms[0]?.plannedCheckoutDate || bookingDetails?.checkOut || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Khách hàng */}
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Khách hàng</div>
                      <div className="space-y-2">
                        <div className="text-xl font-black text-slate-950">{detailCustomer?.fullName || selectedInvoice.customerName || selectedInvoice.representativeName || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">Số điện thoại: {detailCustomer?.phone || selectedInvoice.representativePhone || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">CCCD: {detailCustomer?.cccd || selectedInvoice.representativeCccd || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">Tài khoản: {userNames[selectedInvoice.customerUserId || ''] || selectedInvoice.customerUserId || '-'}</div>
                      </div>
                      {guestList.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {guestList.map((guest) => (
                            <span key={guest.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                              {guest.fullName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Danh sách phòng */}
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Danh sách phòng</div>
                      <div className="grid gap-3">
                        {detailRooms.length > 0 ? detailRooms.map((room) => (
                          <div key={room.roomCode || room.roomName} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-black text-slate-950">{room.roomName || `Phòng ${room.roomCode || '-'}`}</div>
                            <div className="mt-1 text-xs font-medium text-slate-600">
                              {room.roomType || 'Loại phòng'} · {room.roomStatus || 'CHECKED_OUT'} · {formatCurrency(room.netRevenue || 0)}
                            </div>
                          </div>
                        )) : roomList.length > 0 ? roomList.map((room) => (
                          <div key={room.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-black text-slate-950">Phòng {room.roomNumber}</div>
                            <div className="mt-1 text-xs font-medium text-slate-600">
                              {room.roomType?.type || 'Loại phòng'} · {room.viewType || 'Không có hướng nhìn'} · {room.areaM2 || 0} m²
                            </div>
                          </div>
                        )) : (
                          <div className="text-sm font-medium text-slate-500">Chưa có chi tiết phòng.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Nhân viên */}
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Nhân viên xử lý</div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-bold text-slate-400">Nhân viên check-in</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{detailCheckinStaff}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Nhân viên check-out</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{detailCheckoutStaff}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Thời gian check-out</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{formatDateTime(invoiceDetail?.checkoutTime || selectedInvoice.checkedOutAt)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết hóa đơn */}
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Chi tiết hóa đơn</div>
                      <div className="space-y-3">
                        {groupInvoiceLinesByRoom(normalizeInvoiceLines(detailLines)).map((group) => (
                          <div key={group.roomName} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="mb-3 text-sm font-black text-slate-950">{group.roomName}</div>
                            <div className="space-y-2">
                              {group.lines.map((line) => (
                                <div key={line.key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                                  <div className="text-sm font-bold text-slate-700">{line.label}</div>
                                  <div className={`text-sm font-black ${line.amount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>
                                    {line.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(line.amount))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {(() => {
                          const lines = detailLines as any;
                          const originalRoom = Number(lines?.roomCharge ?? lines?.totalOriginalAmount ?? lines?.roomTotal ?? 0);
                          const earlyRefund = Number(lines?.totalEarlyCheckoutRefund ?? lines?.earlyCheckoutAdjustment ?? 0);
                          const serviceFeeTotal = Number(lines?.serviceTotal ?? 0);
                          
                          const actualRevenue = Number(lines?.totalActualRevenue ?? lines?.grandTotal ?? selectedInvoice.amount ?? 0);
                          const finalAmt = Number(lines?.additionalChargeAmount ?? lines?.remainingBalance ?? 0);
                          const refundAmt = Number(lines?.additionalRefundAmount ?? lines?.refundSettlementAmount ?? 0);
                          const amountPaid = Number(lines?.amountPaid ?? 0);

                          return (
                            <div className="space-y-4">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                                <div className="flex justify-between text-sm font-bold text-slate-600">
                                  <span>Tiền phòng gốc</span>
                                  <span>{formatCurrency(originalRoom)}</span>
                                </div>
                                {earlyRefund > 0 && (
                                  <div className="flex justify-between text-sm font-bold text-emerald-600">
                                    <span>Hoàn checkout sớm</span>
                                    <span>-{formatCurrency(earlyRefund)}</span>
                                  </div>
                                )}
                                {serviceFeeTotal > 0 && (
                                  <div className="flex justify-between text-sm font-bold text-slate-600">
                                    <span>Tổng phí dịch vụ / phụ thu</span>
                                    <span>{formatCurrency(serviceFeeTotal)}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                <div className="text-sm font-black text-slate-950">Doanh thu thực thu</div>
                                <div className="text-xl font-black text-slate-950">{formatCurrency(actualRevenue)}</div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-black text-slate-500">Đã thanh toán / cọc</div>
                                <div className="text-sm font-black text-slate-500">{formatCurrency(amountPaid)}</div>
                              </div>

                              {refundAmt > 0 && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 flex items-center justify-between">
                                  <span>Khách được hoàn tiền</span>
                                  <span className="text-lg font-black text-emerald-700">{formatCurrency(refundAmt)}</span>
                                </div>
                              )}
                              {finalAmt > 0 && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800 flex items-center justify-between">
                                  <span>Còn phải thanh toán</span>
                                  <span className="text-lg font-black text-rose-700">{formatCurrency(finalAmt)}</span>
                                </div>
                              )}
                              {refundAmt === 0 && finalAmt === 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500 flex justify-center">
                                  Đã thanh toán đủ
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Refund transaction */}
                        {(invoiceDetail?.refundHistory.records.length || selectedInvoice.refundTransactionId) ? (
                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">
                            {invoiceDetail?.refundHistory.records.length
                              ? invoiceDetail.refundHistory.records.map((refund, index) => (
                                <div key={`${refund.time || 'refund'}-${index}`} className="flex items-center justify-between gap-3">
                                  <span>{refund.reason || 'Hoàn tiền checkout sớm'} · {formatDateTime(refund.time)}</span>
                                  <span>{formatCurrency(refund.amount)}</span>
                                </div>
                              ))
                              : (
                                <>
                                  Hoàn tiền #{selectedInvoice.refundTransactionId} · {selectedInvoice.refundStatus || 'PENDING'}
                                  {selectedInvoice.refundSettlementAmount ? ` · ${formatCurrency(selectedInvoice.refundSettlementAmount)}` : ''}
                                </>
                              )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffInvoicesPage;
