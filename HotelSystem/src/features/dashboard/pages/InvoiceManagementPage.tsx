import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClipboardCheck,
  HiOutlineCurrencyDollar,
  HiOutlineSearch,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { staffInvoiceApi, type InvoiceSummary, type PaymentRecord } from '../../../services/api';

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const normalizeInvoiceStatus = (invoice: PaymentRecord) => {
  if (invoice.paymentType === 'REFUND') return 'REFUNDED';
  if (invoice.status === 'SUCCESS') return 'PAID';
  if (invoice.status === 'PENDING') return 'PENDING';
  if (invoice.status === 'FAILED') return 'CANCELLED';
  return invoice.status || 'PENDING';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return <span className="px-3 py-1 text-[11px] font-bold bg-green-100 text-green-600 rounded-full uppercase tracking-wider">Đã thanh toán</span>;
    case 'REFUNDED':
      return <span className="px-3 py-1 text-[11px] font-bold bg-sky-100 text-sky-600 rounded-full uppercase tracking-wider">Đã hoàn</span>;
    case 'PENDING':
      return <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-600 rounded-full uppercase tracking-wider">Chờ thanh toán</span>;
    case 'CANCELLED':
      return <span className="px-3 py-1 text-[11px] font-bold bg-red-100 text-red-600 rounded-full uppercase tracking-wider">Đã hủy</span>;
    default:
      return <span className="px-3 py-1 text-[11px] font-bold bg-gray-100 text-gray-600 rounded-full uppercase tracking-wider">{status}</span>;
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
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return invoices;
    return invoices.filter((invoice) =>
      [`INV-${invoice.id}`, invoice.bookingId, invoice.userId, invoice.transactionId]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [invoices, searchTerm]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Hóa đơn</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi giao dịch thanh toán thật từ Payment Service.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-green-50 rounded-2xl w-fit mb-4">
            <HiOutlineCurrencyDollar className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Doanh thu tháng này</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.monthlyRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4">
            <HiOutlineClipboardCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Đã thanh toán</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.paidTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.paidCount} hóa đơn</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-amber-50 rounded-2xl w-fit mb-4">
            <HiOutlineCalendar className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chờ thanh toán</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.pendingTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.pendingCount} hóa đơn</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm mã hóa đơn, booking, giao dịch..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-sm font-bold text-gray-400">Đang tải hóa đơn...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center text-sm font-bold text-gray-400">Không có hóa đơn phù hợp</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mã hóa đơn</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Booking</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Khách hàng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ngày tạo</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tổng tiền</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Đã thanh toán</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((invoice) => {
                  const status = normalizeInvoiceStatus(invoice);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-8 py-5 text-sm font-bold text-indigo-600">INV-{invoice.id}</td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">#{invoice.bookingId || '-'}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">User #{invoice.userId || '-'}</td>
                      <td className="px-6 py-5 text-sm text-gray-500">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('vi-VN') : '-'}</td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{formatCurrency(invoice.totalAmount || invoice.amount)}</td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{formatCurrency(invoice.paidAmount)}</td>
                      <td className="px-6 py-5">{getStatusBadge(status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;
