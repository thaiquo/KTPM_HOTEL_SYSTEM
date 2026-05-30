import React, { useState, useCallback } from 'react';
import {
  HiOutlineSearch, HiX, HiOutlineRefresh, HiOutlineDocumentText,
  HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineTrendingDown,
  HiOutlineReceiptRefund, HiOutlineCalendar, HiOutlineChevronLeft,
  HiOutlineChevronRight, HiOutlineUser, HiOutlinePhone, HiOutlineIdentification,
  HiOutlineHome, HiOutlineClipboardList, HiOutlineExclamationCircle,
  HiOutlineClock, HiOutlineChevronDown,
} from 'react-icons/hi';
import { MdOutlineReceipt, MdOutlinePayments } from 'react-icons/md';
import toast from 'react-hot-toast';
import {
  newInvoiceApi,
  type InvoiceListItem,
  type InvoiceSummaryV2,
  type InvoiceDetailResponse,
  type InvoiceSearchParams,
} from '../../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) => Number(v || 0).toLocaleString('vi-VN') + 'đ';
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN') : '—';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Nháp', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
    PARTIAL: { label: 'Một phần', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETED: { label: 'Hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
};

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PAID: { label: 'Đã TT', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PARTIALLY_PAID: { label: 'Một phần', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    UNPAID: { label: 'Chưa TT', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    REFUNDED: { label: 'Đã hoàn', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
};

// ─── Summary Cards ────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string; trend?: 'up'|'down'|'neutral';
}> = ({ icon, label, value, sub, color = 'indigo', trend }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorMap[color] ?? colorMap.indigo}`}>{icon}</div>
        {trend === 'up' && <HiOutlineTrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === 'down' && <HiOutlineTrendingDown className="w-4 h-4 text-rose-500" />}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-gray-900 mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1 font-medium">{sub}</p>}
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const InvoiceDetailModal: React.FC<{
  invoiceId: number | null;
  onClose: () => void;
}> = ({ invoiceId, onClose }) => {
  const [data, setData] = React.useState<InvoiceDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview'|'rooms'|'services'|'payments'|'refunds'>('overview');

  React.useEffect(() => {
    if (!invoiceId) { setData(null); return; }
    setLoading(true); setError(null); setData(null); setActiveTab('overview');
    newInvoiceApi.getDetail(invoiceId)
      .then(setData)
      .catch(e => setError(e?.response?.data?.message || 'Không thể tải chi tiết hóa đơn.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (!invoiceId) return null;

  const rs = data?.revenueSummary;
  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'rooms', label: `Phòng (${data?.rooms?.length ?? 0})` },
    { id: 'services', label: `Dịch vụ (${(data?.serviceCharges?.length ?? 0) + (data?.damageCharges?.length ?? 0)})` },
    { id: 'payments', label: 'Thanh toán' },
    { id: 'refunds', label: 'Hoàn tiền' },
  ];

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 duration-300">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-linear-to-r from-indigo-50/60 via-white to-sky-50/40 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <MdOutlineReceipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Chi tiết Hóa đơn</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {data?.invoiceCode ?? `INV-${String(invoiceId).padStart(6, '0')}`}
                </span>
                {data?.bookingCode && (
                  <span className="text-xs text-gray-400 font-bold">Booking: {data.bookingCode}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-all">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 flex items-center gap-1 px-6 pt-4 pb-0 border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-400">Đang tải dữ liệu...</p>
            </div>
          )}
          {error && (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <HiOutlineExclamationCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
          )}
          {data && !loading && (
            <>
              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left col */}
                  <div className="space-y-4">
                    {/* General Info */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <HiOutlineDocumentText className="w-3.5 h-3.5" /> Thông tin chung
                      </h3>
                      <InfoRow label="Mã hóa đơn" value={data.invoiceCode} highlight />
                      <InfoRow label="Mã booking" value={data.bookingCode} highlight />
                      <InfoRow label="Ngày tạo" value={fmtDateTime(data.createdAt)} />
                      {data.checkoutStaff && <InfoRow label="Nhân viên checkout" value={data.checkoutStaff} />}
                    </div>
                    {/* Customer */}
                    {data.customer && (
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <HiOutlineUser className="w-3.5 h-3.5" /> Khách hàng
                        </h3>
                        <InfoRow label="Họ tên" value={data.customer.fullName} />
                        <InfoRow label="SĐT" value={data.customer.phone} icon={<HiOutlinePhone className="w-3 h-3 text-sky-500" />} />
                        <InfoRow label="CCCD/Hộ chiếu" value={data.customer.cccd || '—'} icon={<HiOutlineIdentification className="w-3 h-3 text-gray-400" />} />
                      </div>
                    )}
                  </div>
                  {/* Right col — Revenue Summary */}
                  <div className="bg-linear-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white space-y-3">
                    <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest flex items-center gap-1.5">
                      <MdOutlinePayments className="w-3.5 h-3.5" /> Tổng kết tài chính
                    </h3>
                    {rs && (
                      <div className="space-y-2">
                        <MoneyRow label="Tổng tiền phòng" value={rs.totalRoomAmount} className="text-white/80" />
                        <MoneyRow label="Tổng dịch vụ" value={rs.totalServiceAmount} className="text-white/80" />
                        <MoneyRow label="Phí hư hỏng" value={rs.totalDamageAmount} className="text-white/80" />
                        <hr className="border-white/20 my-1" />
                        <MoneyRow label="Tổng hóa đơn (Gross)" value={rs.grossInvoiceAmount} className="text-white font-black" />
                            <MoneyRow label="Hoàn checkout sớm" value={-rs.totalEarlyCheckoutRefundAmount} className="text-rose-300" negative />
                        <hr className="border-white/20 my-1" />
                            <MoneyRow label="Doanh thu thực thu (Net)" value={rs.netRevenue} className="text-emerald-300 font-black text-base" />
                            <MoneyRow label="Doanh thu thực thu (actual)" value={rs.totalActualRevenue ?? rs.totalRoomAmount} className="text-emerald-200" />
                        <hr className="border-white/20 my-1" />
                            <MoneyRow label="Đã thanh toán (paid)" value={rs.totalPaidAmount} className="text-sky-300" />
                            <MoneyRow label="Đã phân bổ (cọc)" value={rs.totalAllocatedPaidAmount ?? rs.totalPaidAmount} className="text-violet-200" />
                            <div className="mt-1" />
                            {rs.remainingToPay > 0 ? (
                              <MoneyRow label="Còn phải thu" value={rs.remainingToPay} className="text-amber-300 font-black" />
                            ) : (
                              <MoneyRow label="Hoàn thêm cho khách" value={rs.refundToCustomer} className="text-teal-300" />
                            )}
                            <MoneyRow label="Đã hoàn" value={rs.alreadyRefundedAmount ?? 0} className="text-teal-100" />
                            <MoneyRow label="Đang chờ hoàn" value={rs.pendingRefundAmount ?? 0} className="text-rose-100" />
                            <div className="text-xs text-white/70 font-bold">Trạng thái hoàn: {data.refundStatus ?? 'NONE'}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ROOMS TAB ── */}
              {activeTab === 'rooms' && (
                <div className="space-y-4">
                  {data.rooms?.length === 0 && <Empty text="Không có dữ liệu phòng" />}
                  {data.rooms?.map((r, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                        <HiOutlineHome className="w-4 h-4 text-indigo-600" />
                        <span className="font-black text-indigo-700 text-sm">{r.roomName}</span>
                        {r.roomType && <span className="text-xs text-indigo-400 font-bold">{r.roomType}</span>}
                      </div>
                      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <RoomStat label="Giá gốc" value={r.originalAmount} />
                        <RoomStat label="Đã sử dụng" value={r.usedAmount} color="teal" />
                        <RoomStat label="Chưa sử dụng" value={r.unusedAmount} color="amber" />
                        <RoomStat label="Hoàn 80%" value={r.earlyCheckoutRefund} color="sky" />
                        <RoomStat label="KS giữ lại 20%" value={r.hotelKeepAmount} color="orange" />
                        <RoomStat label="Doanh thu thực" value={r.netRevenue} color="emerald" />
                        <RoomStat label="Cọc phân bổ" value={r.allocatedPaidAmount} color="violet" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SERVICES TAB ── */}
              {activeTab === 'services' && (
                <div className="space-y-5">
                  {/* Service charges */}
                  {data.serviceCharges && data.serviceCharges.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <HiOutlineClipboardList className="w-3.5 h-3.5" /> Dịch vụ phát sinh
                      </h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">Dịch vụ</th>
                            <th className="text-center py-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">SL</th>
                            <th className="text-right py-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {data.serviceCharges.map((s, i) => (
                            <tr key={i}>
                              <td className="py-3">
                                <div className="font-semibold text-gray-800">{s.itemName}</div>
                                <div className="text-[10px] text-gray-400">{s.category}</div>
                              </td>
                              <td className="py-3 text-center text-gray-600">{s.quantity ?? 1}</td>
                              <td className="py-3 text-right font-black text-gray-900">{fmt(s.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Damage charges */}
                  {data.damageCharges && data.damageCharges.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <HiOutlineExclamationCircle className="w-3.5 h-3.5 text-red-400" /> Phí hư hỏng
                      </h3>
                      <div className="space-y-2">
                        {data.damageCharges.map((d, i) => (
                          <div key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl p-3">
                            <div>
                              <div className="font-semibold text-red-800 text-sm">{d.itemName}</div>
                              {d.note && <div className="text-[11px] text-red-400">{d.note}</div>}
                            </div>
                            <span className="font-black text-red-700">{fmt(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!data.serviceCharges?.length && !data.damageCharges?.length) && (
                    <Empty text="Không có phí dịch vụ / hư hỏng" />
                  )}
                </div>
              )}

              {/* ── PAYMENTS TAB ── */}
              {activeTab === 'payments' && (
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <MdOutlinePayments className="w-3.5 h-3.5" /> Lịch sử thanh toán
                  </h3>
                  {!data.paymentHistory?.records?.length && <Empty text="Không có lịch sử thanh toán" />}
                  <div className="space-y-3">
                    {data.paymentHistory?.records?.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-xl">
                            <MdOutlinePayments className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-800">{p.method}</div>
                            <div className="text-[11px] text-emerald-500 flex items-center gap-1">
                              <HiOutlineClock className="w-3 h-3" /> {fmtDateTime(p.time)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-emerald-700 text-sm">{fmt(p.amount)}</div>
                          <div className="text-[10px] text-emerald-500 uppercase">{p.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── REFUNDS TAB ── */}
              {activeTab === 'refunds' && (
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <HiOutlineReceiptRefund className="w-3.5 h-3.5" /> Lịch sử hoàn tiền
                  </h3>
                  {!data.refundHistory?.records?.length && <Empty text="Không có lịch sử hoàn tiền" />}
                  <div className="space-y-3">
                    {data.refundHistory?.records?.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-sky-50 border border-sky-100 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-sky-100 rounded-xl">
                            <HiOutlineReceiptRefund className="w-4 h-4 text-sky-600" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-sky-800">{r.reason || 'Hoàn tiền checkout sớm'}</div>
                            <div className="text-[11px] text-sky-500 flex items-center gap-1">
                              <HiOutlineClock className="w-3 h-3" /> {fmtDateTime(r.time)}
                            </div>
                            {r.staff && <div className="text-[11px] text-sky-400">NV: {r.staff}</div>}
                          </div>
                        </div>
                        <div className="font-black text-sky-700 text-sm">{fmt(r.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean; icon?: React.ReactNode }> = ({ label, value, highlight, icon }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[11px] text-gray-400 font-bold shrink-0">{label}</span>
    <span className={`text-right text-[12px] font-black flex items-center gap-1 ${highlight ? 'text-indigo-700' : 'text-gray-800'}`}>
      {icon}{value || '—'}
    </span>
  </div>
);

const MoneyRow: React.FC<{ label: string; value: number; className?: string; negative?: boolean }> = ({ label, value, className, negative }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[11px] text-white/70 font-bold">{label}</span>
    <span className={`text-sm font-black ${className ?? 'text-white'}`}>
      {negative && value > 0 ? '-' : ''}{fmt(Math.abs(value))}
    </span>
  </div>
);

const RoomStat: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = 'gray' }) => {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    orange: 'bg-orange-50 text-orange-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <div className={`rounded-xl p-3 ${colorMap[color] ?? colorMap.gray}`}>
      <div className="text-[10px] font-black uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-sm font-black">{fmt(value)}</div>
    </div>
  );
};

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-10 flex flex-col items-center gap-2 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
      <HiOutlineDocumentText className="w-6 h-6 text-gray-300" />
    </div>
    <p className="text-sm font-bold text-gray-400">{text}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'TODAY', label: 'Hôm nay' },
  { id: 'YESTERDAY', label: 'Hôm qua' },
  { id: 'THIS_WEEK', label: 'Tuần này' },
  { id: 'THIS_MONTH', label: 'Tháng này' },
  { id: 'CUSTOM', label: 'Tùy chỉnh' },
];

const STATUSES = ['DRAFT', 'PARTIAL', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PAID', label: 'Đã thanh toán' },
  { id: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
  { id: 'UNPAID', label: 'Chưa thanh toán' },
  { id: 'REFUNDED', label: 'Đã hoàn tiền' },
];

const PAGE_SIZE = 10;

const defaultSummary: InvoiceSummaryV2 = {
  totalInvoices: 0, grossInvoiceAmount: 0, totalRefundAmount: 0, netRevenue: 0,
  totalPaidAmount: 0, totalRemainingAmount: 0, refundedInvoiceCount: 0, todayInvoiceCount: 0,
  totalActualRevenue: 0, totalRefundedAmount: 0, totalPendingRefundAmount: 0,
  totalAdditionalCharge: 0, totalRemainingToPay: 0, paidInvoiceCount: 0, unpaidInvoiceCount: 0,
  partiallyPaidInvoiceCount: 0,
};

const InvoiceManagementPage: React.FC = () => {
  // Filter state
  const [keyword, setKeyword] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  // Data state
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [summary, setSummary] = useState<InvoiceSummaryV2>(defaultSummary);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Detail modal
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const computeDateRange = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - ((weekStartDate.getDay() + 6) % 7));
    const weekStart = weekStartDate.toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    switch (datePreset) {
      case 'TODAY': return { from: today, to: today };
      case 'YESTERDAY': return { from: yesterday, to: yesterday };
      case 'THIS_WEEK': return { from: weekStart, to: today };
      case 'THIS_MONTH': return { from: monthStart, to: today };
      case 'CUSTOM': return { from: fromDate, to: toDate };
      default: return { from: '', to: '' };
    }
  }, [datePreset, fromDate, toDate]);

  const doSearch = useCallback(async (p = 0) => {
    setLoading(true);
    setHasSearched(true);
    const { from, to } = computeDateRange();
    const params: InvoiceSearchParams = {
      page: p, size: PAGE_SIZE,
      paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
      invoiceStatus: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    };
    // keyword distributed
    const kw = keyword.trim();
    if (kw) {
      // autodetect keyword type
      if (/^\d{9,11}$/.test(kw)) params.customerPhone = kw;
      else if (/^HD-?\d+$/i.test(kw) || /^INV-?\d+$/i.test(kw)) params.invoiceCode = kw;
      else if (/^BK/i.test(kw)) params.bookingCode = kw;
      else if (/^\d{3,4}$/.test(kw)) params.bookingCode = kw; // room number — passed as keyword
      else params.customerName = kw; // name fallback
    }
    if (from) params.fromDate = from;
    if (to) params.toDate = to;
    try {
      const res = await newInvoiceApi.search(params);
      setInvoices(res.content);
      setSummary(res.summary);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không thể tìm kiếm hóa đơn');
    } finally {
      setLoading(false);
    }
  }, [keyword, datePreset, fromDate, toDate, selectedStatuses, paymentStatus, computeDateRange]);

  const handleReset = () => {
    setKeyword(''); setDatePreset('ALL'); setFromDate(''); setToDate('');
    setSelectedStatuses([]); setPaymentStatus('ALL'); setPage(0);
    setInvoices([]); setSummary(defaultSummary); setTotalElements(0); setTotalPages(0);
    setHasSearched(false);
  };

  const toggleStatus = (s: string) => {
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(0);
  };

  return (
    <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-400 pb-8">
      {/* ── Page Title ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl"><MdOutlineReceipt className="w-5 h-5" /></div>
            Quản lý Hóa đơn
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-0.5">
            Tìm kiếm, thống kê và theo dõi doanh thu thực thu theo từng hóa đơn checkout.
          </p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        {/* Row 1: keyword + date preset */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="relative flex-1 min-w-0">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mã HĐ, mã booking, tên khách, SĐT, số phòng..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium placeholder:text-gray-400"
            />
          </div>
          {/* Date preset pills */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
            {DATE_PRESETS.map(d => (
              <button
                key={d.id}
                onClick={() => setDatePreset(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  datePreset === d.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {/* Row 2: custom date + status + payment status + actions */}
        <div className="flex flex-wrap items-center gap-3">
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold" />
              <span className="text-xs text-gray-400 font-bold">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold" />
            </div>
          )}

          {/* Booking status multi-select */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDrop(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl hover:border-indigo-300 transition-all font-bold text-gray-700"
            >
              Trạng thái booking {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              <HiOutlineChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDrop && (
              <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 min-w-44 animate-in slide-in-from-top-2 duration-150">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      selectedStatuses.includes(s) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {selectedStatuses.includes(s) && '✓ '}
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment status select */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {PAYMENT_STATUSES.map(p => (
              <button key={p.id} onClick={() => setPaymentStatus(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  paymentStatus === p.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{p.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
            >
              <HiOutlineRefresh className="w-3.5 h-3.5" /> Làm mới
            </button>
            <button
              onClick={() => doSearch(0)}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 disabled:opacity-60"
            >
              <HiOutlineSearch className="w-3.5 h-3.5" />
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards (8 cards, only shown after search) ── */}
      {hasSearched && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 animate-in fade-in duration-300">
          <SummaryCard
            icon={<MdOutlineReceipt className="w-4 h-4" />}
            label="Tổng HĐ" value={summary.totalInvoices}
            color="indigo" trend="neutral"
          />
          <SummaryCard
            icon={<HiOutlineCurrencyDollar className="w-4 h-4" />}
            label="Tổng HĐ (Gross)" value={fmt(summary.grossInvoiceAmount)}
            color="violet"
          />
          <SummaryCard
            icon={<HiOutlineReceiptRefund className="w-4 h-4" />}
            label="Tổng hoàn" value={fmt(summary.totalRefundAmount)}
            color="rose"
          />
          <SummaryCard
            icon={<HiOutlineTrendingUp className="w-4 h-4" />}
            label="Doanh thu (Net)" value={fmt(summary.netRevenue)}
            color="emerald" trend="up"
          />
          <SummaryCard
            icon={<MdOutlinePayments className="w-4 h-4" />}
            label="Đã thu" value={fmt(summary.totalPaidAmount)}
            color="teal"
          />
          <SummaryCard
            icon={<HiOutlineTrendingDown className="w-4 h-4" />}
            label="Còn phải thu" value={fmt(summary.totalRemainingAmount)}
            color="amber"
          />
          <SummaryCard
            icon={<HiOutlineReceiptRefund className="w-4 h-4" />}
            label="HĐ có hoàn" value={summary.refundedInvoiceCount}
            color="sky"
          />
          <SummaryCard
            icon={<HiOutlineCalendar className="w-4 h-4" />}
            label="HĐ hôm nay" value={summary.todayInvoiceCount}
            color="orange"
          />
          <SummaryCard
            icon={<HiOutlineTrendingUp className="w-4 h-4" />}
            label="Doanh thu thực" value={fmt(summary.totalActualRevenue)}
            color="teal"
          />
          <SummaryCard
            icon={<HiOutlineReceiptRefund className="w-4 h-4" />}
            label="Đã hoàn" value={fmt(summary.totalRefundedAmount)}
            color="sky"
          />
          <SummaryCard
            icon={<HiOutlineClock className="w-4 h-4" />}
            label="Chờ hoàn" value={fmt(summary.totalPendingRefundAmount)}
            color="amber"
          />
          <SummaryCard
            icon={<HiOutlineClipboardList className="w-4 h-4" />}
            label="Đã TT / Chưa TT" value={`${summary.paidInvoiceCount} / ${summary.unpaidInvoiceCount}`}
            color="violet"
          />
        </div>
      )}

      {/* ── Invoice Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Danh sách hóa đơn</h2>
            {hasSearched && (
              <p className="text-xs text-gray-400 mt-0.5">
                Hiển thị {invoices.length} / {totalElements} hóa đơn
              </p>
            )}
          </div>
        </div>

        {/* Empty / Loading / Table */}
        {!hasSearched ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center px-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center">
              <HiOutlineSearch className="w-7 h-7 text-indigo-300" />
            </div>
            <h3 className="text-base font-black text-gray-700">Chưa có kết quả</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Nhập từ khóa tìm kiếm hoặc chọn bộ lọc rồi nhấn <strong>Tìm kiếm</strong> để xem danh sách hóa đơn.
            </p>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400">Đang tìm kiếm...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
              <HiOutlineDocumentText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy hóa đơn nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-300">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                    {'Mã HĐ', 'Mã Booking', 'Khách hàng', 'Phòng', 'Ngày tạo',
                    'Tổng HĐ', 'Hoàn tiền', 'Doanh thu net', 'Đã TT', 'Còn TT',
                    'TT HĐ', 'TT Thanh toán', 'Hành động'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-black text-indigo-600">{inv.invoiceCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-700">{inv.bookingCode || `#${inv.bookingId}`}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-bold text-gray-900">{inv.customerName || '—'}</div>
                      {inv.customerPhone && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                          <HiOutlinePhone className="w-3 h-3" />{inv.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600 font-semibold">{inv.roomNumbers || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-bold text-gray-700">{fmtDate(inv.createdAt)}</div>
                      <div className="text-[10px] text-gray-400">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-black text-gray-900">{fmt(inv.grossInvoiceAmount)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {inv.totalRefundAmount > 0 ? (
                        <span className="text-xs font-black text-rose-600">-{fmt(inv.totalRefundAmount)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-black text-emerald-700">{fmt(inv.netRevenue)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold text-teal-700">{fmt(inv.paidAmount)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {inv.remainingAmount > 0 ? (
                        <span className="text-xs font-black text-amber-700">{fmt(inv.remainingAmount)}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={inv.invoiceStatus || 'DRAFT'} />
                    </td>
                    <td className="px-4 py-3.5">
                      <PaymentStatusBadge status={inv.paymentStatus || 'UNPAID'} />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelectedId(inv.id)}
                        className="px-3 py-1.5 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all whitespace-nowrap"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Trang {page + 1} / {totalPages} · {totalElements} hóa đơn
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0 || loading}
                onClick={() => doSearch(page - 1)}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => doSearch(pg)}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                      pg === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >{pg + 1}</button>
                );
              })}
              <button
                disabled={page >= totalPages - 1 || loading}
                onClick={() => doSearch(page + 1)}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedId && (
        <InvoiceDetailModal invoiceId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

export default InvoiceManagementPage;
