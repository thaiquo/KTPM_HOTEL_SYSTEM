import React, { useEffect, useMemo, useState } from 'react';
import { HiOutlineCalendar, HiOutlineClipboardCheck, HiOutlineSearch, HiOutlineUser, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';

import { bookingApi, staffBookingApi, userApi, type BookingInvoiceRecord } from '../../../services/api';
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

const normalizeInvoiceLines = (lines: any) => {
  if (!lines || typeof lines !== 'object') return [];
  const result: Array<{ key: string; label: string; amount: number }> = [];
  if (Number(lines.roomTotal || 0) > 0) result.push({ key: 'room', label: 'Tien phong', amount: Number(lines.roomTotal || 0) });
  if (Number(lines.remainingRoomAmount || 0) > 0) result.push({ key: 'remaining', label: 'Phan con lai', amount: Number(lines.remainingRoomAmount || 0) });
  if (Number(lines.lateFee || 0) > 0) result.push({ key: 'lateFee', label: 'Phu thu checkout tre', amount: Number(lines.lateFee || 0) });
  if (Array.isArray(lines.serviceLines)) {
    lines.serviceLines.forEach((line: any, index: number) => {
      result.push({
        key: `service-${line.id || index}`,
        label: `${line.name || 'Dich vu'} x${line.quantity || 1}`,
        amount: Number(line.lineTotal || 0),
      });
    });
  }
  if (Number(lines.refundSettlementAmount || 0) > 0) {
    result.push({ key: 'refundSettlement', label: 'Hoan tien thuc tra', amount: -Number(lines.refundSettlementAmount || 0) });
  } else if (Number(lines.refund || 0) > 0) {
    result.push({ key: 'refundPreview', label: 'Gia tri refund quy doi', amount: -Number(lines.refund || 0) });
  }
  return result;
};

const getInvoiceStatus = (invoice: BookingInvoiceRecord) => {
  if (invoice.refundStatus === 'REFUNDED' || invoice.refundStatus === 'SUCCESS') return 'REFUNDED';
  if (invoice.refundStatus === 'ASSIGNED' || invoice.refundStatus === 'PENDING' || invoice.refundStatus === 'PROCESSING') return 'REFUND_PENDING';
  return invoice.bookingStatus || 'COMPLETED';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'REFUNDED':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'REFUND_PENDING':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'REFUNDED':
      return 'Da hoan tien';
    case 'REFUND_PENDING':
      return 'Cho hoan tien';
    case 'COMPLETED':
      return 'Da checkout';
    default:
      return status;
  }
};

const getBookingRoomIds = (booking?: Booking | null) => {
  if (!booking) return [];
  const itemIds = (booking.items || []).map((item) => item.roomId).filter(Boolean);
  if (itemIds.length > 0) return Array.from(new Set(itemIds));
  return booking.roomId ? [booking.roomId] : [];
};

const StaffInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<BookingInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REFUND_PENDING' | 'REFUNDED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<BookingInvoiceRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [guestList, setGuestList] = useState<BookingGuest[]>([]);
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const result = await staffBookingApi.getInvoices();
      setInvoices(result || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Khong the tai danh sach hoa don');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const ids = Array.from(new Set(
      invoices.flatMap((invoice) => [invoice.customerUserId, invoice.checkoutStaffId, invoice.checkinStaffId]).filter(Boolean) as string[]
    ));
    ids.forEach(async (id) => {
      if (userNames[id]) return;
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

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const keyword = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const status = getInvoiceStatus(invoice);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;

      if (dateFilter !== 'ALL' && invoice.createdAt) {
        const created = new Date(invoice.createdAt);
        if (dateFilter === 'TODAY' && created.toDateString() !== now.toDateString()) return false;
        if (dateFilter === 'MONTH' && (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear())) return false;
      }

      if (!keyword) return true;
      const searchText = [
        `INV-${invoice.id}`,
        invoice.bookingId,
        invoice.bookingCode,
        invoice.customerName,
        invoice.representativeName,
        invoice.customerUserId,
        userNames[invoice.checkoutStaffId || ''],
        userNames[invoice.customerUserId || ''],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(keyword);
    });
  }, [dateFilter, invoices, searchTerm, statusFilter, userNames]);

  const openInvoiceDetails = async (invoice: BookingInvoiceRecord) => {
    setSelectedInvoice(invoice);
    setDetailLoading(true);
    setBookingDetails(null);
    setGuestList([]);
    setRoomList([]);
    try {
      const booking = await bookingApi.getById(invoice.bookingId).catch(() => null);
      const guests = await bookingApi.getGuests(invoice.bookingId).catch(() => []);
      setBookingDetails(booking);
      setGuestList(guests);
      const roomIds = getBookingRoomIds(booking);
      if (roomIds.length > 0) {
        const rooms = await Promise.all(roomIds.map((roomId) => roomApi.getById(roomId).catch(() => null)));
        setRoomList(rooms.filter((room): room is Room => Boolean(room)));
      }
    } catch (error) {
      console.error('Invoice detail load failed:', error);
      toast.error('Khong the tai chi tiet hoa don');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalInvoiceAmount = useMemo(
    () => filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [filteredInvoices],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard hoa don checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Loc va theo doi hoa don checkout, refund va nhan vien xu ly.</p>
        </div>
        <button
          onClick={fetchInvoices}
          className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
        >
          Lam moi
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <HiOutlineClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Tong hoa don</div>
              <div className="mt-1 text-2xl font-black text-gray-900">{filteredInvoices.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <HiOutlineCalendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Tong gia tri</div>
              <div className="mt-1 text-2xl font-black text-gray-900">{formatCurrency(totalInvoiceAmount)}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <HiOutlineUser className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Dang cho refund</div>
              <div className="mt-1 text-2xl font-black text-gray-900">
                {filteredInvoices.filter((invoice) => getInvoiceStatus(invoice) === 'REFUND_PENDING').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Tat ca' },
              { id: 'COMPLETED', label: 'Da checkout' },
              { id: 'REFUND_PENDING', label: 'Cho refund' },
              { id: 'REFUNDED', label: 'Da refund' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setStatusFilter(option.id as typeof statusFilter)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                  statusFilter === option.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
            >
              <option value="ALL">Tat ca thoi gian</option>
              <option value="TODAY">Hom nay</option>
              <option value="MONTH">Thang nay</option>
            </select>
            <div className="relative min-w-[280px]">
              <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tim theo invoice, booking, khach hang, nhan vien..."
                className="w-full rounded-2xl border border-gray-200 py-2 pl-11 pr-4 text-sm font-medium text-gray-700"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm font-bold text-gray-400">Dang tai hoa don...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-24 text-center text-sm font-bold text-gray-400">Khong co hoa don phu hop bo loc</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">ID hoa don</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Khach hang</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Nhan vien</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Ngay tao</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">So tien</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Trang thai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const status = getInvoiceStatus(invoice);
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => openInvoiceDetails(invoice)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">INV-{invoice.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">#{invoice.bookingId}</div>
                        <div className="text-xs font-medium text-slate-500">{invoice.bookingCode || 'Khong co ma'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">{invoice.customerName || invoice.representativeName || 'Khach dai dien'}</div>
                        <div className="text-xs font-medium text-slate-500">{invoice.representativePhone || userNames[invoice.customerUserId || ''] || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">{userNames[invoice.checkoutStaffId || ''] || '-'}</div>
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
        )}
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Invoice detail</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">INV-{selectedInvoice.id}</h2>
                <div className="mt-2 text-sm font-medium text-slate-500">
                  Booking #{selectedInvoice.bookingId} · {formatDateTime(selectedInvoice.createdAt)}
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full border border-gray-200 p-3 text-gray-500 hover:bg-gray-50"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="py-20 text-center text-sm font-bold text-gray-400">Dang tai chi tiet hoa don...</div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-gray-100 bg-slate-50 p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Thong tin booking</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-bold text-slate-400">Ma booking</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.bookingCode || `#${selectedInvoice.bookingId}`}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Trang thai</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.bookingStatus || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Ngay nhan</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.checkInDate || bookingDetails?.checkIn || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Ngay tra</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.checkOutDate || bookingDetails?.checkOut || '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Khach hang</div>
                      <div className="mt-4 space-y-3">
                        <div className="text-xl font-black text-slate-950">{selectedInvoice.customerName || selectedInvoice.representativeName || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">So dien thoai: {selectedInvoice.representativePhone || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">CCCD: {selectedInvoice.representativeCccd || '-'}</div>
                        <div className="text-sm font-medium text-slate-600">User: {userNames[selectedInvoice.customerUserId || ''] || selectedInvoice.customerUserId || '-'}</div>
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

                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Danh sach phong</div>
                      <div className="mt-4 grid gap-3">
                        {roomList.length > 0 ? roomList.map((room) => (
                          <div key={room.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-black text-slate-950">Phong {room.roomNumber}</div>
                            <div className="mt-1 text-xs font-medium text-slate-600">
                              {room.roomType?.type || 'Loai phong'} · {room.viewType || 'No view'} · {room.areaM2 || 0} m2
                            </div>
                          </div>
                        )) : (
                          <div className="text-sm font-medium text-slate-500">Chua co chi tiet phong.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nhan vien xu ly</div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="text-xs font-bold text-slate-400">Nhan vien check-in</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{userNames[selectedInvoice.checkinStaffId || ''] || selectedInvoice.checkinStaffId || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Nhan vien check-out</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{userNames[selectedInvoice.checkoutStaffId || ''] || selectedInvoice.checkoutStaffId || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400">Thoi gian check-out</div>
                          <div className="mt-1 text-sm font-black text-slate-900">{formatDateTime(selectedInvoice.checkedOutAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Chi tiet hoa don</div>
                      <div className="mt-4 space-y-3">
                        {normalizeInvoiceLines(selectedInvoice.lines).map((line) => (
                          <div key={line.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-sm font-bold text-slate-700">{line.label}</div>
                            <div className={`text-sm font-black ${line.amount < 0 ? 'text-emerald-700' : 'text-slate-950'}`}>
                              {line.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(line.amount))}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                          <div className="text-sm font-black text-slate-950">Tong hoa don</div>
                          <div className="text-xl font-black text-slate-950">{formatCurrency(selectedInvoice.amount || 0)}</div>
                        </div>
                        {selectedInvoice.refundTransactionId && (
                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">
                            Refund #{selectedInvoice.refundTransactionId} · {selectedInvoice.refundStatus || 'PENDING'}
                            {selectedInvoice.refundSettlementAmount ? ` · ${formatCurrency(selectedInvoice.refundSettlementAmount)}` : ''}
                          </div>
                        )}
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
