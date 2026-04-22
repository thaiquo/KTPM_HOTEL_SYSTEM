import React from 'react';
import { 
  HiOutlinePlus, 
  HiOutlinePencilAlt, 
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineDotsHorizontal
} from 'react-icons/hi';

const RoomManagementPage: React.FC = () => {
  // Dữ liệu mẫu (sẽ được thay thế bằng dữ liệu từ API sau)
  const rooms = [
    { id: 1, name: 'Phòng Standard 101', type: 'STANDARD', price: '500,000đ', capacity: 2, status: 'AVAILABLE', area: '25m²' },
    { id: 2, name: 'Phòng Deluxe 202', type: 'DELUXE', price: '1,200,000đ', capacity: 3, status: 'BOOKED', area: '45m²' },
    { id: 3, name: 'Phòng Suite 303', type: 'SUITE', price: '3,500,000đ', capacity: 4, status: 'AVAILABLE', area: '80m²' },
    { id: 4, name: 'Phòng VIP 404', type: 'VIP', price: '5,000,000đ', capacity: 2, status: 'MAINTENANCE', area: '60m²' },
    { id: 5, name: 'Phòng Family 505', type: 'FAMILY', price: '2,500,000đ', capacity: 5, status: 'AVAILABLE', area: '70m²' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-3 py-1 text-[11px] font-bold bg-green-100 text-green-600 rounded-full uppercase tracking-wider">Sẵn sàng</span>;
      case 'BOOKED':
        return <span className="px-3 py-1 text-[11px] font-bold bg-blue-100 text-blue-600 rounded-full uppercase tracking-wider">Đã đặt</span>;
      case 'MAINTENANCE':
        return <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-600 rounded-full uppercase tracking-wider">Bảo trì</span>;
      default:
        return <span className="px-3 py-1 text-[11px] font-bold bg-gray-100 text-gray-600 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem và quản lý tất cả các phòng trong hệ thống khách sạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <HiOutlineDownload className="w-5 h-5 mr-2 text-gray-400" />
            <span className="text-sm font-medium">Xuất dữ liệu</span>
          </button>
          <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
            <HiOutlinePlus className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Thêm Phòng mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards (Optional but adds premium feel) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng số phòng', value: '45', color: 'bg-indigo-500' },
          { label: 'Đang trống', value: '28', color: 'bg-green-500' },
          { label: 'Đã được đặt', value: '12', color: 'bg-blue-500' },
          { label: 'Đang bảo trì', value: '5', color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg opacity-80`}>
              <HiOutlineOfficeBuilding className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button className="px-4 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-lg">Tất cả</button>
              <button className="px-4 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 rounded-lg transition-colors">Đang trống</button>
              <button className="px-4 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 rounded-lg transition-colors">Đã đặt</button>
            </div>
          </div>
          <button className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
            <HiOutlineFilter className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium">Bộ lọc</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tên phòng / Mã</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Loại phòng</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Giá / Đêm</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Sức chứa</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <HiOutlineOfficeBuilding className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{room.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium">#{room.id.toString().padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{room.type}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-indigo-600">{room.price}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center text-gray-500">
                      <HiOutlineUserCircle className="w-4 h-4 mr-1.5" />
                      <span className="text-sm font-medium">{room.capacity} Người</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(room.status)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Chỉnh sửa">
                        <HiOutlinePencilAlt className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <HiOutlineDotsHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-400">Hiển thị <span className="text-gray-900">5</span> trong <span className="text-gray-900">45</span> phòng</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 rounded-xl cursor-not-allowed">Trước</button>
            <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">1</button>
            <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">2</button>
            <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Tiếp</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomManagementPage;
