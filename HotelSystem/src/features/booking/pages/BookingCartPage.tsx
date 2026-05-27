import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../../contexts/CartContext';
import { ShoppingCart, Trash2, Plus, ArrowLeft, Calendar, ArrowRight, CheckCircle, Info } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────
const VIEW_BONUS: Record<string, number> = {
  'River View': 150000, 'Pool View': 150000,
  'Garden View': 50000, 'City View': 0,
};

function calculateNightlyPrice(room: import('../../../types').Room, date: string): number {
  const base = room.roomType?.basePrice ?? 0;
  const viewBonus = VIEW_BONUS[room.viewType] ?? 0;
  const bathtubBonus = room.hasBathtub ? 50000 : 0;
  const adjustedBase = base + viewBonus + bathtubBonus;

  const d = new Date(date);
  const day = d.getDay();
  return (day === 0 || day === 6) ? adjustedBase * 1.2 : adjustedBase;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr < end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default function BookingCartPage() {
  const navigate = useNavigate();
  const { cartItems, checkIn: cartIn, checkOut: cartOut, setDates, removeFromCart, clearCart } = useCart();
  
  const [checkIn, setCheckIn] = useState(cartIn || '');
  const [checkOut, setCheckOut] = useState(cartOut || '');
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const pricing = useMemo(() => {
    if (!checkIn || !checkOut || cartItems.length === 0) return null;
    const dateList = getDatesInRange(checkIn, checkOut);
    
    const items = cartItems.map(item => {
      const nightlyPrices = dateList.map(date => calculateNightlyPrice(item.room, date));
      const total = nightlyPrices.reduce((a, b) => a + b, 0);
      return { ...item, total, nightlyPrices };
    });

    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    return { items, grandTotal, nights: dateList.length };
  }, [cartItems, checkIn, checkOut]);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      setError('Giỏ hàng trống!');
      return;
    }
    if (!checkIn || !checkOut) {
      setError('Vui lòng chọn ngày nhận/trả phòng!');
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      setError('Ngày trả phòng phải sau ngày nhận!');
      return;
    }

    setDates(checkIn, checkOut);
    // Proceed to Booking Info (Checkout Form for primary guest)
    navigate('/booking');
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-16 text-[#141414]">
      <div className="container-custom mx-auto max-w-5xl px-4">
        
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <Link to="/rooms" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#888] hover:text-[#111] mb-2">
              <ArrowLeft size={14} /> Tiếp tục chọn phòng
            </Link>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              Giỏ Hàng <ShoppingCart className="text-[#d4af37]" />
            </h1>
          </div>
          {cartItems.length > 0 && (
            <button onClick={clearCart} className="text-xs font-black uppercase text-red-500 flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
              <Trash2 size={14} /> Xóa toàn bộ
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {cartItems.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-black/5">
                   <div className="text-6xl mb-6">🏜️</div>
                   <h2 className="text-2xl font-black text-[#ccc]">Giỏ hàng đang trống</h2>
                   <Link to="/rooms" className="mt-8 inline-block bg-[#0f0f0f] text-[#d4af37] px-8 py-4 rounded-2xl font-black shadow-xl">KHÁM PHÁ PHÒNG</Link>
                </motion.div>
              ) : (
                cartItems.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="bg-white rounded-3xl p-6 shadow-xl border border-black/5 flex flex-col md:flex-row gap-6 relative group"
                  >
                    <div className="w-full md:w-40 aspect-square rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={item.room.roomType.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#d4af37]">Phòng số {item.room.roomNumber}</span>
                          <h3 className="text-xl font-black text-[#111] uppercase">{item.room.roomType.type} ROOM</h3>
                          <div className="flex gap-2 mt-2">
                             {item.room.beds.map((b, i) => (
                               <span key={i} className="text-[11px] font-bold bg-[#f4f4f4] px-2 py-1 rounded-lg">
                                 {b.quantity} × {b.type}
                               </span>
                             ))}
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 bg-red-50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-6 flex justify-between items-end">
                        <div className="text-xs font-bold text-[#888] uppercase tracking-widest">Giá cơ bản: {item.room.roomType.basePrice.toLocaleString('vi-VN')}đ</div>
                        <div className="text-right">
                           <div className="text-[10px] font-black text-[#aaa] uppercase mb-1">Thành tiền cho phòng này</div>
                           <div className="text-lg font-black text-[#0f0f0f]">
                             {pricing ? pricing.items.find(pi => pi.id === item.id)?.total.toLocaleString('vi-VN') : '---'}đ
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {cartItems.length > 0 && (
              <Link to="/rooms" className="block p-8 border-2 border-dashed border-black/10 rounded-3xl text-center text-sm font-black text-[#aaa] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all">
                + THÊM PHÒNG KHÁC VÀO GIỎ
              </Link>
            )}
          </div>

          {/* Checkout Panel */}
          <div className="lg:col-span-1">
             <div className="sticky top-24 bg-[#0f0f0f] rounded-[2.5rem] p-8 text-white shadow-2xl">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  TỔNG KẾT <span className="p-2 bg-[#d4af37] rounded-full text-black"><CheckCircle size={18} /></span>
                </h2>

                <div className="space-y-6 mb-10">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 block">Ngày nhận phòng</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]" size={16} />
                        <input type="date" min={today} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (checkOut <= e.target.value) setCheckOut(''); }}
                          className="w-full bg-white/10 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 block">Ngày trả phòng</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]" size={16} />
                        <input type="date" min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)}
                          className="w-full bg-white/10 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[#d4af37] outline-none" />
                      </div>
                    </div>
                  </div>

                  {pricing && (
                    <div className="pt-6 border-t border-white/10 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-white/50">
                        <span>Lưu trú:</span>
                        <span>{pricing.nights} đêm</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-white/50">
                        <span>Số lượng phòng:</span>
                        <span>{cartItems.length} phòng</span>
                      </div>
                      <div className="bg-[#d4af37]/10 p-3 rounded-xl border border-[#d4af37]/20 flex items-center gap-3">
                         <Info size={14} className="text-[#d4af37]" />
                         <span className="text-[10px] font-bold text-[#d4af37] uppercase">Giá đã bao gồm phụ phí cuối tuần (nếu có)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-10 text-right">
                   <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">Tổng số tiền cần trả</div>
                   <div className="text-4xl font-black text-[#d4af37]">{pricing?.grandTotal.toLocaleString('vi-VN') || '0'}đ</div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-500/20 text-red-300 text-xs font-bold rounded-2xl border border-red-500/30">⚠️ {error}</div>}

                <button onClick={handleCheckout} disabled={cartItems.length === 0}
                  className="w-full bg-[#d4af37] text-black py-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-[0_10px_40px_-10px_rgba(212,175,55,0.4)] hover:bg-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  ĐẶT PHÒNG NGAY <ArrowRight size={20} />
                </button>
                <p className="mt-6 text-center text-[10px] font-bold text-white/30 uppercase tracking-widest">An toàn · Bảo mật · Xác nhận tức thì</p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
