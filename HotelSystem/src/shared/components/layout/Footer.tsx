import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import logoTriStar from '../../../assets/hotel.png';

const Footer = () => {
  return (
    <footer id="contact" className="mt-28 bg-gradient-to-b from-black to-[#1a1a1a] px-4 pb-12 pt-24 text-white md:px-8">
      <div className="container-custom">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3 lg:gap-20">
          <div className="space-y-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-black p-1">
              <img src={logoTriStar} alt="TriStar Hotel" className="h-full w-full rounded-xl object-cover" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">TriStar Hotel</div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Luxury Private Stay</div>
            </div>
          </Link>
            <p className="max-w-md text-[16px] leading-relaxed text-white/75">
              Không gian lưu trú riêng tư - hiện đại - đẳng cấp. TriStar Hotel mang đến trải nghiệm sang trọng, kín đáo và thoải mái cho mọi khách hàng.
            </p>
          </div>

          <div className="space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-[0.32em] text-[#d4af37]">Liên hệ</h4>
            <ul className="space-y-4 text-[16px] text-white/80">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-[#d4af37]" />
                <a href="tel:0925519789" className="hover:text-white">092.5519.789</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-[#d4af37]" />
                <a href="mailto:info@tristarhotel.com" className="hover:text-white">info@tristarhotel.com</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 text-[#d4af37]" />
                <span>An Khánh, Thủ Đức, TP. Hồ Chí Minh</span>
              </li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-[0.32em] text-[#d4af37]">Hỗ trợ</h4>
            <ul className="space-y-4 text-[16px] text-white/80">
              <li>
                <a href="#" className="hover:text-white">Chính sách</a>
              </li>
              <li>
                <a href="#" className="hover:text-white">FAQ</a>
              </li>
              <li>
                <Link to="/rooms" className="hover:text-white">Đặt phòng</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 text-xs text-white/45 md:flex-row">
          <p>Copyright 2026 © TriStar Hotel</p>
          <p>Private. Modern. Luxury.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
