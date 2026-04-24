import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Menu, LogOut, User as UserIcon, X, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import logoTriStar from '../../../assets/hotel.png';
import { getManagementHomeByRole } from '../../lib/roleRoute';

const NavLink = ({
  to,
  label,
}: {
  to: string;
  label: string;
}) => {
  if (to.startsWith('/#')) {
    return (
      <a
        href={to}
        className="text-lg font-semibold transition-colors duration-300 text-white/80 hover:text-[#d4af37]"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      to={to}
      className="text-lg font-semibold transition-colors duration-300 text-white/80 hover:text-[#d4af37]"
    >
      {label}
    </Link>
  );
};

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalRooms } = useCart();
  const [open, setOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollYRef.current;

      if (currentScrollY < 24) {
        setIsHidden(false);
      } else if (scrollingDown && currentScrollY > 120) {
        setIsHidden(true);
      } else if (!scrollingDown) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/rooms', label: 'Phòng' },
    { to: '/#experience', label: 'Dịch vụ' },
    { to: '/#contact', label: 'Liên hệ' },
  ];

  if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
    navLinks.push({ to: getManagementHomeByRole(user.role), label: 'Quản lý' });
  }

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full border-b border-[#d4af37]/20 bg-[#0f0f0f]/95 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-500 ease-out ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="container-custom flex h-23.5 items-center justify-between gap-8">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#d4af37]/55 bg-black p-1 shadow-[0_0_0_1px_rgba(212,175,55,0.15)]">
            <img src={logoTriStar} alt="TriStar Hotel" className="h-full w-full rounded-xl object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-2xl font-extrabold tracking-tight text-white">TriStar Hotel</div>
            <div className="text-xs uppercase tracking-[0.28em] text-[#d4af37]">Luxury Private Stay</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-12">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} label={link.label} />
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {/* Cart Icon */}
          <Link
            to="/booking/cart"
            className="relative rounded-full p-2.5 text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-[#d4af37]"
            title="Giỏ hàng"
          >
            <ShoppingCart size={20} />
            {totalRooms > 0 && (
              <motion.span
                key={totalRooms}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37] text-[10px] font-black text-[#0f0f0f]"
              >
                {totalRooms}
              </motion.span>
            )}
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#d4af37]/60 hover:text-[#d4af37]"
              >
                <UserIcon size={16} className="text-[#d4af37]" />
                <span className="max-w-30 truncate">{user?.name || 'Tài khoản'}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-2 text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden items-center justify-center rounded-none bg-[#d4af37] px-7 py-3 text-base font-extrabold tracking-wide text-[#0f0f0f] transition-all hover:brightness-110 sm:inline-flex"
            >
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu with Animation */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full flex flex-col gap-3 border-t border-[#d4af37]/25 bg-[#151515] p-4 shadow-xl md:hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                onClick={() => setOpen(false)}
                to={link.to}
                className="border-b border-white/10 py-2 font-semibold text-white/90 transition-colors last:border-0 hover:text-[#d4af37]"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    onClick={() => setOpen(false)}
                    to="/login"
                    className="w-full rounded-xl bg-[#d4af37] py-10 text-center text-sm font-bold text-[#0f0f0f]"
                  >
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
