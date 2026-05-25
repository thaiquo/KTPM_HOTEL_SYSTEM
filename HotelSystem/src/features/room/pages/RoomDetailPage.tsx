import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { roomApi } from '../../../services/roomApi';
import type { Room } from '../../../types';
import Spinner from '../../../shared/components/ui/Spinner';
import { useCart } from '../../../contexts/CartContext';
import { calculateStayPricing, CHECK_IN_TIME_LABEL, CHECK_OUT_TIME_LABEL } from '../../../shared/lib/bookingPricing';
import {
  ArrowLeft, ShoppingCart, Check, Calendar,
  MapPin, ShieldCheck, Info, Sparkles, ChevronLeft, ChevronRight,
  Star, Eye
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────
const AMENITY_ICONS: Record<string, string> = {
  HIGH_SPEED_WIFI: '📶', SMART_TV: '📺', MINIBAR: '🍸', SAFE: '🔒',
  BATHTUB: '🛁', RAIN_SHOWER: '🚿', COFFEE_MACHINE: '☕',
  PRIVATE_BALCONY: '🌿', LOUNGE_ACCESS: '🏢', WORK_DESK: '💼',
  BLUETOOTH_SPEAKER: '🔊', PREMIUM_BEDDING: '🛏️', WELCOME_FRUIT: '🍎',
  KITCHENETTE: '🍳', MICROWAVE: '📦', KETTLE: '🫖', BIDET: '🚽',
  DUAL_SINK: '🪣', JACUZZI: '♨️', SOFA_SEATING: '🛋️', USB_CHARGING: '🔌',
  SMART_CONTROL: '📱', BLACKOUT_CURTAIN: '🌑', TURNDOWN_SERVICE: '🌙',
  TOILETRIES: '🧴',
};

const CATEGORY_LABEL: Record<string, string> = {
  BEDROOM: '🛏️ Phòng ngủ',
  BATHROOM: '🚿 Phòng tắm',
  TECHNOLOGY: '💻 Công nghệ',
  KITCHEN: '☕ Bếp / Ăn uống',
  SPECIAL: '✨ Đặc biệt',
};

const BED_ICONS: Record<string, string> = {
  'King Bed': '👑', 'Queen Bed': '👸', 'Double Bed': '👥',
  'Twin Bed': '👯', 'Sofa Bed': '🛋️', 'Bunk Bed': '🏕️',
};

const VIEW_ICONS: Record<string, string> = {
  'City View': '🌆', 'River View': '🌊', 'Pool View': '🏊',
  'Garden View': '🌳', 'No View': '🏠',
};

const VIEW_BONUS: Record<string, number> = {
  'River View': 150000, 'Pool View': 150000,
  'Garden View': 50000, 'City View': 0, 'No View': 0,
};

function getConnectedRoomLabel(room: Room, roomLookup: Record<string, string>) {
  if (!room.isConnecting) return null;
  if (!room.connectedRoomId) return 'Connecting';
  const connectedRoomNumber = roomLookup[String(room.connectedRoomId)];
  return connectedRoomNumber
    ? `Connecting với Phòng ${connectedRoomNumber}`
    : 'Connecting với phòng liên thông';
}

// ─── Image Gallery ────────────────────────────────────────
function ImageGallery({ images }: { images: { imageUrl: string; isThumbnail: boolean }[] }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-video bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-bold">
        Không có ảnh
      </div>
    );
  }
  const prev = () => setIdx(i => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx(i => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx].imageUrl}
            alt={`Ảnh phòng ${idx + 1}`}
            className="h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-all"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                i === idx ? 'border-[#d4af37] opacity-100' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function RoomDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, setDates, checkIn: cartIn, checkOut: cartOut } = useCart();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [roomLookup, setRoomLookup] = useState<Record<string, string>>({});

  const checkIn = searchParams.get('checkIn') || cartIn || '';
  const checkOut = searchParams.get('checkOut') || cartOut || '';

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Amenities are grouped once so the rendered sections stay stable across re-renders.
  const amenityGroups = useMemo(() => {
    const active = (room?.amenities ?? []).filter((amenity) => amenity.isActive);
    const groups: Record<string, typeof active> = {};

    active.forEach((roomAmenity) => {
      const category = roomAmenity?.amenity?.category ?? 'OTHER';
      if (!groups[category]) groups[category] = [];
      groups[category].push(roomAmenity);
    });

    return groups;
  }, [room]);

  useEffect(() => {
    if (!id) return;
    roomApi.getById(id)
      .then(data => { setRoom(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [id]);

  useEffect(() => {
    roomApi.getAll()
      .then((rooms) => {
        setRoomLookup(Object.fromEntries(rooms.map((item) => [item.id, item.roomNumber])));
      })
      .catch(console.error);
  }, []);

  const pricing = useMemo(() => {
    if (!room || !checkIn || !checkOut) return null;
    return calculateStayPricing([room], checkIn, checkOut);
  }, [room, checkIn, checkOut]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  );

  if (!room) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8f8f8]">
      <p className="text-xl font-bold text-[#333]">Không tìm thấy phòng</p>
      <Link to="/rooms" className="rounded-xl bg-[#0f0f0f] px-6 py-3 font-bold text-[#d4af37]">Quay lại</Link>
    </div>
  );

  const handleAddToCart = () => {
    if (checkIn && checkOut) setDates(checkIn, checkOut);
    addToCart(room);
    showToast('✅ Đã thêm phòng vào giỏ hàng!');
  };

  const handleBookNow = () => {
    if (checkIn && checkOut) setDates(checkIn, checkOut);
    addToCart(room);
    navigate('/booking/cart');
  };

  const images = room.roomType?.images ?? [];
  const roomTypeBedConfigs = room.roomType?.bedConfigs ?? [];
  const effectiveBeds = room.beds.length > 0
    ? room.beds
    : roomTypeBedConfigs
        .filter(config => config.isPrimary)
        .map(config => ({
          type: config.bedType.name,
          quantity: config.quantity,
        }));
  const viewBonus = VIEW_BONUS[room.viewType] ?? 0;
  const bathtubBonus = room.hasBathtub ? 50000 : 0;
  const nightlyBase = (room.roomType?.basePrice ?? 0) + viewBonus + bathtubBonus;
  const connectedRoomLabel = getConnectedRoomLabel(room, roomLookup);

  const isPremiumView = ['River View', 'Pool View'].includes(room.viewType);

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#141414] pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed left-1/2 top-20 z-999 -translate-x-1/2 rounded-2xl bg-[#0f0f0f] px-6 py-3 text-sm font-bold text-[#d4af37] shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container-custom py-8 max-w-6xl">
        <Link to="/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-[#666] hover:text-[#111] mb-6">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ═══ LEFT: Main Content ══════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Card 1: Gallery + Header */}
            <div className="rounded-3xl bg-white shadow-xl overflow-hidden border border-black/5">

              {/* Gallery */}
              <div className="p-6 pb-4">
                <ImageGallery images={images} />
              </div>

              {/* Header Info */}
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-[#0f0f0f] text-[#d4af37] text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                    {room.roomType?.type}
                  </span>
                  {isPremiumView && (
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                      <Star size={10} fill="white" /> Premium View
                    </span>
                  )}
                  {room.isAccessible && (
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                      ♿ Accessible
                    </span>
                  )}
                  {room.isConnecting && (
                    <span className="bg-violet-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                      🔗 Connecting
                    </span>
                  )}
                  {connectedRoomLabel && (
                    <span className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                      {connectedRoomLabel}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-[#111] uppercase tracking-tight">
                      PHÒNG {room.roomNumber}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#888] font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> Tầng {room.floorNumber} ({room.floorLevel})
                      </span>
                      <span>•</span>
                      <span>{room.areaM2}m²</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye size={13} />
                        {VIEW_ICONS[room.viewType] || '🪟'} {room.viewType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#aaa] uppercase tracking-widest">Từ</div>
                    <div className="text-2xl font-black text-[#0f0f0f]">
                      {nightlyBase.toLocaleString('vi-VN')}đ
                      <span className="text-xs text-[#888]">/đêm</span>
                    </div>
                    <div className="mt-2 text-[11px] font-bold text-indigo-600">
                      Cuối tuần (T7, CN) tăng 20% trên giá đêm này.
                    </div>
                  </div>
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    room.hasBalcony && { label: '🌿 Ban công riêng', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    room.hasBathtub && { label: '🛁 Bồn tắm', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                    room.smokingPolicy === 'NON_SMOKING' && { label: '🚭 Non-smoking', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                    room.smokingPolicy === 'SMOKING' && { label: '🚬 Smoking', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                    connectedRoomLabel && { label: `🔗 ${connectedRoomLabel}`, color: 'bg-violet-50 text-violet-700 border-violet-200' },
                    viewBonus > 0 && { label: `+${viewBonus.toLocaleString('vi-VN')}đ view`, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    bathtubBonus > 0 && { label: '+50,000đ bathtub', color: 'bg-sky-50 text-sky-600 border-sky-200' },
                  ].filter((badge): badge is { label: string; color: string } => Boolean(badge)).map((badge, i) => (
                    <span key={i} className={`text-[11px] font-bold px-3 py-1 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Bed Configuration */}
            <div className="rounded-3xl bg-white shadow-sm p-6 border border-black/5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#aaa] mb-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#d4af37]" /> Cấu hình giường
              </h3>
              {effectiveBeds.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {effectiveBeds.map((bed, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-[#f9f9f9] border border-black/5">
                      <span className="text-2xl">{BED_ICONS[bed.type] || '🛏️'}</span>
                      <div>
                        <div className="text-sm font-black text-[#333]">{bed.quantity} × {bed.type}</div>
                        <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider">Sẵn sàng phục vụ</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 text-xs font-bold ring-1 ring-amber-200">
                  Cấu hình giường theo loại phòng {room.roomType?.type} (mặc định từ loại phòng).
                </div>
              )}

              {roomTypeBedConfigs.length > 1 && (
                <div className="mt-4 rounded-2xl border border-black/5 bg-[#fafafa] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-3">
                    Cấu hình theo loại phòng
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roomTypeBedConfigs.map((config) => (
                      <div key={config.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-black text-[#333]">
                            {config.quantity} × {config.bedType.name}
                          </div>
                          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider">
                            {config.bedType.code}
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          config.isPrimary
                            ? 'bg-[#0f0f0f] text-[#d4af37]'
                            : 'bg-[#ececec] text-[#666]'
                        }`}>
                          {config.isPrimary ? 'Mặc định' : 'Tùy chọn'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Amenities by category */}
            {Object.keys(amenityGroups).length > 0 && (
              <div className="rounded-3xl bg-white shadow-sm p-6 border border-black/5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#aaa] mb-5 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#d4af37]" /> Tiện nghi phòng
                </h3>
                <div className="space-y-6">
                  {Object.entries(amenityGroups).map(([cat, amenities]) => (
                    <div key={cat}>
                      <div className="text-xs font-black text-[#555] mb-3">
                        {CATEGORY_LABEL[cat] || cat}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {amenities.map(ra => (
                          <div key={ra.id}
                            className="flex items-center gap-2 p-3 rounded-xl border border-black/6 bg-[#fafafa] hover:bg-[#f0f0f0] transition-colors">
                            <span className="text-lg">{AMENITY_ICONS[ra.amenity.code] || '✦'}</span>
                            <span className="text-[11px] font-bold text-[#444] leading-tight">{ra.amenity.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Room Type Description */}
            <div className="rounded-3xl bg-white shadow-sm p-6 border border-black/5">
              <h3 className="text-sm font-black text-[#111] mb-3">Mô tả loại phòng {room.roomType?.type}</h3>
              <p className="text-sm leading-relaxed text-[#666]">{room.roomType?.description}</p>

              {/* Extra room specs */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Tầng', value: `${room.floorNumber} (${room.floorLevel})` },
                  { label: 'Diện tích', value: `${room.areaM2} m²` },
                  { label: 'Sức chứa', value: `${room.maxCapacity} khách` },
                  { label: 'Hướng view', value: room.viewType },
                ].map((spec, i) => (
                  <div key={i} className="bg-[#f9f9f9] rounded-2xl p-3 border border-black/5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#aaa] mb-1">{spec.label}</div>
                    <div className="text-sm font-black text-[#333]">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ═══ RIGHT: Sidebar ══════════════════════════════════ */}
          <div className="space-y-6">

            {/* Pricing Card */}
            <div className="sticky top-24 rounded-3xl bg-white shadow-2xl p-6 border border-black/5">
              <h2 className="text-xl font-black text-[#111] mb-5">Dự toán đặt phòng</h2>

              {!checkIn || !checkOut ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                  <Info size={24} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-xs font-bold text-amber-800">Chọn ngày ở trang tìm kiếm để xem dự toán chính xác nhất.</p>
                  <Link to="/rooms" className="mt-3 inline-block text-xs font-black text-amber-900 underline">Về trang tìm kiếm</Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f9f9f9] p-3 rounded-2xl border border-black/5">
                      <div className="text-[9px] font-black text-[#aaa] uppercase tracking-wider mb-1">Check-in</div>
                      <div className="text-sm font-black text-[#333]">{checkIn}</div>
                    </div>
                    <div className="bg-[#f9f9f9] p-3 rounded-2xl border border-black/5">
                      <div className="text-[9px] font-black text-[#aaa] uppercase tracking-wider mb-1">Check-out</div>
                      <div className="text-sm font-black text-[#333]">{checkOut}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
                    Quy ước lưu trú: nhận phòng từ {CHECK_IN_TIME_LABEL}, trả phòng trước {CHECK_OUT_TIME_LABEL} vào ngày kế tiếp. Nếu kỳ lưu trú chạm cuối tuần, giá đêm tăng 20%; nếu chạm lễ/tết, tổng tiền tăng 30%.
                  </div>

                  {/* Nightly breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-[#aaa] border-b border-black/5 pb-2">
                      <span>Lưu trú ({pricing?.nights} đêm)</span>
                      <span>Thành tiền</span>
                    </div>
                    <div className="max-h-44 overflow-y-auto pr-1 space-y-2">
                      {pricing?.rooms[0]?.nightlyDetails.map((d, i) => {
                        return (
                          <div key={i} className="flex justify-between items-center">
                            <div>
                              <div className="text-xs font-bold text-[#444]">{d.displayDate}</div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {d.isWeekend && <span className="text-[9px] font-black text-indigo-600 uppercase">Weekend +20%</span>}
                                {d.holidayName && <span className="text-[9px] font-black text-rose-600 uppercase">{d.holidayName} +30%</span>}
                              </div>
                            </div>
                            <div className="text-sm font-black text-[#333]">{d.price.toLocaleString('vi-VN')}đ</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price breakdown */}
                  {(viewBonus > 0 || bathtubBonus > 0) && (
                    <div className="bg-[#f9f9f9] rounded-2xl p-3 border border-black/5 text-[11px] space-y-1">
                      <div className="flex justify-between text-[#555]">
                        <span>Giá cơ bản</span>
                        <span>{room.roomType?.basePrice.toLocaleString('vi-VN')}đ</span>
                      </div>
                      {viewBonus > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>🪟 Phụ phí view</span>
                          <span>+{viewBonus.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      {bathtubBonus > 0 && (
                        <div className="flex justify-between text-sky-600">
                          <span>🛁 Phụ phí bồn tắm</span>
                          <span>+{bathtubBonus.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-dashed border-black/10">
                    <div className="flex justify-between items-end">
                      <div className="text-xs font-black text-[#888] uppercase tracking-widest">Tổng cộng dự kiến</div>
                      <div className="text-3xl font-black text-[#d4af37]">{pricing?.finalTotal.toLocaleString('vi-VN')}đ</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2 bg-[#0f0f0f] text-[#d4af37] py-4 rounded-2xl font-black shadow-xl hover:bg-[#d4af37] hover:text-black transition-all active:scale-95"
                >
                  <ShoppingCart size={18} /> THÊM VÀO GIỎ
                </button>
                <button
                  onClick={handleBookNow}
                  className="w-full flex items-center justify-center gap-2 border-2 border-[#0f0f0f] py-4 rounded-2xl font-black hover:bg-[#0f0f0f] hover:text-white transition-all active:scale-95"
                >
                  <Check size={18} /> ĐẶT NGAY
                </button>
              </div>
            </div>

            {/* Price policy info */}
            <div className="rounded-3xl bg-indigo-50 p-5 border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calendar size={14} /> Chính sách giá linh hoạt
              </h4>
              <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                Giá phòng được tối ưu theo thời điểm lưu trú. Ngày cuối tuần (T7, CN) áp dụng phụ phí 20% trên giá đêm đã cộng theo loại phòng, view và tiện ích. Khi kỳ lưu trú chạm lễ/tết, tổng tiền tăng 30%.
                View đặc biệt (River / Pool) +150,000đ / đêm. Bồn tắm +50,000đ / đêm.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
