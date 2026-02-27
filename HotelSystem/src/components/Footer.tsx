import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Heart size={20} className="text-white" fill="white" />
              </div>
              <div>
                <div className="text-lg font-black">S-T-T</div>
                <div className="text-[10px] uppercase tracking-widest text-orange-500">
                  Love Hotel
                </div>
              </div>
            </Link>
            <p className="text-slate-400 text-sm">
              Nơi lý tưởng cho khoảng thời gian riêng tư và lãng mạn của bạn.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-slate-400 hover:text-orange-500">Trang chủ</Link></li>
              <li><Link to="/rooms" className="text-slate-400 hover:text-orange-500">Đặt phòng</Link></li>
              <li><Link to="/news" className="text-slate-400 hover:text-orange-500">Tin tức</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-orange-500">Liên hệ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-slate-400">
                <MapPin size={16} className="mt-1 shrink-0" />
                <span>An Khánh, Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Phone size={16} />
                <a href="tel:0925519789" className="hover:text-orange-500">092 5519 789</a>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Mail size={16} />
                <a href="mailto:info@stthotel.com" className="hover:text-orange-500">info@stthotel.com</a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-bold mb-4">Theo dõi chúng tôi</h3>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <Twitter size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2024 S-T-T Love Hotel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;