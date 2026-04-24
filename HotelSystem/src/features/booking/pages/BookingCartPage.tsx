import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../../contexts/CartContext';
import { ShoppingCart, Trash2, Plus, ArrowLeft, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

function bedTypeLabel(type: string): string {
  return type
    .replace(/DOUBLE/g, 'giường đôi')
    .replace(/SINGLE/g, 'giường đơn')
    .replace(/KING/g, 'giường King')
    .replace(/QUEEN/g, 'giường Queen')
    .replace(/EXTRA/g, 'giường phụ')
    .replace(/SOFA/g, 'sofa bed')
    .replace(/BUNK/g, 'giường tầng')
    .replace(/TWIN/g, 'giường đơn');
}

export default function BookingCartPage() {
  const navigate = useNavigate();
  const { cartItems, checkIn: cartCheckIn, checkOut: cartCheckOut, setDates, removeFromCart, updateQuantity, clearCart } = useCart();
  const [checkIn, setCheckIn] = useState(cartCheckIn || '');
  const [checkOut, setCheckOut] = useState(cartCheckOut || '');
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  })();

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + item.roomType.basePrice * item.count;
  }, 0);

  const total = subtotal * Math.max(nights, 1);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      setError('Giỏ hàng đang trống. Vui lòng chọn phòng trước!');
      return;
    }
    if (!checkIn || !checkOut) {
      setError('Vui lòng nhập đầy đủ ngày nhận và trả phòng!');
      return;
    }
    if (checkIn >= checkOut) {
      setError('Ngày trả phòng phải sau ngày nhận phòng!');
      return;
    }
    setError('');
    // Navigate to checkout with dates
    navigate(`/booking?checkIn=${checkIn}&checkOut=${checkOut}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-16 text-[#141414]">
      <div className="container-custom mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Link to="/rooms" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#5a5a5a] hover:text-black">
              <ArrowLeft size={15} /> Tiếp tục chọn phòng
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-[#111]">
              <ShoppingCart className="mr-2 inline-block text-[#d4af37]" size={28} />
              Giỏ Hàng Đặt Phòng
            </h1>
            <p className="mt-1 text-sm text-[#888]">
              {cartItems.length === 0 ? 'Chưa có phòng nào được chọn' : `${cartItems.reduce((s, i) => s + i.count, 0)} phòng đã chọn`}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-100"
            >
              <Trash2 size={14} /> Xóa tất cả
            </button>
          )}
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-white py-20 text-center"
                >
                  <ShoppingCart size={52} className="mb-4 text-[#ccc]" />
                  <h2 className="text-xl font-black text-[#aaa]">Giỏ hàng trống</h2>
                  <p className="mt-2 text-sm text-[#bbb]">Hãy chọn phòng bạn yêu thích!</p>
                  <Link
                    to="/rooms"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f0f0f] px-6 py-3 font-bold text-[#d4af37]"
                  >
                    <Plus size={16} /> Xem các phòng
                  </Link>
                </motion.div>
              ) : (
                cartItems.map((item, idx) => {
                  const thumbnail = item.roomType.images?.find((img: any) => img.isThumbnail)?.imageUrl
                    || item.roomType.images?.[0]?.imageUrl
                    || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                        <img
                          src={thumbnail}
                          alt={item.roomType.type}
                          className="h-24 w-32 shrink-0 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]">Hạng phòng</div>
                          <div className="text-lg font-black uppercase text-[#111]">{item.roomType.type} ROOM</div>
                          <div className="mt-1 text-sm text-[#666]">
                            🛏️ {bedTypeLabel(item.bedType)}
                          </div>
                          <div className="mt-1 text-sm font-bold text-[#888]">
                            {item.roomType.basePrice.toLocaleString('vi-VN')}đ / đêm / phòng
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          {/* Qty control */}
                          <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f7] p-1">
                            <button
                              onClick={() => {
                                if (item.count <= 1) removeFromCart(item.id);
                                else updateQuantity(item.id, item.count - 1);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm hover:bg-gray-50"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black">{item.count}</span>
                            <button
                              onClick={() => updateQuantity(item.id, Math.min(item.maxCount, item.count + 1))}
                              disabled={item.count >= item.maxCount}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          {/* Remaining indicator */}
                          <div className="text-[10px] text-center text-[#aaa] mt-0.5">
                            {item.count >= item.maxCount
                              ? <span className="text-orange-400 font-bold">Hết phòng</span>
                              : <span>còn {item.maxCount - item.count} phòng</span>}
                          </div>

                          {/* Subtotal */}
                          <div className="min-w-[90px] text-right">
                            <div className="text-[11px] text-[#aaa]">Tạm tính</div>
                            <div className="font-black text-[#d4af37]">
                              {(item.roomType.basePrice * item.count).toLocaleString('vi-VN')}đ
                            </div>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="rounded-full p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {cartItems.length > 0 && (
              <Link
                to="/rooms"
                className="mt-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 bg-white py-4 text-sm font-bold text-[#888] transition-all hover:border-[#d4af37]/40 hover:text-[#d4af37]"
              >
                <Plus size={16} /> Thêm loại phòng khác (khách đoàn)
              </Link>
            )}
          </div>

          {/* Right: Booking Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
              <h2 className="mb-5 text-xl font-black text-[#111]">Tóm tắt đặt phòng</h2>

              {/* Shared Dates - KEY UX IMPROVEMENT for group bookings */}
              <div className="mb-5 rounded-xl bg-[#fffbf0] border border-[#d4af37]/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#d4af37]">
                  <Calendar size={16} /> Ngày lưu trú (áp dụng cho tất cả phòng)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-[#888]">Nhận phòng</label>
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCheckIn(val);
                        let newOut = checkOut;
                        if (checkOut && val >= checkOut) {
                          newOut = '';
                          setCheckOut('');
                        }
                        setDates(val, newOut);
                        setError('');
                      }}
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#888]">Trả phòng</label>
                    <input
                      type="date"
                      min={checkIn || today}
                      value={checkOut}
                      onChange={(e) => { 
                        const val = e.target.value;
                        setCheckOut(val);
                        setDates(checkIn, val);
                        setError(''); 
                      }}
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                {nights > 0 && (
                  <div className="mt-3 text-center text-sm font-bold text-green-600">
                    ✅ {nights} đêm lưu trú
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mb-4 space-y-2 border-b border-black/5 pb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-[#555]">
                    <span className="truncate max-w-[55%]">{item.roomType.type} × {item.count}</span>
                    <span className="font-bold">{(item.roomType.basePrice * item.count).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
                {nights > 1 && (
                  <div className="flex items-center justify-between text-sm text-[#888]">
                    <span>× {nights} đêm</span>
                    <span className="font-bold text-[#d4af37]">{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
              </div>

              <div className="mb-6 flex items-center justify-between">
                <span className="font-black text-[#111]">Tổng cộng</span>
                <span className="text-2xl font-black text-[#d4af37]">
                  {total.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f0f0f] py-4 font-black text-[#d4af37] shadow-lg transition-all hover:bg-[#d4af37] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle size={18} />
                Tiến hành đặt phòng
                <ArrowRight size={18} />
              </button>

              <p className="mt-3 text-center text-[11px] text-[#aaa]">
                Thanh toán an toàn · Hủy miễn phí trong 24h
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
