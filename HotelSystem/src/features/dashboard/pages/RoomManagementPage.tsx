import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineX,
  HiOutlineChevronDown,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineShieldExclamation,
  HiOutlineBan,
  HiOutlineLockClosed,
} from 'react-icons/hi';
import { roomApi } from '../../../services/roomApi';
import type { Room } from '../../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Enum mapping ──────────────────────────────────────────────────────────────
// Dùng đúng enum RoomStatus từ backend: AVAILABLE, OCCUPIED, RESERVED, CLEANING,
// MAINTENANCE, OUT_OF_SERVICE, BLOCKED

const ROOM_STATUS_LABELS: Record<string, string> = {
  AVAILABLE:      'Sẵn sàng',
  OCCUPIED:       'Đang có khách',
  RESERVED:       'Đã đặt',
  CLEANING:       'Đang dọn dẹp',
  MAINTENANCE:    'Bảo trì',
  OUT_OF_SERVICE: 'Ngừng phục vụ',
  BLOCKED:        'Bị khóa',
};

const ROOM_STATUS_BADGE: Record<string, string> = {
  AVAILABLE:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  OCCUPIED:       'bg-rose-100 text-rose-700 border-rose-200',
  RESERVED:       'bg-blue-100 text-blue-700 border-blue-200',
  CLEANING:       'bg-amber-100 text-amber-700 border-amber-200',
  MAINTENANCE:    'bg-orange-100 text-orange-700 border-orange-200',
  OUT_OF_SERVICE: 'bg-gray-200 text-gray-700 border-gray-300',
  BLOCKED:        'bg-slate-800 text-slate-100 border-slate-700',
};

const ROOM_STATUS_ICON: Record<string, React.ReactNode> = {
  AVAILABLE:      <HiOutlineCheckCircle className="w-3.5 h-3.5" />,
  OCCUPIED:       <HiOutlineClock className="w-3.5 h-3.5" />,
  RESERVED:       <HiOutlineClock className="w-3.5 h-3.5" />,
  CLEANING:       <HiOutlineRefresh className="w-3.5 h-3.5" />,
  MAINTENANCE:    <HiOutlineExclamationCircle className="w-3.5 h-3.5" />,
  OUT_OF_SERVICE: <HiOutlineBan className="w-3.5 h-3.5" />,
  BLOCKED:        <HiOutlineLockClosed className="w-3.5 h-3.5" />,
};

