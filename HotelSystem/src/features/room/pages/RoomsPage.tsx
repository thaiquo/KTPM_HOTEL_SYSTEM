import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { roomApi } from '../../../services/roomApi';
import type { Room, RoomType } from '../../../types';
import Spinner from '../../../shared/components/ui/Spinner';
import { consumeClientRateLimit } from '../../../shared/lib/clientRateLimiter';

// ─── Helpers ─────────────────────────────────────────────
const VIEW_BONUS: Record<string, number> = {
  'River View': 150000, 'Pool View': 150000,
  'Garden View': 50000, 'City View': 0, 'No View': 0,
};

const AMENITY_ICONS: Record<string, string> = {
  HIGH_SPEED_WIFI: '📶', SMART_TV: '📺', MINIBAR: '🍸', SAFE: '🔒',
  BATHTUB: '🛁', RAIN_SHOWER: '🚿', COFFEE_MACHINE: '☕',
  PRIVATE_BALCONY: '🌿', LOUNGE_ACCESS: '🏢', WORK_DESK: '💼',
  BLUETOOTH_SPEAKER: '🔊', PREMIUM_BEDDING: '🛏️', WELCOME_FRUIT: '🍎',
  KITCHENETTE: '🍳', JACUZZI: '♨️', TURNDOWN_SERVICE: '🌙',
  BLACKOUT_CURTAIN: '🌑', SOFA_SEATING: '🛋️', USB_CHARGING: '🔌',
  SMART_CONTROL: '📱', DUAL_SINK: '🪣', TOILETRIES: '🧴', BIDET: '🚽',
  KETTLE: '🫖', MICROWAVE: '📦',
};

function calcPrice(room: Room) {
  const base = room.roomType?.basePrice ?? 0;
  const viewBonus = VIEW_BONUS[room.viewType] ?? 0;
  const bathtubBonus = room.hasBathtub ? 50000 : 0;
  return { base, viewBonus, bathtubBonus, total: base + viewBonus + bathtubBonus };
}

function getBedLabel(room: Room): string {
  if (room.beds?.length)
    return room.beds.map(b => `${b.quantity} ${b.type}`).join(' + ');

  const configs = room.roomType?.bedConfigs ?? [];
  const primaryConfigs = configs.filter(config => config.isPrimary);
  const displayConfigs = primaryConfigs.length > 0 ? primaryConfigs : configs;

  if (displayConfigs.length > 0) {
    return displayConfigs.map(config => `${config.quantity} ${config.bedType.name}`).join(' + ');
  }

  return 'Chưa cấu hình giường';
}

function getAmenities(room: Room) {
  return (room.amenities ?? []).filter(ra => ra.isActive).map(ra => ra.amenity).slice(0, 4);
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr < end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

function getWeekendNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const dates = getDatesInRange(checkIn, checkOut);
  return dates.reduce((count: number, date: string) => {
    const day = new Date(date).getDay();
    return count + (day === 0 || day === 6 ? 1 : 0);
  }, 0);
}

function getConnectedRoomLabel(room: Room, roomLookup: Record<string, string>) {
  if (!room.isConnecting) return null;
  if (!room.connectedRoomId) return 'Connecting';
  const connectedRoomNumber = roomLookup[String(room.connectedRoomId)];
  return connectedRoomNumber
    ? `Connecting với Phòng ${connectedRoomNumber}`
    : 'Connecting với phòng liên thông';
}

// Filter chips — keys are sent to server as query param "features"
const FILTERS = [
  { key: 'city',       label: '🌆 City View' },
  { key: 'pool',       label: '🏊 Pool View' },
  { key: 'river',      label: '🌊 River View' },
  { key: 'garden',     label: '🌳 Garden View' },
  { key: 'balcony',    label: '🌿 Có ban công' },
  { key: 'bathtub',    label: '🛁 Có bồn tắm' },
  { key: 'accessible', label: '♿ Accessible' },
  { key: 'high',       label: '🏢 Tầng cao' },
];

