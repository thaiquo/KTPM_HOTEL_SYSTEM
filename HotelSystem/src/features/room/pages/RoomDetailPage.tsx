import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { roomApi } from '../../../services/api';
import { Wifi, Tv, Wind, Users, ArrowLeft, ShoppingCart, Check, Plus, Calendar } from 'lucide-react';
import Spinner from '../../../shared/components/ui/Spinner';
import { useCart } from '../../../contexts/CartContext';

export default function RoomDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToCart, checkIn: cartCheckIn, checkOut: cartCheckOut, setDates } = useCart();
  const [roomType, setRoomType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState(cartCheckIn || '');
  const [checkOut, setCheckOut] = useState(cartCheckOut || '');
  const [isSearched, setIsSearched] = useState(false);

  // Available beds from DB: { type, label, count (số phòng còn trống) }
  const [availableBeds, setAvailableBeds] = useState<{ type: string; label: string; count: number }[]>([]);

  // Selection state: Map<bedType, selectedCount>
  const [bedCounts, setBedCounts] = useState<Map<string, number>>(new Map());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const load = async () => {
      if (!id) { setRoomType(null); setLoading(false); return; }
      setLoading(true);
      try {
        const typesData = await roomApi.getRoomTypes();
        const found = typesData.find((t: any) => String(t.id) === id);
        setRoomType(found || null);
        setSelectedImageIndex(0);
      } catch (err) {
        console.error('Error fetching room type:', err);
        setRoomType(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      showToast('⚠️ Vui lòng chọn ngày nhận và trả phòng');
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      showToast('⚠️ Ngày trả phòng phải sau ngày nhận phòng');
      return;
    }
    
    setSearching(true);
    try {
      const availableRooms = await roomApi.getAvailableRooms(id!, checkIn, checkOut);
      
      const bedMap = new Map<string, number>();
      availableRooms.forEach((room: any) => {
        const bt = room.bedType || 'Chưa cấu hình';
        bedMap.set(bt, (bedMap.get(bt) || 0) + 1);
      });

      const bedsArray = Array.from(bedMap.entries()).map(([type, count]) => {
        let label = type
          .replace(/DOUBLE/g, 'giường đôi')
          .replace(/SINGLE/g, 'giường đơn')
          .replace(/KING/g, 'giường King')
          .replace(/QUEEN/g, 'giường Queen')
          .replace(/EXTRA/g, 'giường phụ')
          .replace(/SOFA/g, 'sofa bed')
          .replace(/BUNK/g, 'giường tầng')
          .replace(/TWIN/g, 'giường đơn');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return { type, label, count };
      });

      setAvailableBeds(bedsArray);
      // Init all counts to 0
      const initMap = new Map<string, number>();
      bedsArray.forEach(b => initMap.set(b.type, 0));
      setBedCounts(initMap);
      setIsSearched(true);
    } catch (err) {
      console.error('Lỗi khi tìm phòng trống', err);
      showToast('❌ Có lỗi xảy ra khi tìm phòng');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f7f7]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!roomType) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] py-16 text-[#141414]">
        <div className="container-custom mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-black">Không tìm thấy phòng</h1>
          <Link to="/rooms" className="mt-6 inline-flex rounded-xl bg-[#0f0f0f] px-6 py-3 font-bold text-white">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const images = roomType.images?.map((img: any) => img.imageUrl) || ['https://images.unsplash.com/photo-1566073771259-6a8506099945'];
  const selectedImage = images[selectedImageIndex] || images[0];

  // Helpers
  const getCount = (type: string) => bedCounts.get(type) ?? 0;
  const setCount = (type: string, val: number) => {
    setBedCounts(prev => new Map(prev).set(type, val));
  };

  // Các lựa chọn đang có count > 0
  const selectedItems = availableBeds.filter(b => getCount(b.type) > 0);
  const totalRoomsSelected = selectedItems.reduce((s, b) => s + getCount(b.type), 0);
  const totalPrice = selectedItems.reduce((s, b) => s + getCount(b.type) * roomType.basePrice, 0);
  const hasSelection = totalRoomsSelected > 0;

  const handleAddToCart = () => {
    setDates(checkIn, checkOut);
    selectedItems.forEach(bed => {
      addToCart(roomType, bed.type, getCount(bed.type), bed.count);
    });
    showToast(`✅ Đã thêm ${totalRoomsSelected} phòng ${roomType.type} vào giỏ!`);
  };

  const handleBookNow = () => {
    setDates(checkIn, checkOut);
    selectedItems.forEach(bed => {
      addToCart(roomType, bed.type, getCount(bed.type), bed.count);
    });
    navigate('/booking/cart');
  };

  return (
    <div className="relative min-h-screen bg-[#f7f7f7] py-16 text-[#141414]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed left-1/2 top-24 z-[999] -translate-x-1/2 rounded-2xl bg-[#0f0f0f] px-6 py-4 text-sm font-bold text-[#d4af37] shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container-custom mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Link to="/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-[#5a5a5a] transition-colors hover:text-black">
            <ArrowLeft size={16} />
            Quay lại danh sách phòng
          </Link>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
              <div className="p-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Room detail</div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <h1 className="text-3xl font-black tracking-tight text-[#111] md:text-4xl uppercase">
                    {roomType.type} ROOM
                  </h1>
                  <div className="shrink-0 rounded-none bg-[#0f0f0f] px-5 py-2.5 font-black text-[#d4af37] shadow-lg">
                    Từ {roomType.basePrice.toLocaleString('vi-VN')}đ <span className="text-xs font-normal text-white/70">/ đêm</span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="relative overflow-hidden rounded-xl bg-gray-100">
                    <motion.img
                      key={selectedImageIndex}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      src={selectedImage}
                      alt={roomType.type}
                      className="h-[500px] w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide">
                    {images.map((src: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative h-24 w-32 shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${
                          idx === selectedImageIndex ? 'ring-2 ring-[#d4af37] ring-offset-2 scale-105' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={src} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-black text-[#111]">Mô tả phòng</h3>
                  <p className="mt-3 leading-relaxed text-[#5a5a5a]">{roomType.description}</p>
                </div>

                <div className="mt-8 flex flex-wrap gap-4 border-t border-black/5 pt-6 text-sm font-bold text-[#5a5a5a]">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3">
                    <Users size={18} className="text-[#d4af37]" />
                    <span>{roomType.defaultCapacity} - {roomType.maxCapacity} khách</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3">
                    <Wifi size={18} className="text-[#d4af37]" />
                    <span>Free WiFi</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3">
                    <Tv size={18} className="text-[#d4af37]" />
                    <span>Smart TV</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3">
                    <Wind size={18} className="text-[#d4af37]" />
                    <span>Điều hòa</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Booking Config Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-black text-[#111] mb-5">Kiểm tra phòng trống</h2>
              
              <div className="space-y-4 mb-6 pb-6 border-b border-black/10">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#555] mb-2">
                    Nhận phòng
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={checkIn}
                      onChange={e => {
                        setCheckIn(e.target.value);
                        setIsSearched(false);
                      }}
                      className="w-full rounded-xl border border-black/10 bg-[#f9f9f9] py-3 pl-10 pr-4 text-sm font-bold text-[#141414] focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#555] mb-2">
                    Trả phòng
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
                    <input
                      type="date"
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      value={checkOut}
                      onChange={e => {
                        setCheckOut(e.target.value);
                        setIsSearched(false);
                      }}
                      className="w-full rounded-xl border border-black/10 bg-[#f9f9f9] py-3 pl-10 pr-4 text-sm font-bold text-[#141414] focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleSearch}
                  disabled={searching || !checkIn || !checkOut}
                  className="w-full rounded-xl bg-[#d4af37] py-3 font-bold text-white shadow-md transition-all hover:bg-[#b5952f] disabled:opacity-50"
                >
                  {searching ? 'Đang tìm...' : 'Tìm phòng trống'}
                </button>
              </div>

              {/* Per-bed-type counters */}
              {!isSearched ? (
                <div className="text-sm text-center text-[#888] py-4">
                  Vui lòng chọn ngày và bấm "Tìm phòng trống"
                </div>
              ) : availableBeds.length === 0 ? (
                <div className="text-sm text-red-500 font-bold p-3 bg-red-50 rounded-xl mb-5 text-center">
                  Rất tiếc, đã hết phòng trống trong giai đoạn này.
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  <label className="block text-sm font-bold text-[#141414] mb-2">🛏️ Chọn loại giường:</label>
                  {availableBeds.map(bed => {
                    const cnt = getCount(bed.type);
                    const isSelected = cnt > 0;
                    return (
                      <div
                        key={bed.type}
                        className={`rounded-xl border p-3 transition-all ${
                          isSelected
                            ? 'border-[#d4af37] bg-[#fffbf0]'
                            : 'border-black/10 bg-[#f9f9f9]'
                        }`}
                      >
                        {/* Row top: label + còn X */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#141414]' : 'text-[#555]'}`}>
                            {bed.label}
                          </span>
                          <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">
                            còn {bed.count}
                          </span>
                        </div>
                        {/* Row bottom: counter */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCount(bed.type, Math.max(0, cnt - 1))}
                            disabled={cnt <= 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-lg font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            -
                          </button>
                          <span className={`w-6 text-center font-black text-base ${isSelected ? 'text-[#d4af37]' : 'text-[#aaa]'}`}>
                            {cnt}
                          </span>
                          <button
                            onClick={() => setCount(bed.type, Math.min(bed.count, cnt + 1))}
                            disabled={cnt >= bed.count}
                            title={cnt >= bed.count ? `Đã đạt tối đa ${bed.count} phòng` : ''}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-lg font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            +
                          </button>
                          {isSelected && (
                            <span className="ml-auto text-xs text-[#888]">
                              {cnt} / {bed.count} phòng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary: total rooms & price */}
              {hasSelection && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-xl bg-[#0f0f0f]/5 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-[#555]">Tổng số phòng:</span>
                    <span className="font-black text-[#141414]">{totalRoomsSelected} phòng</span>
                  </div>
                  {selectedItems.map(bed => (
                    <div key={bed.type} className="flex items-center justify-between text-xs text-[#888]">
                      <span>{bed.label} × {getCount(bed.type)}</span>
                      <span>{(getCount(bed.type) * roomType.basePrice).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-black/10 pt-2 mt-1">
                    <span className="font-bold text-[#141414]">💰 Tạm tính:</span>
                    <span className="text-lg font-black text-[#d4af37]">
                      {totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </motion.div>
              )}

              <p className="mb-4 text-center text-xs text-[#888]">
                📅 Ngày nhận/trả phòng sẽ được lưu vào giỏ hàng
              </p>

              <div className="space-y-3">
                <button
                  disabled={!hasSelection}
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f0f0f] py-4 font-bold text-[#d4af37] transition-all hover:bg-[#d4af37] hover:text-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} />
                  Thêm vào giỏ hàng
                </button>

                <button
                  disabled={!hasSelection}
                  onClick={handleBookNow}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#d4af37] bg-[#d4af37]/10 py-4 font-bold text-[#141414] transition-all hover:bg-[#d4af37] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={18} />
                  Đặt ngay
                </button>

                <button
                  onClick={() => navigate('/rooms')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#141414]/20 bg-transparent py-3 text-sm font-semibold text-[#555] transition-all hover:bg-[#141414] hover:text-white"
                >
                  <Plus size={16} />
                  Thêm loại phòng khác
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
