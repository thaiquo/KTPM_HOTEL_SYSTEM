import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlinePlusCircle,
  HiOutlineMinusCircle,
} from 'react-icons/hi';
import { roomApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import type { Room } from '../../../types';
import toast from 'react-hot-toast';

type RoomStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'OCCUPIED' | 'HOLD';

interface RoomTypeSummary {
  id: number;
  type: string;
  basePrice: number;
  maxCapacity: number;
  defaultCapacity: number;
  description?: string;
}

interface BedForm {
  type: 'SINGLE' | 'DOUBLE' | 'QUEEN' | 'KING' | 'EXTRA' | 'SOFA' | 'BUNK';
  quantity: number;
}

interface RoomFormState {
  roomNumber: string;
  roomTypeId: number;
  status: RoomStatus;
  floor: number;
  note: string;
  actualCapacity: number;
  beds: BedForm[];
}

const STATUS_OPTIONS: Array<{ value: RoomStatus; label: string; badgeClass: string }> = [
  { value: 'AVAILABLE', label: 'Sẵn sàng', badgeClass: 'bg-green-100 text-green-700' },
  { value: 'BOOKED', label: 'Đã đặt', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'OCCUPIED', label: 'Đang ở', badgeClass: 'bg-amber-100 text-amber-700' },
  { value: 'HOLD', label: 'Giữ phòng', badgeClass: 'bg-violet-100 text-violet-700' },
  { value: 'MAINTENANCE', label: 'Bảo trì', badgeClass: 'bg-red-100 text-red-700' },
];

const BED_TYPES: BedForm['type'][] = ['SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'EXTRA', 'SOFA', 'BUNK'];

const defaultBeds = (): BedForm[] => [{ type: 'DOUBLE', quantity: 1 }];

const parseBeds = (bedSummary?: string): BedForm[] => {
  if (!bedSummary || bedSummary === 'Chưa cấu hình') {
    return defaultBeds();
  }

  return bedSummary
    .split(',')
    .map((item) => item.trim())
    .map((item) => {
      const match = item.match(/^(\d+)\s+(.+)$/);
      if (!match) {
        return null;
      }

      const quantity = Number(match[1]);
      const type = match[2].toUpperCase() as BedForm['type'];
      return Number.isFinite(quantity) && BED_TYPES.includes(type) ? { type, quantity } : null;
    })
    .filter((item): item is BedForm => item !== null);
};

const getRoomStatus = (room: Room): RoomStatus => {
  if (room.status) {
    return room.status;
  }

  return room.available ? 'AVAILABLE' : 'BOOKED';
};

const getStatusLabel = (status: RoomStatus) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

const getStatusBadgeClass = (status: RoomStatus) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';

const RoomManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | RoomStatus>('ALL');
  const canManageRooms = user?.role === 'ADMIN';

  const [formData, setFormData] = useState<RoomFormState>({
    roomNumber: '',
    roomTypeId: 0,
    status: 'AVAILABLE',
    floor: 1,
    note: '',
    actualCapacity: 2,
    beds: defaultBeds(),
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getAll();
      setRooms(data);
    } catch {
      toast.error('Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const data = (await roomApi.getRoomTypes()) as RoomTypeSummary[];
      setRoomTypes(data);
    } catch {
      toast.error('Không thể tải danh sách loại phòng');
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, []);

  const roomStats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((room) => getRoomStatus(room) === 'AVAILABLE').length;
    const maintenance = rooms.filter((room) => getRoomStatus(room) === 'MAINTENANCE').length;
    const occupied = rooms.filter((room) => ['BOOKED', 'OCCUPIED', 'HOLD'].includes(getRoomStatus(room))).length;
    const averageCapacity = total
      ? Math.round(rooms.reduce((sum, room) => sum + (room.maxGuests || 0), 0) / total)
      : 0;
    const occupancyRate = total ? Math.round((occupied / total) * 100) : 0;

    return { total, available, occupied, maintenance, averageCapacity, occupancyRate };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return rooms.filter((room) => {
      const roomStatus = getRoomStatus(room);
      const roomTypeMatched = selectedTypeFilter === 'ALL' || room.type === selectedTypeFilter;
      const statusMatched = selectedStatusFilter === 'ALL' || roomStatus === selectedStatusFilter;
      const keywordMatched =
        !keyword ||
        room.roomNumber.toLowerCase().includes(keyword) ||
        room.type.toLowerCase().includes(keyword) ||
        room.bedType.toLowerCase().includes(keyword);

      return roomTypeMatched && statusMatched && keywordMatched;
    });
  }, [rooms, searchTerm, selectedTypeFilter, selectedStatusFilter]);

  const handleOpenModal = (room?: Room) => {
    if (!canManageRooms) {
      return;
    }

    if (room) {
      const matchedType = roomTypes.find((type) => type.type === room.type);
      setEditingRoom(room);
      setFormData({
        roomNumber: room.roomNumber,
        roomTypeId: matchedType?.id || 0,
        status: getRoomStatus(room),
        floor: room.floor,
        note: room.note || room.description || '',
        actualCapacity: room.maxGuests,
        beds: parseBeds(room.bedType),
      });
    } else {
      setEditingRoom(null);
      setFormData({
        roomNumber: '',
        roomTypeId: roomTypes[0]?.id || 0,
        status: 'AVAILABLE',
        floor: 1,
        note: '',
        actualCapacity: 2,
        beds: defaultBeds(),
      });
    }

    setIsModalOpen(true);
  };

  const addBed = () => {
    setFormData((prev) => ({
      ...prev,
      beds: [...prev.beds, { type: 'SINGLE', quantity: 1 }],
    }));
  };

  const removeBed = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      beds: prev.beds.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateBed = (index: number, field: keyof BedForm, value: string | number) => {
    setFormData((prev) => {
      const beds = [...prev.beds];
      beds[index] = { ...beds[index], [field]: value } as BedForm;
      return { ...prev, beds };
    });
  };

  const buildRoomPayload = (roomTypeId: number, overrides?: Partial<RoomFormState>) => {
    const merged = { ...formData, ...overrides };

    return {
      roomNumber: merged.roomNumber,
      roomType: { id: roomTypeId },
      status: merged.status,
      floor: merged.floor,
      note: merged.note,
      actualCapacity: merged.actualCapacity,
      beds: merged.beds,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const roomTypeId = formData.roomTypeId || roomTypes[0]?.id || 0;
      const payload = buildRoomPayload(roomTypeId);

      if (editingRoom) {
        await roomApi.update(editingRoom.id, payload as any);
        toast.success('Cập nhật phòng thành công');
      } else {
        await roomApi.create(payload as any);
        toast.success('Thêm phòng mới thành công');
      }

      setIsModalOpen(false);
      await fetchRooms();
    } catch {
      toast.error('Có lỗi xảy ra khi lưu phòng');
    }
  };

  const handleDelete = async (room: Room) => {
    const confirmed = window.confirm(`Xóa phòng ${room.roomNumber}?`);
    if (!confirmed) return;

    try {
      await roomApi.remove(room.id);
      toast.success('Đã xóa phòng');
      await fetchRooms();
    } catch {
      toast.error('Không thể xóa phòng');
    }
  };

  const handleChangeStatus = async (room: Room, nextStatus: RoomStatus) => {
    try {
      const matchedType = roomTypes.find((type) => type.type === room.type);
      const payload = buildRoomPayload(matchedType?.id || 0, {
        roomNumber: room.roomNumber,
        status: nextStatus,
        floor: room.floor,
        note: room.note || room.description || '',
        actualCapacity: room.maxGuests,
        beds: parseBeds(room.bedType),
      });

      await roomApi.update(room.id, payload as any);
      toast.success(`Đã cập nhật trạng thái phòng ${room.roomNumber}`);
      await fetchRooms();
    } catch {
      toast.error('Không thể đổi trạng thái phòng');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTypeFilter('ALL');
    setSelectedStatusFilter('ALL');
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="shrink-0 -mx-6 px-6 pt-2 pb-4 bg-[#f8f9fc] border-b border-gray-100/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng</h1>
            <p className="text-sm text-gray-500 mt-1">Tìm kiếm phòng, đổi trạng thái và theo dõi sức chứa vận hành.</p>
          </div>
          {canManageRooms && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <HiOutlinePlus className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Thêm Phòng mới</span>
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tổng phòng</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{roomStats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Sẵn sàng</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{roomStats.available}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Đang sử dụng</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{roomStats.occupied}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Bảo trì</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{roomStats.maintenance}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Lấp đầy</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{roomStats.occupancyRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Sức chứa TB {roomStats.averageCapacity} khách</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="p-6 border-b border-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:flex-1">
            <div className="relative w-full md:w-80">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm số phòng, loại phòng..."
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
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.type}>
                    {type.type}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-full md:w-48">
              <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as 'ALL' | RoomStatus)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none shadow-sm cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="w-full xl:w-auto px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-white">
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Số phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tầng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Loại phòng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Sức chứa</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Trạng thái</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRooms.map((room) => {
                  const status = getRoomStatus(room);
                  return (
                    <tr key={room.id} className="hover:bg-gray-50/50 transition-all align-top">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                            {room.roomNumber}
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-gray-900">Phòng {room.roomNumber}</span>
                            <span className="block text-xs text-gray-400">{room.bedType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">Tầng {room.floor}</td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{room.type}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{room.maxGuests} khách</td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadgeClass(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => handleChangeStatus(room, 'AVAILABLE')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              Sẵn sàng
                            </button>
                            <button
                              onClick={() => handleChangeStatus(room, 'OCCUPIED')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              Đang ở
                            </button>
                            <button
                              onClick={() => handleChangeStatus(room, 'MAINTENANCE')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Bảo trì
                            </button>
                          </div>
                          {canManageRooms && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenModal(room)}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Chỉnh sửa"
                              >
                                <HiOutlinePencilAlt className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(room)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Xóa phòng"
                              >
                                <HiOutlineTrash className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-sm text-gray-400">
                      Không tìm thấy phòng phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {canManageRooms && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingRoom ? 'Cập nhật phòng' : 'Thêm phòng mới'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số phòng</label>
                  <input
                    required
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="VD: 101"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tầng</label>
                  <input
                    required
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Loại phòng</label>
                  <select
                    value={formData.roomTypeId}
                    onChange={(e) => setFormData({ ...formData, roomTypeId: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sức chứa thực tế</label>
                  <input
                    required
                    type="number"
                    value={formData.actualCapacity}
                    onChange={(e) => setFormData({ ...formData, actualCapacity: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi chú</label>
                  <textarea
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Mô tả ngắn về phòng"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Cấu hình giường</label>
                    <button
                      type="button"
                      onClick={addBed}
                      className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      <HiOutlinePlusCircle className="w-4 h-4 mr-1" />
                      Thêm giường
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.beds.map((bed, index) => (
                      <div key={`${bed.type}-${index}`} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-left-2 duration-300">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loại giường</label>
                          <select
                            value={bed.type}
                            onChange={(e) => updateBed(index, 'type', e.target.value as BedForm['type'])}
                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none"
                          >
                            {BED_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Số lượng</label>
                          <input
                            type="number"
                            min={1}
                            value={bed.quantity}
                            onChange={(e) => updateBed(index, 'quantity', Number(e.target.value))}
                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none"
                          />
                        </div>
                        <button type="button" onClick={() => removeBed(index)} className="p-2 text-gray-400 hover:text-red-500 transition-all">
                          <HiOutlineMinusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                    {formData.beds.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm italic">
                        Chưa có giường nào được thiết lập
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
