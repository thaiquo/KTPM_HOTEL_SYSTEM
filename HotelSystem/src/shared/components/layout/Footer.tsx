import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface pt-20 pb-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand & Contact */}
        <div className="flex flex-col gap-8 md:col-span-1">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-inverse-on-surface/10 rounded-xl flex items-center justify-center p-2 border border-inverse-on-surface/10">
              <Heart size={20} className="text-primary-fixed-dim" fill="currentColor" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight font-headline text-inverse-on-surface">
                S-T-T
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-medium text-primary-fixed-dim font-headline">
                Love Hotel
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-6">
            <h4 className="text-primary-fixed-dim font-bold text-sm uppercase tracking-widest">
              Thông tin liên hệ
            </h4>
            <a
              href="tel:0925519789"
              className="flex items-center gap-4 text-inverse-on-surface/70 hover:text-inverse-on-surface transition-colors cursor-pointer group"
            >
              <div className="p-2 rounded-full border border-inverse-on-surface/10 group-hover:bg-primary-container group-hover:border-primary-container transition-all">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">092.5519.789</span>
            </a>
            <div className="flex items-start gap-4 text-inverse-on-surface/70 hover:text-inverse-on-surface transition-colors cursor-pointer group">
              <div className="p-2 rounded-full border border-inverse-on-surface/10 group-hover:bg-primary-container group-hover:border-primary-container transition-all mt-1">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-sm leading-relaxed max-w-[200px]">
                An Khánh, Thủ Đức, Hồ Chí Minh
              </span>
            </div>
            <a
              href="mailto:info@stthotel.com"
              className="flex items-center gap-4 text-inverse-on-surface/70 hover:text-inverse-on-surface transition-colors cursor-pointer group"
            >
              <div className="p-2 rounded-full border border-inverse-on-surface/10 group-hover:bg-primary-container group-hover:border-primary-container transition-all">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">info@stthotel.com</span>
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-primary-fixed-dim font-bold text-sm uppercase tracking-widest">
              Theo dõi chúng tôi tại:
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 rounded-full border border-inverse-on-surface/10 hover:bg-white hover:text-inverse-surface transition-all transform hover:-translate-y-1"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full border border-inverse-on-surface/10 hover:bg-white hover:text-inverse-surface transition-all transform hover:-translate-y-1"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full border border-inverse-on-surface/10 hover:bg-white hover:text-inverse-surface transition-all transform hover:-translate-y-1"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Links Groups */}
        <div className="flex flex-col gap-6">
          <h4 className="text-inverse-on-surface font-bold text-sm uppercase tracking-widest relative inline-block">
            S-T-T Love Hotel
            <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-container"></span>
          </h4>
          <ul className="flex flex-col gap-4 text-inverse-on-surface/50 text-sm mt-4">
            <li>
              <Link to="/rooms" className="hover:text-primary-fixed-dim transition-colors">
                Phòng nghỉ cao cấp
              </Link>
            </li>
            <li>
              <Link to="/rooms" className="hover:text-primary-fixed-dim transition-colors">
                Phòng VIP & Suite
              </Link>
            </li>
            <li>
              <Link to="/rooms" className="hover:text-primary-fixed-dim transition-colors">
                Phòng theo giờ
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-inverse-on-surface font-bold text-sm uppercase tracking-widest relative inline-block">
            Khám phá
            <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-container"></span>
          </h4>
          <ul className="flex flex-col gap-4 text-inverse-on-surface/50 text-sm mt-4">
            <li>
              <Link to="/rooms" className="hover:text-primary-fixed-dim transition-colors">
                Lưu trú ngắn hạn
              </Link>
            </li>
            <li>
              <Link to="/rooms" className="hover:text-primary-fixed-dim transition-colors">
                Lưu trú dài hạn
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-primary-fixed-dim transition-colors">
                Liên hệ
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-inverse-on-surface font-bold text-sm uppercase tracking-widest relative inline-block">
            Hỗ trợ
            <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-container"></span>
          </h4>
          <ul className="flex flex-col gap-4 text-inverse-on-surface/50 text-sm mt-4">
            <li>
              <a href="#" className="hover:text-primary-fixed-dim transition-colors">
                Chính sách giao và nhận phòng
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary-fixed-dim transition-colors">
                Chính sách đổi, trả phòng và hoàn tiền
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary-fixed-dim transition-colors">
                Câu hỏi thường gặp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-inverse-on-surface/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-inverse-on-surface/40">
        <p>Copyright 2025 © S-T-T Love Hotel</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-inverse-on-surface transition-colors">
            Điều khoản dịch vụ
          </a>
          <a href="#" className="hover:text-inverse-on-surface transition-colors">
            Chính sách bảo mật
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
