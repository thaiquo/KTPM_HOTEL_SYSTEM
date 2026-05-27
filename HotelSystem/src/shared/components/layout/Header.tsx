import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, ShoppingCart, User as UserIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import logoTriStar from '../../../assets/hotel.png';
import { getManagementHomeByRole } from '../../lib/roleRoute';
import { notificationApi, type UserNotification } from '../../../services/api';

const NavLink = ({ to, label }: { to: string; label: string }) => {
  const className = 'text-lg font-semibold transition-colors duration-300 text-white/80 hover:text-[#d4af37]';

  if (to.startsWith('/#')) {
    return (
      <a href={to} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {label}
    </Link>
  );
};

const formatNotificationTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getNotificationLabel = (type: string) => {
  const normalized = type.toUpperCase();
  if (normalized.includes('REFUND')) return 'Hoàn tiền';
  if (normalized.includes('PAYMENT')) return 'Thanh toán';
  if (normalized.includes('CANCEL')) return 'Đã hủy';
  if (normalized.includes('EXPIRED')) return 'Hết hạn';
  return 'Đặt phòng';
};

const getNotificationTarget = (item: UserNotification) => {
  if (item.type.toUpperCase().includes('REFUND')) return '/profile?tab=refunds';
  return `/my-bookings?bookingId=${encodeURIComponent(item.bookingId)}`;
};

const dedupeNotifications = (items: UserNotification[]) => {
  const seen = new Map<string, UserNotification>();

  for (const item of items) {
    const key = `${item.bookingId}:${item.type.toUpperCase()}`;
    const current = seen.get(key);

    if (!current || new Date(item.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalRooms } = useCart();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const list = await notificationApi.getByUser(user.id);
        if (!cancelled) setNotifications(dedupeNotifications(list));
      } catch (error) {
        console.error('Notification API Error:', error);
        if (!cancelled) setNotifications([]);
      }
    };

    // Đợi 5 giây trước khi thực hiện pull notification lần đầu, 
    // tránh tình trạng call dồn dập vào lúc mới mở app làm block tài nguyên kết nối của browser (lỗi Vite chunk load timeout)
    const initialDelay = window.setTimeout(() => {
      if (!cancelled) loadNotifications();
    }, 5000);

    const timer = window.setInterval(loadNotifications, 30000);
    return () => {
      cancelled = true;
      window.clearTimeout(initialDelay);
      window.clearInterval(timer);
    };
  }, [user]);

  const recentNotifications = notifications.slice(0, 5);
  const refundCount = notifications.filter((item) => item.type.toUpperCase().includes('REFUND')).length;

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
          {isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((value) => !value)}
                className="relative rounded-full p-2.5 text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-[#d4af37]"
                title="Thông báo"
                aria-label="Thông báo"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d4af37] px-1 text-[10px] font-black text-[#0f0f0f]">
                    {Math.min(notifications.length, 9)}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 top-full mt-3 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#151515] shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div>
                        <div className="text-sm font-black text-white">Thông báo hệ thống</div>
                        <div className="text-xs text-white/50">
                          {refundCount > 0 ? `${refundCount} cập nhật hoàn tiền` : 'Đặt phòng, thanh toán và hủy phòng'}
                        </div>
                      </div>
                      <Link
                        to="/profile?tab=refunds"
                        onClick={() => setNotificationOpen(false)}
                        className="text-xs font-bold text-[#d4af37] hover:underline"
                      >
                        Xem hoàn tiền
                      </Link>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm font-semibold text-white/55">Chưa có thông báo mới</div>
                      ) : (
                        recentNotifications.map((item) => (
                          <Link
                            key={item.id}
                            to={getNotificationTarget(item)}
                            onClick={() => setNotificationOpen(false)}
                            className="block border-b border-white/10 px-5 py-4 transition-colors last:border-0 hover:bg-white/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-bold leading-snug text-white">{item.message}</div>
                              <span className="shrink-0 rounded-full bg-[#d4af37]/15 px-2 py-1 text-[10px] font-black uppercase text-[#d4af37]">
                                {getNotificationLabel(item.type)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-white/45">{formatNotificationTime(item.createdAt)}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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

          <button type="button" className="md:hidden p-2" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
          </button>
        </div>
      </div>

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
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white"
                >
                  Đăng xuất
                </button>
              ) : (
                <Link
                  onClick={() => setOpen(false)}
                  to="/login"
                  className="w-full rounded-xl bg-[#d4af37] py-10 text-center text-sm font-bold text-[#0f0f0f]"
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
