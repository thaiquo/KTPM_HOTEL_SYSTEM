import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock3, Gem, Lock, Phone, Sparkles, Star, MapPin, Search, ChevronRight,
  Wifi, Dumbbell, Coffee, Car, Shield, Waves, ChevronLeft, Quote
} from 'lucide-react';
import { roomApi } from '../../../services/roomApi';
import type { Room } from '../../../types';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1920&q=80',
];

const AMENITIES = [
  { icon: Wifi, title: 'Wi-Fi Tốc độ cao', desc: 'Miễn phí toàn bộ khuôn viên' },
  { icon: Waves, title: 'Hồ bơi vô cực', desc: 'Tầm nhìn toàn thành phố' },
  { icon: Dumbbell, title: 'Phòng Gym hiện đại', desc: 'Mở cửa 24/7' },
  { icon: Coffee, title: 'Nhà hàng & Bar', desc: 'Ẩm thực Á-Âu thượng hạng' },
  { icon: Sparkles, title: 'Spa & Wellness', desc: 'Thư giãn tuyệt đối' },
  { icon: Car, title: 'Bãi đỗ xe an toàn', desc: 'Hệ thống an ninh thông minh' },
];

const REVIEWS = [
  { name: 'Nguyễn Văn Anh', role: 'Khách công tác', rating: 5, text: 'Trải nghiệm tuyệt vời. Từ thái độ nhân viên đến tiện nghi phòng đều hoàn hảo. Hồ bơi view rất đẹp!' },
  { name: 'Trần Minh Tuấn', role: 'Kỳ nghỉ gia đình', rating: 5, text: 'Không gian yên tĩnh giữa thành phố nhộn nhịp. Phòng thiết kế sang trọng, giường cực kỳ êm ái.' },
  { name: 'Lê Hoàng Yến', role: 'Khách du lịch', rating: 5, text: 'Buffet sáng đa dạng. Gần khu trung tâm nên dễ dàng di chuyển. Chắc chắn sẽ quay lại.' },
];

