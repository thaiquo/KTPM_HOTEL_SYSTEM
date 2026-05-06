import React, { useState, useEffect } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlinePhotograph
} from 'react-icons/hi';
import { roomApi } from '../../../services/api';
import toast from 'react-hot-toast';

interface RoomType {
  id: number;
  type: string;
  basePrice: number;
  maxCapacity: number;
  defaultCapacity: number;
  description: string;
  images: { id: number; imageUrl: string; isThumbnail: boolean }[];
}

const RoomTypeManagementPage: React.FC = () => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    basePrice: 0,
    maxCapacity: 2,
    defaultCapacity: 2,
    description: '',
    images: [] as { imageUrl: string; isThumbnail: boolean }[]
  });

  const fetchRoomTypes = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getRoomTypes();
      setRoomTypes(data);
    } catch (error) {
      toast.error('Không thể tải danh sách loại phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, []);

  const handleOpenModal = (type?: RoomType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        type: type.type,
        basePrice: type.basePrice,
        maxCapacity: type.maxCapacity,
        defaultCapacity: type.defaultCapacity,
        description: type.description,
        images: type.images.map(img => ({ imageUrl: img.imageUrl, isThumbnail: img.isThumbnail }))
      });
    } else {
      setEditingType(null);
      setFormData({
        type: '',
        basePrice: 500000,
        maxCapacity: 2,
        defaultCapacity: 2,
        description: '',
        images: []
      });
    }
    setIsModalOpen(true);
  };

  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { imageUrl: imageUrlInput, isThumbnail: prev.images.length === 0 }]
    }));
    setImageUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingType) {
        await roomApi.updateType(editingType.id, formData);
        toast.success('Cập nhật thành công');
      } else {
        await roomApi.createType(formData);
        toast.success('Thêm loại phòng mới thành công');
      }
      setIsModalOpen(false);
      fetchRoomTypes();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc muốn xóa loại phòng này?')) {
      try {
        await roomApi.deleteType(id);
        toast.success('Xóa thành công');
        fetchRoomTypes();
      } catch (error) {
        toast.error('Lỗi khi xóa loại phòng');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Loại phòng</h1>
          <p className="text-sm text-gray-500 mt-1">Định nghĩa cấu hình gốc và giá cho từng hạng phòng.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <HiOutlinePlus className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Thêm Loại phòng mới</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm tên loại phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white">
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tên loại</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Giá cơ bản</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Sức chứa (Chuẩn/Tối đa)</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roomTypes.filter(t => t.type.toLowerCase().includes(searchTerm.toLowerCase())).map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg bg-gray-100 overflow-hidden shadow-inner">
                          {type.images.find(i => i.isThumbnail) ? (
                            <img src={type.images.find(i => i.isThumbnail)?.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <HiOutlinePhotograph className="w-full h-full p-2 text-gray-300" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{type.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-indigo-600">{type.basePrice.toLocaleString('vi-VN')}đ</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-gray-600 font-medium">{type.defaultCapacity} / {type.maxCapacity} Người</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(type)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><HiOutlinePencilAlt className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(type.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><HiOutlineTrash className="w-5 h-5" /></button>
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
              <h2 className="text-xl font-bold text-gray-900">{editingType ? 'Cập nhật loại phòng' : 'Thêm loại phòng mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"><HiOutlineX className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tên loại phòng</label>
                  <input required type="text" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value.toUpperCase() })} placeholder="VD: DELUXE, VIP..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giá cơ bản (VNĐ)</label>
                  <input required type="number" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-1"></div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sức chứa tiêu chuẩn</label>
                  <input required type="number" value={formData.defaultCapacity} onChange={e => setFormData({ ...formData, defaultCapacity: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sức chứa tối đa</label>
                  <input required type="number" value={formData.maxCapacity} onChange={e => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mô tả</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hình ảnh (Đường dẫn URL)</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={e => setImageUrlInput(e.target.value)}
                      placeholder="Nhập link ảnh (ví dụ: https://images.unsplash.com/...)"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-all whitespace-nowrap"
                    >
                      Thêm link
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><HiOutlineX className="w-3 h-3" /></button>
                        {img.isThumbnail && <span className="absolute bottom-0 inset-x-0 bg-indigo-600/80 text-white text-[10px] text-center py-0.5 font-bold">Thumbnail</span>}
                      </div>
                    ))}
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

export default RoomTypeManagementPage;