const SORT_OPTIONS = [
  { key: 'price_asc',  label: 'Giá tăng dần' },
  { key: 'price_desc', label: 'Giá giảm dần' },
  { key: 'floor_asc',  label: 'Tầng thấp → cao' },
  { key: 'floor_desc', label: 'Tầng cao → thấp' },
];

const CACHE_KEY = 'rooms_search_cache';
const PAGE_SIZE = 6;

// ─── Room Card ────────────────────────────────────────────

const typeColor: Record<string, string> = {
  STANDARD: 'bg-slate-700', DELUXE: 'bg-indigo-700',
  EXECUTIVE: 'bg-violet-700', FAMILY: 'bg-emerald-700', SUITE: 'bg-amber-700',
};

function RoomCard({ room, checkIn, checkOut, guests, connectedRoomLookup }: {
  room: Room; checkIn: string; checkOut: string; guests: number;
  connectedRoomLookup: Record<string, string>;
}) {
  const navigate = useNavigate();
  const { base, viewBonus, bathtubBonus, total } = calcPrice(room);
  const bedLabel = getBedLabel(room);
  const amenities = getAmenities(room);
  const numberOfNights = checkIn && checkOut ? Math.max(1, getDatesInRange(checkIn, checkOut).length) : 1;
  const totalStayPrice = total * numberOfNights;
  const weekendNightCount = getWeekendNightCount(checkIn, checkOut);
  const connectedRoomLabel = getConnectedRoomLabel(room, connectedRoomLookup);
  const thumbnail = room.roomType?.images?.find(i => i.isThumbnail)?.imageUrl
    || room.roomType?.images?.[0]?.imageUrl
    || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800';
  const badge = typeColor[room.roomType?.type ?? ''] ?? 'bg-gray-700';
  const isPopular = room.viewType?.includes('River') || room.viewType?.includes('Pool');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col md:flex-row overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
    >
        <div className="relative w-full md:w-56 h-52 md:h-auto shrink-0 overflow-hidden">
        <img src={thumbnail} alt={`Phòng ${room.roomNumber}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent" />
        <span className={`absolute top-3 left-3 ${badge} text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md`}>
          {room.roomType?.type}
        </span>
        {isPopular && (
          <span className="absolute top-3 right-3 bg-[#d4af37] text-black text-[10px] font-black px-2.5 py-1 rounded-md">
            Phổ biến
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888]">
            Tầng {room.floorNumber} ({room.floorLevel}) · {room.areaM2}m² · {bedLabel}
            {connectedRoomLabel && (
              <span className="ml-2 text-indigo-600">{connectedRoomLabel}</span>
            )}
          </p>
          <h3 className="mt-1 text-lg font-black text-[#111]">
            Phòng {room.roomNumber}
            <span className="ml-2 text-sm font-medium text-[#666]">— {room.viewType}</span>
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[room.viewType, room.hasBalcony && 'Ban công', room.hasBathtub && 'Bồn tắm',
            room.smokingPolicy === 'NON_SMOKING' ? 'Non-smoking' : '🚬 Smoking', bedLabel]
            .filter(Boolean).map((tag, i) => (
              <span key={i} className="rounded-md border border-black/8 bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-semibold text-[#555]">
                {tag as string}
              </span>
            ))}
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {amenities.map(a => (
              <span key={a.id} className="flex items-center gap-1 text-xs text-[#555] bg-[#f5f5f5] px-2 py-1 rounded-lg">
                <span>{AMENITY_ICONS[a.code] ?? '✦'}</span>
                <span>{a.name}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-black/5 pt-3">
          <div>
            <div className="text-xl font-black text-[#0f0f0f]">
              {total.toLocaleString('vi-VN')}đ
              <span className="text-xs font-medium text-[#888] ml-1">/đêm</span>
            </div>
            {checkIn && checkOut && (
              <div className="mt-1 text-sm font-black text-indigo-700">
                Tổng {numberOfNights} đêm: {totalStayPrice.toLocaleString('vi-VN')}đ
              </div>
            )}
            {(viewBonus > 0 || bathtubBonus > 0) && (
              <div className="text-[10px] text-[#aaa] mt-0.5">
                Gốc {base.toLocaleString('vi-VN')}đ
                {viewBonus > 0 && ` + ${viewBonus.toLocaleString('vi-VN')}đ view`}
                {bathtubBonus > 0 && ` + ${bathtubBonus.toLocaleString('vi-VN')}đ bồn tắm`}
              </div>
            )}
            {checkIn && checkOut && (
              <div className="text-[10px] text-indigo-600 mt-0.5 font-bold">
                {weekendNightCount > 0
                  ? `${weekendNightCount} đêm cuối tuần (T7, CN) tăng 20%`
                  : 'Cuối tuần (T7, CN) tăng 20% nếu rơi vào ngày lưu trú'}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}
            className="ml-4 shrink-0 rounded-xl bg-[#0f0f0f] px-5 py-2.5 text-sm font-black text-[#d4af37] shadow-lg transition-all hover:bg-[#d4af37] hover:text-black active:scale-95"
          >
            Chọn →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function RoomsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [checkIn,    setCheckIn]    = useState(searchParams.get('checkIn')   || '');
  const [checkOut,   setCheckOut]   = useState(searchParams.get('checkOut')  || '');
  const [guests,     setGuests]     = useState(Number(searchParams.get('guests') || 2));
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');

  // Server-side paged results
  const [rooms,          setRooms]          = useState<Room[]>([]);
  const [roomTypes,      setRoomTypes]      = useState<RoomType[]>([]);
  const [roomLookup,     setRoomLookup]     = useState<Record<string, string>>({});
  const [loading,        setLoading]        = useState(false);
  const [searched,       setSearched]       = useState(false);
  const [error,          setError]          = useState('');
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [totalElements,  setTotalElements]  = useState(0);
  const [activeFilters,  setActiveFilters]  = useState<string[]>([]);
  const [sort,           setSort]           = useState('price_asc');

  // ── On mount: load room types (delayed 2s) + restore cache ──────────
  useEffect(() => {
    // Delay nhẹ để tránh block Vite khi room-service chưa ready
    const typeTimer = window.setTimeout(() => {
      roomApi.getRoomTypes().then(setRoomTypes).catch(() => undefined);
    }, 2000);

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { rooms: r, ci, co, g, t: typeId, activeF, sPattern, pg, tPages, tElems } = JSON.parse(cached);
        if (ci && co && r) {
          setRooms(r);
          setRoomLookup(Object.fromEntries((r as Room[]).map((rm) => [rm.id, rm.roomNumber])));
          setSearched(true);
          setCheckIn(ci);
          setCheckOut(co);
          setGuests(g || 2);
          setTypeFilter(typeId || '');
          setActiveFilters(activeF || []);
          setSort(sPattern || 'price_asc');
          setPage(pg || 1);
          setTotalPages(tPages || 1);
          setTotalElements(tElems || r.length);
        }
      } catch { /* ignore bad cache */ }
    }

    return () => window.clearTimeout(typeTimer);
  }, []);

  // ── Core search function — called on button press or page change ──
  const handleSearch = async (
    targetPage = 1,
    ci         = checkIn,
    co         = checkOut,
    g          = guests,
    t          = typeFilter,
    f          = activeFilters,
    s          = sort,
  ) => {
    if (!ci || !co) return;
    if (loading) return;

    const searchKey = `room-search:${targetPage}:${ci}:${co}:${g}:${t}:${f.join(',')}:${s}`;
    const limit = consumeClientRateLimit(searchKey, 1200);
    if (!limit.allowed) {
      setError(`Bạn tìm kiếm quá nhanh. Vui lòng thử lại sau ${limit.retryAfterSeconds} giây.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const effectiveTypeId = t && String(t).trim() !== '' ? String(t) : undefined;

      // ✅ Dùng getAvailableRooms — đây là endpoint hiện tại
      // Backend đã lọc phòng bị đặt theo checkIn/checkOut và theo roomType.
      // Frontend chỉ lọc thêm theo maxCapacity và activeFilters chip (hiển thị nhẹ phía client).
      const data = await roomApi.getAvailableRooms(effectiveTypeId, ci, co);

      // Lọc capacity ngay trước khi tính pagination
      let filtered = data.filter((r) => r.maxCapacity >= g);

      // Lọc filter chips
      if (f.includes('city'))       filtered = filtered.filter(r => r.viewType === 'City View');
      if (f.includes('pool'))       filtered = filtered.filter(r => r.viewType === 'Pool View');
      if (f.includes('river'))      filtered = filtered.filter(r => r.viewType === 'River View');
      if (f.includes('garden'))     filtered = filtered.filter(r => r.viewType === 'Garden View');
      if (f.includes('balcony'))    filtered = filtered.filter(r => r.hasBalcony);
      if (f.includes('bathtub'))    filtered = filtered.filter(r => r.hasBathtub);
      if (f.includes('accessible')) filtered = filtered.filter(r => r.isAccessible);
      if (f.includes('high'))       filtered = filtered.filter(r => r.floorLevel === 'HIGH' || r.floorLevel === 'TOP');

      // Sort
      filtered.sort((a, b) => {
        switch (s) {
          case 'price_asc':  return calcPrice(a).total - calcPrice(b).total;
          case 'price_desc': return calcPrice(b).total - calcPrice(a).total;
          case 'floor_asc':  return a.floorNumber - b.floorNumber;
          case 'floor_desc': return b.floorNumber - a.floorNumber;
          default: return 0;
        }
      });

      // ✅ Pagination phía client — vì API hiện tại không trả Page<>
      // Khi backend hỗ trợ paginated endpoint thì chuyển sang.
      const tp = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const safePage = Math.min(targetPage, tp);
      const start = (safePage - 1) * PAGE_SIZE;
      const pageRooms = filtered.slice(start, start + PAGE_SIZE);

      setRooms(pageRooms);
      setRoomLookup(Object.fromEntries(data.map((r) => [r.id, r.roomNumber])));
      setPage(safePage);
      setTotalPages(tp);
      setTotalElements(filtered.length);
      setSearched(true);

      // Cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        rooms: pageRooms, ci, co, g, t, activeF: f, sPattern: s,
        pg: safePage, tPages: tp, tElems: filtered.length,
      }));

      // Sync URL
      const params = new URLSearchParams({ checkIn: ci, checkOut: co, guests: String(g) });
      if (effectiveTypeId) params.append('type', effectiveTypeId);
      navigate(`/rooms?${params.toString()}`, { replace: true });

    } catch (err) {
      console.error(err);
      // Giữ searched=true để không làm mất dữ liệu cũ trên UI khi timeout/lỗi
      // Chỉ hiển thị thông báo lỗi, không xóa danh sách phòng đang hiển thị
      setError('Không thể tải danh sách phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => {
    handleSearch(p, checkIn, checkOut, guests, typeFilter, activeFilters, sort);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    // Filter chips chỉ update state — gọi API khi bấm "Tìm" hoặc thông qua tìm kiếm lại
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#141414]">

      {/* ─── Search Box Card ───────────────────────────────── */}
      <div className="container-custom pt-8 pb-2">
        <div className="rounded-2xl bg-white border border-black/8 shadow-md p-5">

          {/* Title */}
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-[#888]" />
            <span className="text-sm font-black text-[#333] uppercase tracking-wider">Tìm phòng</span>
          </div>

          {/* Row 1: inputs + button */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-36.25">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#999]">Nhận phòng</label>
              <input type="date" min={today} value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="h-10 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold text-[#222] focus:border-[#d4af37] focus:outline-none focus:bg-white transition-all" />
            </div>
            <div className="flex flex-col gap-1 min-w-36.25">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#999]">Trả phòng</label>
              <input type="date" min={checkIn || today} value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                className="h-10 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold text-[#222] focus:border-[#d4af37] focus:outline-none focus:bg-white transition-all" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#999]">Số khách</label>
              <select value={guests} onChange={e => setGuests(Number(e.target.value))}
                className="h-10 rounded-xl border border-black/10 bg-[#fafafa] px-3 pr-8 text-sm font-bold text-[#222] focus:border-[#d4af37] focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer">
                {[1,2,3,4].map(n => <option key={n} value={n}>{n} người</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#999]">Loại phòng</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="h-10 rounded-xl border border-black/10 bg-[#fafafa] px-3 pr-8 text-sm font-bold text-[#222] focus:border-[#d4af37] focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer">
                <option value="">Tất cả</option>
                {roomTypes.map(t => <option key={t.id} value={String(t.id)}>{t.type}</option>)}
              </select>
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={!checkIn || !checkOut || loading}
              className="h-10 shrink-0 rounded-xl bg-[#d4af37] px-6 text-sm font-black text-black shadow-md transition-all hover:brightness-110 disabled:opacity-40 active:scale-95 flex items-center gap-2"
            >
              <Search size={14} />
              {loading ? 'Đang tìm...' : 'Tìm ↗'}
            </button>
          </div>

        </div>
      </div>

      {/* ─── Filter / Sort Card ─────────────────────────────── */}
      <div className="container-custom pt-2 pb-4">
        <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4">

          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* LEFT */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#aaa]">
                Bộ lọc:
              </span>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
                    activeFilters.includes(f.key)
                      ? 'bg-[#0f0f0f] text-[#d4af37] border-[#0f0f0f]'
                      : 'bg-[#f5f5f5] text-[#555] border-black/8 hover:border-black/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#aaa]">
                Sắp xếp:
              </span>
              <select
                value={sort}
                onChange={handleSortChange}
                className="rounded-xl border border-black/10 bg-[#fafafa] px-3 py-1.5 text-xs font-bold text-[#222] focus:border-[#d4af37] focus:outline-none appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Result count */}
          {searched && (
            <div className="mt-4 pt-4 border-t border-black/5">
              <span className="text-sm font-bold text-[#555]">
                {totalElements > 0
                  ? `${totalElements} phòng phù hợp`
                  : 'Không có phòng phù hợp'}
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────── */}
      <div className="container-custom py-6">

        {/* Before search */}
        {!searched && !loading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-24 text-center">
            <div className="text-6xl mb-4">🏨</div>
            <h2 className="text-2xl font-black text-[#141414]">Tìm phòng phù hợp với bạn</h2>
            <p className="mt-2 text-[#888]">Vui lòng nhập điều kiện tìm kiếm để xem danh sách phòng.</p>
          </motion.div>
        )}

        {loading && (
          <div className="flex py-20 justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
            <p className="text-red-600 font-bold">{error}</p>
            <button onClick={() => handleSearch(1)}
              className="mt-4 rounded-xl bg-[#d4af37] px-6 py-2 font-bold text-black hover:brightness-110 transition-all">
              Thử lại
            </button>
          </div>
        )}

        {searched && !loading && !error && (
          <>
            {rooms.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-black/10 bg-white p-16 text-center">
                <p className="text-xl font-bold text-[#555]">Rất tiếc, không có phòng trống.</p>
                <p className="mt-2 text-sm text-[#888]">Thử điều chỉnh bộ lọc hoặc chọn ngày khác.</p>
              </div>
            ) : (
              <AnimatePresence mode='wait'>
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  {rooms.map(room => (
                    <RoomCard key={room.id} room={room}
                      checkIn={checkIn} checkOut={checkOut} guests={guests}
                      connectedRoomLookup={roomLookup} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-black/8 bg-white text-sm font-bold text-[#333] transition-all hover:bg-black hover:text-white disabled:opacity-20"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl text-sm font-black transition-all ${
                      page === p
                        ? 'bg-[#d4af37] text-black shadow-md'
                        : 'bg-white border border-black/8 text-[#333] hover:border-black/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-black/8 bg-white text-sm font-bold text-[#333] transition-all hover:bg-black hover:text-white disabled:opacity-20"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