/** Các trạng thái mà Staff có thể chuyển đến từ một trạng thái nguồn */
const ALLOWED_TARGET_STATUSES: Record<string, string[]> = {
  AVAILABLE:      ['CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  OCCUPIED:       ['MAINTENANCE', 'OUT_OF_SERVICE'],
  RESERVED:       ['MAINTENANCE', 'OUT_OF_SERVICE'],
  CLEANING:       ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  MAINTENANCE:    ['AVAILABLE', 'CLEANING', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE', 'CLEANING', 'MAINTENANCE'],
  BLOCKED:        ['MAINTENANCE', 'OUT_OF_SERVICE'],
};

/** Trạng thái yêu cầu nhập lý do bắt buộc */
const REQUIRES_REASON = new Set(['MAINTENANCE', 'OUT_OF_SERVICE']);

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface RoomTypeOption { id: number; type: string; }

interface StatusUpdateModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
  staffId?: string;
}

// ─── Status Update Modal ──────────────────────────────────────────────────────
function StatusUpdateModal({ room, onClose, onSuccess, staffId }: StatusUpdateModalProps) {
  const currentStatus = room.status?.toUpperCase() ?? 'AVAILABLE';
  const targets = ALLOWED_TARGET_STATUSES[currentStatus] ?? [];

  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const needsReason = REQUIRES_REASON.has(selectedStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) { toast.error('Vui lòng chọn trạng thái mới'); return; }
    if (needsReason && !reason.trim()) { toast.error('Bắt buộc nhập lý do khi chuyển sang ' + ROOM_STATUS_LABELS[selectedStatus]); return; }

    setLoading(true);
    try {
      await roomApi.staffUpdateStatus(room.id, selectedStatus, {
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
        changedBy: staffId,
      });
      toast.success(`Phòng ${room.roomNumber} → ${ROOM_STATUS_LABELS[selectedStatus]}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.userMessage || 'Cập nhật thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-slate-50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cập nhật trạng thái phòng</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Phòng <span className="font-bold text-indigo-600">{room.roomNumber}</span>
              &nbsp;·&nbsp;
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROOM_STATUS_BADGE[currentStatus] ?? ''}`}>
                {ROOM_STATUS_ICON[currentStatus]}
                {ROOM_STATUS_LABELS[currentStatus] ?? currentStatus}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Chọn trạng thái mới */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Trạng thái mới *
            </label>
            {targets.length === 0 ? (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500 text-center">
                Không có trạng thái hợp lệ để chuyển từ <strong>{ROOM_STATUS_LABELS[currentStatus]}</strong>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {targets.map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      selectedStatus === st
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      st === 'AVAILABLE' ? 'bg-emerald-500' :
                      st === 'CLEANING' ? 'bg-amber-500' :
                      st === 'MAINTENANCE' ? 'bg-orange-500' :
                      st === 'OUT_OF_SERVICE' ? 'bg-gray-500' : 'bg-indigo-500'
                    }`} />
                    {ROOM_STATUS_LABELS[st] ?? st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lý do — bắt buộc khi MAINTENANCE / OUT_OF_SERVICE */}
          {selectedStatus && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Lý do {needsReason ? <span className="text-red-500">*</span> : <span className="text-gray-300">(tùy chọn)</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={needsReason
                  ? 'Nhập lý do bắt buộc (VD: Điều hòa hỏng, Vòi sen rò rỉ...)'
                  : 'Nhập lý do nếu cần (tùy chọn)'}
                rows={2}
                className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                  needsReason && !reason.trim()
                    ? 'border-red-200 focus:ring-red-400'
                    : 'border-gray-200 focus:ring-indigo-400'
                }`}
              />
            </div>
          )}

          {/* Ghi chú thêm */}
          {selectedStatus && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Ghi chú <span className="text-gray-300">(tùy chọn)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  selectedStatus === 'AVAILABLE'
                    ? 'VD: Đã dọn xong, thay khăn mới...'
                    : selectedStatus === 'CLEANING'
                    ? 'VD: Đang chờ nhân viên dọn phòng...'
                    : 'Ghi chú thêm...'
                }
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
              />
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2 border-t border-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!selectedStatus || (needsReason && !reason.trim()) || loading || targets.length === 0}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>
              ) : 'Xác nhận cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status Badge Component ────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase() ?? '';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${ROOM_STATUS_BADGE[s] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {ROOM_STATUS_ICON[s]}
      {ROOM_STATUS_LABELS[s] ?? status ?? 'Không rõ'}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const StaffRoomMonitorPage: React.FC = () => {
  const { user } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [floor, setFloor] = useState('');
  const [roomType, setRoomType] = useState('');
  const [status, setStatus] = useState('');
  const [viewType, setViewType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [sortBy, setSortBy] = useState('room_asc');

  // Phân trang client-side
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal
  const [statusModal, setStatusModal] = useState<Room | null>(null);

  // Debounce search timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load room types on mount ──────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => {
      roomApi.getRoomTypes()
        .then((data) => setRoomTypes(data))
        .catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(t);
  }, []);

  // ── Search function ───────────────────────────────────────────────────────
  const handleSearch = useCallback(async (resetPage = true) => {
    setLoading(true);
    setError('');
    if (resetPage) setPage(1);

    try {
      const result = await roomApi.staffSearch({
        keyword: keyword.trim() || undefined,
        floor: floor ? Number(floor) : undefined,
        roomType: roomType || undefined,
        status: status || undefined,
        viewType: viewType || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        checkInDate: checkInDate || undefined,
        checkOutDate: checkOutDate || undefined,
        sortBy: sortBy,
      });
      setRooms(result);
      setSearched(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.userMessage || 'Không thể tải danh sách phòng';
      setError(msg);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [keyword, floor, roomType, status, viewType, minPrice, maxPrice, checkInDate, checkOutDate, sortBy]);

  // ── Debounce keyword search ───────────────────────────────────────────────
  const triggerDebounceSearch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleSearch(true);
    }, 400);
  }, [handleSearch]);

  // ── Reset filters ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setKeyword('');
    setFloor('');
    setRoomType('');
    setStatus('');
    setViewType('');
    setMinPrice('');
    setMaxPrice('');
    setCheckInDate('');
    setCheckOutDate('');
    setSortBy('room_asc');
    setRooms([]);
    setSearched(false);
    setError('');
    setPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE));
  const pagedRooms = rooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Unique floor list từ dữ liệu ─────────────────────────────────────────
  const uniqueFloors = Array.from(new Set(rooms.map(r => r.floorNumber).filter(Boolean))).sort((a, b) => (a ?? 0) - (b ?? 0));

  // ── View type options ─────────────────────────────────────────────────────
  const VIEW_TYPES = ['City View', 'River View', 'Pool View', 'Garden View', 'No View'];

  const hasFilters = !!(keyword || floor || roomType || status || viewType || minPrice || maxPrice || checkInDate || checkOutDate);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Theo dõi & Vận hành Phòng</h1>
          <p className="text-sm text-gray-500 mt-1">Tìm kiếm, lọc phòng và cập nhật trạng thái vận hành. Không chỉnh sửa thông tin cố định của phòng.</p>
        </div>
        {/* Summary badges */}
        {searched && !loading && (
          <div className="flex flex-wrap gap-2 items-center">
            {(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'] as const).map((s) => {
              const count = rooms.filter(r => r.status?.toUpperCase() === s).length;
              if (count === 0) return null;
              return (
                <span key={s} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${ROOM_STATUS_BADGE[s]}`}>
                  {ROOM_STATUS_ICON[s]}{ROOM_STATUS_LABELS[s]}: {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filter Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineFilter className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-700">Bộ lọc tìm kiếm</span>
            {hasFilters && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                Đang lọc
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={handleReset} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-500 transition-all">
              <HiOutlineX className="w-4 h-4" /> Reset bộ lọc
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Row 1: Keyword + Sort */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="staff-room-keyword"
                placeholder="Tìm số phòng (vd: 201, 502...)"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  triggerDebounceSearch();
                }}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2 min-w-48">
              <span className="text-xs font-bold text-gray-400 whitespace-nowrap">Sắp xếp:</span>
              <select id="staff-room-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 py-2.5 px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                <option value="room_asc">Số phòng A→Z</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="floor_asc">Tầng thấp → cao</option>
                <option value="floor_desc">Tầng cao → thấp</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dropdowns */}
          <div className="flex flex-wrap gap-3">
            {/* Trạng thái */}
            <div className="relative min-w-40">
              <select id="staff-filter-status" value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(ROOM_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Loại phòng */}
            <div className="relative min-w-40">
              <select id="staff-filter-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                <option value="">Tất cả loại phòng</option>
                {roomTypes.map((t) => <option key={t.id} value={t.type}>{t.type}</option>)}
              </select>
              <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Tầng */}
            <div className="relative min-w-32">
              <select id="staff-filter-floor" value={floor} onChange={(e) => setFloor(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                <option value="">Tất cả tầng</option>
                {(searched ? uniqueFloors : [1,2,3,4,5,6,7,8]).map((f) => (
                  <option key={f} value={f}>Tầng {f}</option>
                ))}
              </select>
              <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* View */}
            <div className="relative min-w-40">
              <select id="staff-filter-view" value={viewType} onChange={(e) => setViewType(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                <option value="">Tất cả view</option>
                {VIEW_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 3: Giá + Ngày + Search button */}
          <div className="flex flex-wrap gap-3 items-end">
            {/* Khoảng giá */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giá tối thiểu</label>
                <input id="staff-filter-min-price" type="number" min="0" step="100000" placeholder="0" value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <span className="text-gray-300 mt-5">—</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giá tối đa</label>
                <input id="staff-filter-max-price" type="number" min="0" step="100000" placeholder="Không giới hạn" value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-36 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {/* Khoảng ngày */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phòng trống từ</label>
                <input id="staff-filter-checkin" type="date" value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <span className="text-gray-300 mt-5">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">đến ngày</label>
                <input id="staff-filter-checkout" type="date" value={checkOutDate} min={checkInDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {/* Search button */}
            <button
              id="staff-room-search-btn"
              onClick={() => handleSearch(true)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-60 active:scale-95"
            >
              <HiOutlineSearch className="w-4 h-4" />
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Result Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">
            {searched && !loading ? (
              rooms.length > 0
                ? `${rooms.length} phòng • Trang ${page}/${totalPages}`
                : 'Không tìm thấy phòng nào'
            ) : 'Danh sách phòng'}
          </span>
          {searched && !loading && rooms.length > 0 && (
            <span className="text-xs text-gray-400">
              Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rooms.length)} / {rooms.length}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Đang tải dữ liệu phòng...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-8 text-center">
            <HiOutlineExclamationCircle className="mx-auto w-10 h-10 text-red-300 mb-3" />
            <p className="text-red-600 font-bold text-sm">{error}</p>
            <button onClick={() => handleSearch(true)}
              className="mt-4 px-5 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all">
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state — before search */}
        {!searched && !loading && !error && (
          <div className="py-24 text-center">
            <div className="text-5xl mb-4">🏨</div>
            <h2 className="text-lg font-bold text-gray-700">Nhập điều kiện và bấm "Tìm kiếm"</h2>
            <p className="mt-2 text-sm text-gray-400">Hoặc để trống tất cả và bấm Tìm để xem toàn bộ phòng.</p>
          </div>
        )}

        {/* Empty results */}
        {searched && !loading && !error && rooms.length === 0 && (
          <div className="py-20 text-center">
            <HiOutlineShieldExclamation className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-bold">Không tìm thấy phòng phù hợp</p>
            <p className="text-sm text-gray-400 mt-1">Thử điều chỉnh bộ lọc hoặc reset để xem tất cả.</p>
            <button onClick={handleReset} className="mt-4 px-5 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
              Reset bộ lọc
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && pagedRooms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-gray-50">
                  <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Số phòng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tầng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Loại phòng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">View</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sức chứa</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Giá / đêm</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedRooms.map((room) => {
                  const canUpdate = !!ALLOWED_TARGET_STATUSES[room.status?.toUpperCase() ?? '']?.length;
                  return (
                    <tr key={room.id} className="hover:bg-indigo-50/30 transition-colors group">
                      {/* Số phòng */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center text-indigo-700 font-black text-sm border border-indigo-100">
                            {room.roomNumber}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Phòng {room.roomNumber}</p>
                            {room.note && (
                              <p className="text-[10px] text-gray-400 max-w-28 truncate" title={room.note}>
                                💬 {room.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tầng */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 font-medium">Tầng {room.floorNumber ?? room.floor}</span>
                        {room.floorLevel && (
                          <p className="text-[10px] text-gray-400">{room.floorLevel}</p>
                        )}
                      </td>

                      {/* Loại phòng */}
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {room.roomType?.type ?? room.type ?? '—'}
                        </span>
                      </td>

                      {/* View */}
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {room.viewType ?? '—'}
                      </td>

                      {/* Sức chứa */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{room.maxCapacity ?? room.maxGuests ?? '—'} người</span>
                      </td>

                      {/* Giá */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {room.roomType?.basePrice
                            ? room.roomType.basePrice.toLocaleString('vi-VN') + 'đ'
                            : room.price
                            ? room.price.toLocaleString('vi-VN') + 'đ'
                            : '—'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4">
                        <StatusBadge status={room.status} />
                      </td>

                      {/* Hành động */}
                      <td className="px-6 py-4 text-right">
                        {canUpdate ? (
                          <button
                            id={`update-status-btn-${room.id}`}
                            onClick={() => setStatusModal(room)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95"
                          >
                            <HiOutlineRefresh className="w-3.5 h-3.5" />
                            Cập nhật
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300 italic">Không thể cập nhật</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && rooms.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  page === p
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >{p}</button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >→</button>
          </div>
        )}
      </div>

      {/* ── Status Update Modal ── */}
      {statusModal && (
        <StatusUpdateModal
          room={statusModal}
          staffId={user?.id}
          onClose={() => setStatusModal(null)}
          onSuccess={() => handleSearch(false)}
        />
      )}
    </div>
  );
};

export default StaffRoomMonitorPage;
