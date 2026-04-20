import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, LogOut, User as UserIcon, Map, X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';

const NavLink = ({
  to,
  label,
  isScrolled,
  isHome,
}: {
  to: string;
  label: string;
  isScrolled: boolean;
  isHome: boolean;
}) => (
  <Link
    to={to}
    className={`text-sm font-semibold transition-colors duration-300 font-headline ${
      isHome && !isScrolled
        ? 'text-white/90 hover:text-white'
        : 'text-on-surface hover:text-primary-container'
    }`}
  >
    {label}
  </Link>
);

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/rooms', label: 'Đặt phòng' },
    { to: '/my-bookings', label: 'Phòng đã đặt' },
    { to: '/profile', label: 'Tài khoản' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled || !isHome
          ? 'bg-white/90 backdrop-blur-xl shadow-sm py-2 border-b border-outline-variant/30'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="flex items-center justify-between w-full px-6 py-2 mx-auto max-w-7xl">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center p-2 border transition-all duration-300 ${
              isScrolled || !isHome
                ? 'bg-primary-container/10 border-primary-container/20'
                : 'bg-white/10 border-white/20'
            }`}
          >
            <Heart
              size={20}
              className={`transition-colors duration-300 ${
                isScrolled || !isHome ? 'text-primary-container' : 'text-white'
              }`}
              fill="currentColor"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className={`text-sm font-black tracking-tight font-headline transition-colors duration-300 ${
                isScrolled || !isHome ? 'text-on-surface' : 'text-white'
              }`}
            >
              S-T-T
            </span>
            <span
              className={`text-[10px] tracking-[0.2em] font-medium uppercase transition-colors duration-300 ${
                isScrolled || !isHome ? 'text-primary-container' : 'text-white/80'
              }`}
            >
              Love Hotel
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              label={link.label}
              isScrolled={isScrolled}
              isHome={isHome}
            />
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/rooms"
            className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              isScrolled || !isHome
                ? 'bg-tertiary-container text-on-tertiary'
                : 'bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25'
            }`}
          >
            <Map size={16} />
            Xem bản đồ
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 text-sm ${
                  isScrolled || !isHome
                    ? 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    : 'bg-white/15 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <UserIcon size={16} className="text-primary-fixed-dim" />
                <span className="max-w-[120px] truncate">{user?.name || 'Tài khoản'}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className={`px-3 py-2 rounded-full transition-all duration-300 ${
                  isScrolled || !isHome
                    ? 'text-on-surface-variant hover:text-error hover:bg-error/5'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={`font-bold px-6 py-2 rounded-full text-sm transition-all duration-300 active:scale-95 ${
                isScrolled || !isHome
                  ? 'bg-primary-container text-on-primary-container hover:brightness-110'
                  : 'bg-black/60 backdrop-blur-sm text-white border border-white/10 hover:bg-black/80'
              }`}
            >
              Đăng nhập
            </Link>
          )}

          {/* Mobile Toggle */}
          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? (
              <X
                size={22}
                className={isScrolled || !isHome ? 'text-on-surface' : 'text-white'}
              />
            ) : (
              <Menu
                size={22}
                className={isScrolled || !isHome ? 'text-on-surface' : 'text-white'}
              />
            )}
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
            className="absolute top-full left-0 right-0 bg-white shadow-xl p-4 md:hidden flex flex-col gap-3 border-t border-gray-100"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                onClick={() => setOpen(false)}
                to={link.to}
                className="text-on-surface font-semibold py-2 border-b border-gray-50 last:border-0 hover:text-primary-container transition-colors font-headline"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-2">
              <Link
                onClick={() => setOpen(false)}
                to="/rooms"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-tertiary-container text-on-tertiary font-bold text-sm"
              >
                <Map size={18} />
                Xem bản đồ
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-error/10 text-error font-bold text-sm"
                >
                  Đăng xuất
                </button>
              ) : (
                <Link
                  onClick={() => setOpen(false)}
                  to="/login"
                  className="w-full text-center py-3 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
