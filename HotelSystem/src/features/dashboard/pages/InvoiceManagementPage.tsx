import React, { useMemo, useState } from 'react';

type InvoiceStatus = 'PAID' | 'PENDING' | 'CANCELLED' | 'OVERDUE';

interface InvoiceItem {
  id: string;
  customer: string;
  room: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  method: string;
  note: string;
}

const initialInvoices: InvoiceItem[] = [
  { id: 'INV-2026-001', customer: 'Nguyễn Văn An', room: '101', date: '22/04/2026', amount: 1500000, status: 'PAID', method: 'Chuyển khoản', note: 'Thanh toán trọn gói' },
  { id: 'INV-2026-002', customer: 'Trần Thị Bích', room: '202', date: '21/04/2026', amount: 2400000, status: 'PENDING', method: 'Tiền mặt', note: 'Đợi khách xác nhận' },
  { id: 'INV-2026-003', customer: 'Lê Minh Đức', room: '303', date: '20/04/2026', amount: 7000000, status: 'PAID', method: 'Chuyển khoản', note: 'Đã xuất hóa đơn' },
  { id: 'INV-2026-004', customer: 'Phạm Thị Hương', room: '404', date: '19/04/2026', amount: 5000000, status: 'CANCELLED', method: 'Tiền mặt', note: 'Hủy do thay đổi lịch' },
  { id: 'INV-2026-005', customer: 'Đỗ Quang Huy', room: '505', date: '18/04/2026', amount: 3750000, status: 'PAID', method: 'Thẻ', note: 'Đã đối soát' },
  { id: 'INV-2026-006', customer: 'Mai Ngọc Lan', room: '606', date: '17/04/2026', amount: 1800000, status: 'OVERDUE', method: 'Tiền mặt', note: 'Quá hạn thanh toán' },
];

const statusLabel: Record<InvoiceStatus, string> = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chờ xử lý',
  CANCELLED: 'Đã hủy',
  OVERDUE: 'Quá hạn',
};

const statusClass: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const InvoiceManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');

  const stats = useMemo(() => {
    const totalRevenue = invoices.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0);
    const pendingRevenue = invoices.filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE').reduce((sum, item) => sum + item.amount, 0);
    const paidCount = invoices.filter((item) => item.status === 'PAID').length;
    const pendingCount = invoices.filter((item) => item.status === 'PENDING').length;
    const overdueCount = invoices.filter((item) => item.status === 'OVERDUE').length;

    return { totalRevenue, pendingRevenue, paidCount, pendingCount, overdueCount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const statusMatched = statusFilter === 'ALL' || invoice.status === statusFilter;
      const keywordMatched =
        !keyword ||
        invoice.id.toLowerCase().includes(keyword) ||
        invoice.customer.toLowerCase().includes(keyword) ||
        invoice.room.toLowerCase().includes(keyword) ||
        invoice.method.toLowerCase().includes(keyword);

      return statusMatched && keywordMatched;
    });
  }, [invoices, searchTerm, statusFilter]);

  const updateStatus = (id: string, nextStatus: InvoiceStatus) => {
    setInvoices((current) => current.map((invoice) => (invoice.id === id ? { ...invoice, status: nextStatus } : invoice)));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-4 bg-[#f8f9fc]/95 backdrop-blur-sm border-b border-gray-100/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Hóa đơn</h1>
            <p className="text-sm text-gray-500 mt-1">Theo dõi hóa đơn, xử lý thanh toán và kiểm soát các khoản quá hạn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
              <span className="text-sm font-medium">In danh sách</span>
            </button>
            <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
              <span className="text-sm font-semibold">Tải báo cáo</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Doanh thu đã thu</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-green-600 mt-1">{stats.paidCount} hóa đơn đã thanh toán</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chờ xử lý</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.pendingRevenue)} cần đối soát</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Quá hạn</p>
            <p className="text-2xl font-bold text-rose-600 mt-2">{stats.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-1">Cần nhắc thanh toán ngay</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tổng hóa đơn</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{invoices.length}</p>
            <p className="text-xs text-gray-500 mt-1">Dữ liệu theo dõi nội bộ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:flex-1">
            <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
              <input
                type="text"
                placeholder="Tìm mã hóa đơn, khách hàng, phòng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="relative w-full md:w-52">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">↕</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InvoiceStatus)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none shadow-sm cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="OVERDUE">Quá hạn</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
            className="w-full xl:w-auto px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Mã hóa đơn</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Khách hàng</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Phòng</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Ngày tạo</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tổng tiền</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/40 transition-all align-top">
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-indigo-600">{invoice.id}</span>
                      <span className="text-xs text-gray-400">{invoice.note}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {invoice.customer.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">{invoice.customer}</span>
                        <span className="text-xs text-gray-400 block">{invoice.method}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">P.{invoice.room}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-500 font-medium">{invoice.date}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${statusClass[invoice.status]}`}>
                      {statusLabel[invoice.status]}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap justify-end gap-2">
                      {invoice.status !== 'PAID' && (
                        <button
                          onClick={() => updateStatus(invoice.id, 'PAID')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                        >
                          Đã thanh toán
                        </button>
                      )}
                      {invoice.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(invoice.id, 'OVERDUE')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          Quá hạn
                        </button>
                      )}
                      {invoice.status !== 'CANCELLED' && (
                        <button
                          onClick={() => updateStatus(invoice.id, 'CANCELLED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-sm text-gray-400">
                    Không tìm thấy hóa đơn phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-50 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-400">Đang hiển thị {filteredInvoices.length} / {invoices.length} hóa đơn</p>
          <button className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Xem thêm</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;
