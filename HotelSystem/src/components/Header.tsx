import { Link } from "react-router-dom";
import {
  Phone,
  User,
  LogOut,
  Menu,
  Heart,
  Search,
  Hotel,
  BedDouble,
  Newspaper,
  Headset,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      console.log("Tìm kiếm:", search);
      // Ví dụ: navigate(`/rooms?search=${encodeURIComponent(search)}`)
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center">
          {/* LEFT - Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2.5 rounded-xl shadow-md">
                <Heart size={26} className="text-white fill-white" />
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-xl lg:text-2xl font-black tracking-tight text-gray-900">
                  S-T-T
                </div>
                <div className="text-[10px] lg:text-xs uppercase tracking-widest text-orange-600 font-semibold">
                  Love Hotel
                </div>
              </div>
            </Link>
          </div>
          {/* CENTER - Menu + Search */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-8 px-6">
            {/* Navigation */}
            <nav className="flex items-center gap-8 whitespace-nowrap">
              <HeaderLink to="/" icon={<Hotel size={18} />} label="Trang chủ" />
              <HeaderLink
                to="/rooms"
                icon={<BedDouble size={18} />}
                label="Đặt phòng"
              />
              <HeaderLink
                to="/news"
                icon={<Newspaper size={18} />}
                label="Tin tức"
              />
              <HeaderLink
                to="/contact"
                icon={<Headset size={18} />}
                label="Liên hệ"
              />
            </nav>

            {/* Search (NGẮN LẠI) */}
            <div className="w-[360px]">
              <form onSubmit={handleSearch} className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm phòng..."
                  className="w-full pr-12 pl-5 py-2.5
                 bg-gray-50 border border-gray-200 rounded-full
                 focus:bg-white focus:border-orange-400
                 focus:ring-2 focus:ring-orange-200/50
                 outline-none transition-all duration-200
                 text-sm text-gray-800 placeholder-gray-500"
                />

                {/* ICON SEARCH – BUTTON */}
                <button
                  type="submit"
                  aria-label="Tìm kiếm"
                  className="absolute right-4 top-1/2 -translate-y-1/2
                 text-gray-500 hover:text-orange-600
                 transition-colors"
                >
                  <Search size={20} />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT - Hotline + Auth + Mobile button */}
          <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
            {/* Hotline */}
            <a
              href="tel:0925519789"
              className="hidden md:flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
            >
              <Phone size={18} className="text-orange-500" />
              <span>092 5519 789</span>
            </a>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-5">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-700 hover:text-orange-600 font-medium whitespace-nowrap"
                >
                  <User size={18} />
                  <span className="max-w-[140px] truncate">{user?.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex px-6 py-2.5 
                           bg-gradient-to-r from-orange-500 to-red-500 
                           text-white font-semibold rounded-full 
                           hover:brightness-110 hover:shadow-md transition-all duration-200 whitespace-nowrap"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-gray-100 transition"
            >
              <Menu size={28} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────
          MOBILE MENU & SEARCH
      ──────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          {/* Mobile Search */}
          <div className="p-4 border-b border-gray-100">
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm phòng..."
                className="w-full pl-12 pr-28 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                Tìm
              </button>
            </form>
          </div>

          {/* Mobile Links */}
          <div className="p-4 space-y-2">
            <MobileLink to="/" label="Trang chủ" setOpen={setMobileMenuOpen} />
            <MobileLink
              to="/rooms"
              label="Đặt phòng"
              setOpen={setMobileMenuOpen}
            />
            <MobileLink
              to="/news"
              label="Tin tức"
              setOpen={setMobileMenuOpen}
            />
            <MobileLink
              to="/contact"
              label="Liên hệ"
              setOpen={setMobileMenuOpen}
            />

            <div className="pt-4 pb-2 text-center">
              <a
                href="tel:0925519789"
                className="inline-flex items-center gap-3 text-orange-600 font-semibold text-lg"
              >
                <Phone size={20} />
                092 5519 789
              </a>
            </div>

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3.5 bg-orange-50 rounded-xl font-semibold text-orange-700"
                >
                  <User size={18} className="inline mr-2" />
                  {user?.name || "Tài khoản"}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 bg-red-50 text-red-600 font-semibold rounded-xl"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

const HeaderLink = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-2 font-medium text-gray-700 hover:text-orange-600 transition-colors duration-200 whitespace-nowrap"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const MobileLink = ({
  to,
  label,
  setOpen,
}: {
  to: string;
  label: string;
  setOpen: (open: boolean) => void;
}) => (
  <Link
    to={to}
    onClick={() => setOpen(false)}
    className="block text-center py-3.5 bg-gray-50 rounded-xl font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-700 transition"
  >
    {label}
  </Link>
);