import { useAuth } from '../../../contexts/AuthContext';
import { getManagementHomeByRole, normalizeRole } from '../../../shared/lib/roleRoute';
import { Navigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// COMPONENT LÕI
// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  
  if (isAuthenticated && user) {
    const role = normalizeRole(user.role);
    if (role === 'STAFF' || role === 'ADMIN') {
      return <Navigate to={getManagementHomeByRole(user.role)} replace />;
    }
  }

  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[#fafafa] text-[#141414] overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-screen min-h-[700px] w-full bg-black">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={heroIdx}
            src={HERO_IMAGES[heroIdx]}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 h-full w-full object-cover"
            alt="TriStar Hotel"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/30 to-black/80" />
        
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-xs font-black uppercase tracking-[0.3em] text-[#d4af37] mb-4 block">
              Trải nghiệm Đẳng cấp
            </span>
            <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl lg:text-8xl text-white font-bold tracking-tight mb-6 mt-2">
              TriStar Hotel
            </h1>
            <p className="max-w-2xl text-lg text-white/80 font-medium tracking-wide mx-auto mb-10">
              Nơi không gian sang trọng giao thoa cùng tiện ích hiện đại, mang lại cho bạn sự riêng tư và thư thái giữa lòng thành phố.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <a href="#quick-search">
                <button className="bg-[#d4af37] text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors duration-300">
                  Đặt phòng ngay
                </button>
               </a>
               <a href="#about">
                <button className="border border-white/30 text-white px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors duration-300 backdrop-blur-sm">
                  Khám phá
                </button>
               </a>
            </div>
          </motion.div>
        </div>

        {/* 2. QUICK SEARCH SECTION (Floating) */}
        <div id="quick-search" className="absolute bottom-0 left-0 right-0 z-20 translate-y-1/2 px-4">
          <div className="container-custom max-w-5xl">
            <QuickSearchBox />
          </div>
        </div>
      </section>

      {/* SPACE CẦN ĐỂ BÙ CHO QUICK SEARCH OUT OF FLOW */}
      <div className="h-28 md:h-20" />

      {/* 4. HOTEL INTRODUCTION */}
      <section id="about" className="py-24 mt-8 md:mt-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            >
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37] mb-3">Về chúng tôi</h2>
              <h3 className="text-4xl md:text-5xl font-extrabold text-[#111] leading-tight mb-6 font-['Playfair_Display']">
                Tuyệt tác nghệ thuật kiến trúc & nghỉ dưỡng
              </h3>
              <p className="text-[#555] text-lg leading-relaxed mb-6">
                Chắt lọc những giá trị thượng lưu nhất, TriStar Hotel tự hào mang đến cho khách lưu trú một thiên đường nghỉ dưỡng đích thực. Từ nội thất được thiết kế riêng, hệ thống nhà hàng trứ danh đến sự tận tâm trong từng dịch vụ.
              </p>
              <div className="flex items-center gap-6 mt-8 border-t border-black/10 pt-8">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#111]">Vị trí đắc địa</h4>
                    <p className="text-sm text-[#777]">Trung tâm thành phố</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] shrink-0">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#111]">Riêng tư tuyệt đối</h4>
                    <p className="text-sm text-[#777]">An ninh 24/7</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <div className="relative">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="rounded-2xl overflow-hidden aspect-[4/5] object-cover">
                 <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800" alt="About" className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
              <div className="absolute -bottom-10 -left-10 bg-white p-8 shadow-2xl rounded-xl hidden md:block">
                 <div className="text-center">
                    <div className="text-5xl font-black text-[#d4af37]">15+</div>
                    <div className="text-sm font-bold uppercase tracking-widest text-[#555] mt-1">Năm kinh nghiệm</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED ROOMS SECTION */}
      <section className="py-24 bg-[#111] text-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/10 pb-8">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37] mb-3">Phòng nổi bật</h2>
              <h3 className="text-4xl md:text-5xl font-extrabold text-white font-['Playfair_Display']">Hơi thở hiện đại</h3>
            </div>
            <Link to="/rooms" className="hidden md:flex items-center gap-2 text-[#d4af37] font-bold uppercase tracking-widest hover:text-white transition-colors duration-300">
              Xem tất cả <ChevronRight size={18} />
            </Link>
          </div>
          
          <FeaturedRooms />
          
          <Link to="/rooms" className="mt-10 flex md:hidden items-center justify-center gap-2 text-[#d4af37] font-bold uppercase tracking-widest hover:text-white transition-colors duration-300">
             Xem tất cả phòng <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* 5. AMENITIES SECTION */}
      <section className="py-24 bg-white">
        <div className="container-custom text-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37] mb-3">Dịch vụ & Tiện ích</h2>
          <h3 className="text-4xl md:text-5xl font-extrabold text-[#111] font-['Playfair_Display'] mb-16">
            Tiện nghi hoàng gia
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
            {AMENITIES.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-6 border border-black/5 hover:border-[#d4af37]/30 hover:bg-[#fafafa] shadow-xs hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col items-center"
              >
                <div className="h-20 w-20 bg-[#f7f7f7] group-hover:bg-[#d4af37] text-[#111] rounded-[24px] rotate-3 group-hover:rotate-0 flex items-center justify-center mb-6 transition-all duration-300">
                  <item.icon size={36} strokeWidth={1.5} />
                </div>
                <h4 className="text-lg font-bold text-[#111] mb-2">{item.title}</h4>
                <p className="text-[#666]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. STATISTICS SECTION */}
      <section className="py-24 bg-[#0a0a0a] border-y border-white/10 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920')] bg-cover bg-fixed bg-center" />
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
            <div>
              <div className="text-4xl md:text-6xl font-black text-[#d4af37] mb-2 font-['Playfair_Display']">10k+</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Khách hàng</div>
            </div>
            <div>
              <div className="text-4xl md:text-6xl font-black text-[#d4af37] mb-2 font-['Playfair_Display']">150+</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Phòng lưu trú</div>
            </div>
            <div>
              <div className="text-4xl md:text-6xl font-black text-[#d4af37] mb-2 font-['Playfair_Display']">4.9</div>
              <div className="flex justify-center text-[#d4af37] mb-1 gap-1"><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /></div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Điểm đánh giá</div>
            </div>
            <div>
              <div className="text-4xl md:text-6xl font-black text-[#d4af37] mb-2 font-['Playfair_Display']">24/7</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Hỗ trợ dịch vụ</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CUSTOMER REVIEWS */}
      <section className="py-24 bg-[#fafafa]">
        <div className="container-custom text-center">
          <Quote size={48} className="text-[#d4af37] mx-auto mb-6 opacity-40" />
          <h3 className="text-3xl md:text-5xl font-extrabold text-[#111] font-['Playfair_Display'] mb-16">
            Khách hàng nói gì về chúng tôi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {REVIEWS.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white p-8 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-black/5 hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
                <div className="flex text-[#d4af37] mb-6 gap-1">
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={j < r.rating ? 'currentColor' : 'none'} />)}
                </div>
                <p className="text-[#444] text-lg leading-relaxed mb-8 italic flex-1">"{r.text}"</p>
                <div className="mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#111]">{r.name}</div>
                    <div className="text-xs text-[#777] font-medium uppercase tracking-wider">{r.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. GALLERY SECTION */}
      <section className="py-2 bg-white flex flex-wrap pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-1">
          {[
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80',
          ].map((img, i) => (
            <div key={i} className="aspect-[4/3] md:aspect-square overflow-hidden group bg-slate-100">
               <img src={img} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Gallery" />
            </div>
          ))}
        </div>
      </section>

      {/* 9. CTA SECTION */}
      <section className="py-32 bg-[#d4af37] text-black text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.05)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.05)_50%,rgba(0,0,0,0.05)_75%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
        <div className="container-custom relative z-10">
          <h2 className="text-4xl md:text-6xl font-black font-['Playfair_Display'] mb-6">Trải nghiệm không gian xa hoa</h2>
          <p className="text-lg md:text-xl font-medium tracking-wide mb-10 max-w-2xl mx-auto opacity-80">
            Hàng ngàn ưu đãi đặc biệt đang chờ đón. Xách vali lên và cùng tận hưởng sự yên bình ngay hôm nay.
          </p>
          <Link to="/rooms">
            <button className="bg-black text-white px-12 py-5 font-bold uppercase tracking-[0.2em] text-sm hover:scale-105 transition-transform duration-300 shadow-2xl">
              Tìm phòng ngay
            </button>
          </Link>
        </div>
      </section>

      {/* Hotline float */}
      <a href="tel:0925519789" className="fixed bottom-8 left-6 z-40 hidden md:block" aria-label="Hotline">
        <div className="flex items-center gap-3 rounded-full bg-[#111] border border-[#333] px-5 py-3 text-sm font-bold text-white shadow-2xl transition-transform hover:-translate-y-1">
          <div className="bg-[#d4af37] text-black p-1.5 rounded-full"><Phone size={16} /></div>
          <span>092 5519 789</span>
        </div>
      </a>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT QUICK SEARCH (KHÔNG TỰ AUTO FETCH PHÒNG)
