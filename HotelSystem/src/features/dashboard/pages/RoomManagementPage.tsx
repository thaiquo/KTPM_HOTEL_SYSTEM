import React, { useState, useEffect } from 'react';
import { 
  HiOutlinePlus, 
  HiOutlinePencilAlt, 
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlinePlusCircle,
  HiOutlineMinusCircle
} from 'react-icons/hi';
import { roomApi } from '../../../services/roomApi';
import type { Room } from '../../../types';
import toast from 'react-hot-toast';

interface RoomType {
  id: number;
  type: string;
  basePrice: number;
  maxCapacity: number;
  defaultCapacity: number;
}

interface Bed {
  id?: number;
  type: 'SINGLE' | 'DOUBLE' | 'QUEEN' | 'KING' | 'EXTRA' | 'SOFA' | 'BUNK';
  quantity: number;
}

const RoomManagementPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const roomStatuses = ['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'OCCUPIED', 'HOLD', 'CLEANING'];

  // Form state
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: { id: 0 },
    status: 'AVAILABLE',
    floor: 1,
    note: '',
    actualCapacity: 2,
    beds: [] as Bed[]
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getAll();
      setRooms(data);
    } catch (error) {
      toast.error('Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const data = await roomApi.getRoomTypes();
      setRoomTypes(data);
    } catch (error) {
      console.error('Failed to fetch room types:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, []);

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      const matchedType = roomTypes.find(t => t.type === room.type);
      setFormData({
        roomNumber: room.roomNumber,
        roomType: { id: matchedType?.id || 0 },
        status: room.status || (room.available ? 'AVAILABLE' : 'BOOKED'),
        floor: room.floor,
        note: '',
        actualCapacity: room.maxGuests,
        beds: [] // In a real app, you'd fetch the beds for this specific room
      });
    } else {
      setEditingRoom(null);
      setFormData({
        roomNumber: '',
        roomType: { id: roomTypes[0]?.id || 0 },
        status: 'AVAILABLE',
        floor: 1,
        note: '',
        actualCapacity: 2,
        beds: [{ type: 'DOUBLE', quantity: 1 }]
      });
    }
    setIsModalOpen(true);
  };

  const addBed = () => {
    setFormData({
      ...formData,
      beds: [...formData.beds, { type: 'SINGLE', quantity: 1 }]
    });
  };

  const removeBed = (index: number) => {
    setFormData({
      ...formData,
      beds: formData.beds.filter((_, i) => i !== index)
    });
  };

  const updateBed = (index: number, field: keyof Bed, value: any) => {
    const newBeds = [...formData.beds];
    newBeds[index] = { ...newBeds[index], [field]: value };
    setFormData({ ...formData, beds: newBeds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await roomApi.update(editingRoom.id, formData as any);
        toast.success('Cập nhật thành công');
      } else {
        await roomApi.create(formData as any);
        toast.success('Thêm phòng mới thành công');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Sẵn sàng';
      case 'BOOKED': return 'Đã đặt';
      case 'MAINTENANCE': return 'Bảo trì';
      case 'OCCUPIED': return 'Đang ở';
      case 'HOLD': return 'Chờ thanh toán';
      case 'CLEANING': return 'Đang dọn dẹp';
      default: return status || 'Không rõ';
    }
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      case 'BOOKED': return 'bg-blue-100 text-blue-700';
      case 'MAINTENANCE': return 'bg-gray-100 text-gray-700';
      case 'OCCUPIED': return 'bg-rose-100 text-rose-700';
      case 'HOLD': return 'bg-amber-100 text-amber-700';
      case 'CLEANING': return 'bg-[#efebe9] text-[#5d4037]';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý chi tiết cấu hình giường và trạng thái từng phòng.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <HiOutlinePlus className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Thêm Phòng mới</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto flex-1">
            <div className="relative w-full md:w-80">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Tìm số phòng..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="relative w-full md:w-56">
              <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none shadow-sm cursor-pointer"
              >
                <option value="ALL">Tất cả loại phòng</option>
                {roomTypes.map(type => (
                  <option key={type.id} value={type.type}>{type.type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white">
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Số phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tầng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Loại phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Sức chứa thực tế</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.filter(r => (selectedTypeFilter === 'ALL' || r.type === selectedTypeFilter) && r.roomNumber.includes(searchTerm)).map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          {room.roomNumber}
                        </div>
                        <span className="text-sm font-bold text-gray-900">Phòng {room.roomNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">Tầng {room.floor}</td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{room.type}</span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">{room.maxGuests} Người</td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusClass(room.status)}`}>
                        {statusLabel(room.status)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(room)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><HiOutlinePencilAlt className="w-5 h-5" /></button>
                        <button onClick={() => roomApi.remove(room.id).then(() => fetchRooms())} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><HiOutlineTrash className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingRoom ? 'Cập nhật phòng' : 'Thêm phòng mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"><HiOutlineX className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số phòng</label>
                  <input required type="text" value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} placeholder="VD: 101" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tầng</label>
                  <input required type="number" value={formData.floor} onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Loại phòng</label>
                  <select value={formData.roomType.id} onChange={e => setFormData({...formData, roomType: { id: parseInt(e.target.value) }})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    {roomTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sức chứa thực tế</label>
                  <input required type="number" value={formData.actualCapacity} onChange={e => setFormData({...formData, actualCapacity: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    {roomStatuses.map(status => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Cấu hình giường (Beds)</label>
                    <button type="button" onClick={addBed} className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700"><HiOutlinePlusCircle className="w-4 h-4 mr-1" /> Thêm giường</button>
                  </div>
                  <div className="space-y-3">
                    {formData.beds.map((bed, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-left-2 duration-300">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loại giường</label>
                          <select value={bed.type} onChange={e => updateBed(idx, 'type', e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none">
                            <option value="SINGLE">Giường đơn</option>
                            <option value="DOUBLE">Giường đôi</option>
                            <option value="QUEEN">Queen Size</option>
                            <option value="KING">King Size</option>
                            <option value="EXTRA">Giường phụ</option>
                            <option value="SOFA">Sofa Bed</option>
                            <option value="BUNK">Giường tầng</option>
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Số lượng</label>
                          <input type="number" value={bed.quantity} onChange={e => updateBed(idx, 'quantity', parseInt(e.target.value))} className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none" />
                        </div>
                        <button type="button" onClick={() => removeBed(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><HiOutlineMinusCircle className="w-6 h-6" /></button>
                      </div>
                    ))}
                    {formData.beds.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm italic">Chưa có giường nào được thiết lập</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">Hủy</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
