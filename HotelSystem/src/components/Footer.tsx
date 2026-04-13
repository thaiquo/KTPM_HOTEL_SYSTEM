import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-accent text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Grid */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-2.5 rounded-xl group-hover:shadow-lg transition-shadow">
                <Heart size={20} className="text-white fill-white" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">S-T-T</div>
                <div className="text-[11px] uppercase tracking-widest text-primary font-semibold">
                  Love Hotel
                </div>
              </div>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              Nơi lý tưởng cho khoảng thời gian riêng tư, lãng mạn và đặc biệt của bạn.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-5">Điều hướng</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="text-white/70 hover:text-primary transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="text-white/70 hover:text-primary transition-colors">
                  Đặt phòng
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-white/70 hover:text-primary transition-colors">
                  Đặt phòng của tôi
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-5">Liên hệ</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 text-primary shrink-0" />
                <span className="text-white/70">Phường An Khánh, Quận 2, TP HCM</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-primary shrink-0" />
                <a href="tel:0925519789" className="text-white/70 hover:text-primary transition-colors">
                  092 5519 789
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary shrink-0" />
                <a href="mailto:info@stthotel.com" className="text-white/70 hover:text-primary transition-colors">
                  info@stthotel.com
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-bold text-lg mb-5">Theo dõi</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-11 h-11 bg-white/10 hover:bg-primary rounded-full flex items-center justify-center transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="w-11 h-11 bg-white/10 hover:bg-primary rounded-full flex items-center justify-center transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="w-11 h-11 bg-white/10 hover:bg-primary rounded-full flex items-center justify-center transition-all duration-300"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/60">
            &copy; 2025 S-T-T Love Hotel. Mọi quyền được bảo vệ.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
