import { Link } from "react-router-dom";
import {
  Phone,
  User,
  LogOut,
  Menu,
  Heart,
  Search,
  X,
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
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b-2 border-border shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* LEFT - Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="bg-primary p-2 rounded-xl shadow-md">
              <Heart size={24} className="text-white fill-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
                S-T-T
              </div>
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">
                Love Hotel
              </div>
            </div>
          </Link>

          {/* CENTER - Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink href="/">Trang chủ</NavLink>
            <NavLink href="/rooms">Đặt phòng</NavLink>
          </nav>

          {/* RIGHT - Search + Auth */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative w-64">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm phòng..."
                className="w-full px-4 py-2.5 pr-12 bg-secondary border-2 border-border rounded-full
                  text-sm text-foreground placeholder-text-muted
                  focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                  transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
              >
                <Search size={18} />
              </button>
            </form>

            {/* Hotline */}
            <a
              href="tel:0925519789"
              className="flex items-center gap-1.5 text-primary hover:text-primary-dark font-semibold whitespace-nowrap text-sm"
            >
              <Phone size={16} />
              092 5519 789
            </a>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 text-foreground hover:text-primary transition-colors"
                >
                  <User size={18} />
                  <span className="max-w-xs truncate text-sm font-medium">{user?.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-secondary/50 rounded-lg transition-colors text-text-muted hover:text-error"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all shadow-md hover:shadow-lg"
              >
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 ml-2"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-foreground" />
            ) : (
              <Menu size={24} className="text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-t-2 border-border shadow-lg">
          <div className="p-4 space-y-3">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm phòng..."
                className="w-full px-4 py-3 pr-12 bg-secondary border-2 border-border rounded-lg
                  text-foreground placeholder-text-muted
                  focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search size={18} className="text-text-muted" />
              </button>
            </form>

            {/* Nav Links */}
            <MobileNavLink to="/" label="Trang chủ" setOpen={setMobileMenuOpen} />
            <MobileNavLink to="/rooms" label="Đặt phòng" setOpen={setMobileMenuOpen} />

            {/* Hotline */}
            <a
              href="tel:0925519789"
              className="block text-center py-3 bg-secondary rounded-lg font-semibold text-primary"
            >
              <Phone size={18} className="inline mr-2" />
              092 5519 789
            </a>

            {/* Auth Section */}
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3 bg-primary/10 rounded-lg font-semibold text-primary"
                >
                  <User size={18} className="inline mr-2" />
                  {user?.name || "Tài khoản"}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 bg-error/10 text-error font-semibold rounded-lg"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-3 bg-primary text-white font-bold rounded-lg"
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

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    to={href}
    className="px-4 py-2 text-foreground hover:text-primary font-medium transition-colors"
  >
    {children}
  </Link>
);

const MobileNavLink = ({
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
    className="block text-center py-3 bg-secondary rounded-lg font-semibold text-foreground hover:bg-border transition-colors"
  >
    {label}
  </Link>
);