// ─────────────────────────────────────────────────────────────
function QuickSearchBox() {
  const navigate = useNavigate();
  const [ci, setCi] = useState('');
  const [co, setCo] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (ci) params.append('checkIn', ci);
    if (co) params.append('checkOut', co);
    params.append('guests', guests);
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] p-2 border border-black/5 flex flex-col md:flex-row gap-2 items-center">
      <div className="flex-1 w-full flex flex-col hover:bg-slate-50 transition-colors rounded-3xl pt-2 pb-1 px-5 focus-within:bg-slate-50">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] ml-1 mb-1">Nhận phòng</label>
        <div className="flex items-center relative">
           <input type="date" value={ci} onChange={e => setCi(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-transparent text-sm font-bold text-[#111] focus:outline-none placeholder-[#aaa] pb-2 cursor-pointer" />
        </div>
      </div>
      
      <div className="hidden md:block w-[1px] h-10 bg-slate-200 shrink-0" />

      <div className="flex-1 w-full flex flex-col hover:bg-slate-50 transition-colors rounded-3xl pt-2 pb-1 px-5 focus-within:bg-slate-50">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] ml-1 mb-1">Trả phòng</label>
        <div className="flex items-center relative">
           <input type="date" value={co} onChange={e => setCo(e.target.value)} min={ci || new Date().toISOString().split('T')[0]} className="w-full bg-transparent text-sm font-bold text-[#111] focus:outline-none placeholder-[#aaa] pb-2 cursor-pointer" />
        </div>
      </div>
      
      <div className="hidden md:block w-[1px] h-10 bg-slate-200 shrink-0" />

      <div className="flex-1 w-full flex flex-col hover:bg-slate-50 transition-colors rounded-3xl pt-2 pb-1 px-5 focus-within:bg-slate-50">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] ml-1 mb-1">Số khách</label>
        <div className="flex items-center relative">
           <select value={guests} onChange={e => setGuests(e.target.value)} className="w-full bg-transparent text-sm font-bold text-[#111] focus:outline-none appearance-none cursor-pointer pb-2">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Người lớn</option>)}
           </select>
        </div>
      </div>

      <button 
        onClick={handleSearch}
        className="w-full md:w-auto md:min-w-[140px] h-[64px] bg-[#d4af37] text-black rounded-[1.5rem] font-black uppercase tracking-[0.1em] text-xs hover:bg-[#111] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 m-1 shrink-0"
      >
        <Search size={18} /> TÌM PHÒNG
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT FEATURED ROOMS (TỐI ƯU OVERFETCHING)
// ─────────────────────────────────────────────────────────────
function FeaturedRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Chỉ fetch nhẹ 3 item đầu để tránh timeout từ backend
  useEffect(() => {
    let active = true;
    const fetchMinimal = async () => {
      try {
        const fullList = await roomApi.getAll();
        if (!active) return;
        const top3 = fullList.slice(0, 3);
        setRooms(top3);
      } catch (e) {
        console.error(e);
      } finally {
        if(active) setLoading(false);
      }
    };
    fetchMinimal();
    return () => { active = false };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-[#2a2a2a]">
            <div className="h-[300px] bg-[#222]" />
            <div className="p-8">
              <div className="h-4 bg-[#333] w-1/4 rounded-full mb-4" />
              <div className="h-8 bg-[#333] w-3/4 rounded-full mb-4" />
              <div className="h-4 bg-[#333] w-1/2 rounded-full mb-8" />
              <div className="flex justify-between items-center">
                <div className="h-8 bg-[#333] w-1/3 rounded-full" />
                <div className="h-12 bg-[#333] w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {rooms.map((room, idx) => {
        const img = room.roomType.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600';
        return (
          <motion.div 
            key={room.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.6 }}
            className="group block bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-[#2a2a2a] hover:border-[#d4af37]/30 transition-colors duration-500"
          >
            <div className="relative h-[280px] overflow-hidden bg-[#111]">
              <img src={img} loading="lazy" alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
              <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/10">
                {room.roomType.type}
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-2 font-['Playfair_Display']">{room.name}</h3>
              <p className="text-sm text-[#888] mb-8 font-medium">Tầng {room.floorNumber} • {room.areaM2}m² • {room.viewType}</p>
              
              <div className="flex items-center justify-between border-t border-[#333] pt-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-1">Chỉ từ</div>
                  <div className="text-2xl font-black text-[#d4af37]">
                    {room.roomType.basePrice.toLocaleString('vi-VN')}₫<span className="text-xs text-[#888] font-normal ml-1">/đêm</span>
                  </div>
                </div>
                <Link to={`/rooms/${room.id}`}>
                  <button className="h-12 w-12 bg-[#333] text-white rounded-full flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-all duration-300">
                    <ChevronRight size={20} />
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
