import React from 'react';
import { 
  HiOutlineClipboardCheck, 
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlinePrinter,
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar
} from 'react-icons/hi';

const InvoiceManagementPage: React.FC = () => {
  // Dữ liệu mẫu
  const invoices = [
    { id: 'INV-2026-001', customer: 'Nguyễn Văn An', room: '101', date: '22/04/2026', amount: '1,500,000đ', status: 'PAID' },
    { id: 'INV-2026-002', customer: 'Trần Thị Bích', room: '202', date: '21/04/2026', amount: '2,400,000đ', status: 'PENDING' },
    { id: 'INV-2026-003', customer: 'Lê Minh Đức', room: '303', date: '20/04/2026', amount: '7,000,000đ', status: 'PAID' },
    { id: 'INV-2026-004', customer: 'Phạm Thị Hương', room: '404', date: '19/04/2026', amount: '5,000,000đ', status: 'CANCELLED' },
    { id: 'INV-2026-005', customer: 'Đỗ Quang Huy', room: '505', date: '18/04/2026', amount: '3,750,000đ', status: 'PAID' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-3 py-1 text-[11px] font-bold bg-green-100 text-green-600 rounded-full uppercase tracking-wider">Đã thanh toán</span>;
      case 'PENDING':
        return <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-600 rounded-full uppercase tracking-wider">Chờ xử lý</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 text-[11px] font-bold bg-red-100 text-red-600 rounded-full uppercase tracking-wider">Đã hủy</span>;
      default:
        return <span className="px-3 py-1 text-[11px] font-bold bg-gray-100 text-gray-600 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Hóa đơn</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi và quản lý các giao dịch thanh toán của khách hàng.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <HiOutlineFilter className="w-5 h-5 mr-2 text-gray-400" />
            <span className="text-sm font-medium">Lọc theo ngày</span>
          </button>
          <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
            <HiOutlineDownload className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Tải báo cáo</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <HiOutlineCurrencyDollar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">+12.5%</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Doanh thu tháng này</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">128,450,000đ</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <HiOutlineClipboardCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">84 Hóa đơn</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Đã thanh toán</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">92,000,000đ</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <HiOutlineCalendar className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">12 Đơn</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chờ thanh toán</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">36,450,000đ</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Tìm mã hóa đơn, tên khách hàng..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <HiOutlinePrinter className="w-6 h-6" />
            </button>
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <HiOutlineDownload className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Mã hóa đơn</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Khách hàng</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Phòng</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Ngày tạo</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tổng tiền</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/30 transition-all cursor-pointer group">
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-indigo-600 group-hover:underline">{inv.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {inv.customer.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{inv.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">P.{inv.room}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-500 font-medium">{inv.date}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-gray-900">{inv.amount}</span>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline uppercase tracking-tight">Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        <div className="p-6 border-t border-gray-50 flex items-center justify-center">
           <button className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Xem thêm hóa đơn</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;
