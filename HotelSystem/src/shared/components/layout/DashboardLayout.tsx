import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  HiOutlineOfficeBuilding,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineCog,
  HiOutlineChevronLeft,
  HiOutlineSearch,
} from 'react-icons/hi';

interface DashboardMenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  portalLabel: string;
  portalSubtitle: string;
  menuItems: DashboardMenuItem[];
  accentColorClass: string;
  hoverAccentClass: string;
}

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  portalLabel,
  portalSubtitle,
  menuItems,
  accentColorClass,
  hoverAccentClass,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeText = React.useMemo(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
  }, [now]);

  const dateText = React.useMemo(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TZ,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
  }, [now]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } bg-[#1a1c2e] text-white flex flex-col transition-all duration-300 relative z-20`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute -right-3 top-24 bg-[#1a1c2e] text-white rounded-full p-1 border border-gray-700 shadow-lg ${hoverAccentClass} transition-colors`}
          aria-label="Toggle sidebar"
        >
          <HiOutlineChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="p-6 flex items-center space-x-3 border-b border-gray-800">
          <div className={`w-10 h-10 ${accentColorClass} rounded-xl flex items-center justify-center shadow-lg`}>
            <HiOutlineOfficeBuilding className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="font-bold text-xl tracking-tight">{portalLabel}</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{portalSubtitle}</p>
            </div>
          )}
        </div>

        <div className={`p-6 ${isSidebarOpen ? '' : 'flex justify-center'}`}>
          <div className={`flex items-center ${isSidebarOpen ? 'space-x-3 bg-white/5 p-3 rounded-2xl' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shadow-lg">
              {user?.name?.charAt(0).toUpperCase() || 'AD'}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h2 className="font-semibold text-sm truncate">{user?.name || 'Tài khoản'}</h2>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên vận hành'}
                </p>
              </div>
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <div className="px-6 -mt-3 pb-4">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Giờ Việt Nam</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="font-mono text-2xl font-black text-white leading-none">{timeText}</div>
                <div className="text-xs font-semibold text-gray-300">{dateText}</div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${
                  isSidebarOpen ? 'px-4' : 'justify-center'
                } py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? `${accentColorClass} text-white shadow-lg`
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                  {item.icon}
                </div>
                {isSidebarOpen && <span className="ml-3 font-medium text-sm">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-1">
          <button
            type="button"
            className={`flex items-center ${isSidebarOpen ? 'px-4' : 'justify-center'} py-3 w-full text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5`}
          >
            <HiOutlineCog className="w-6 h-6" />
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Trợ giúp</span>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={`flex items-center ${isSidebarOpen ? 'px-4' : 'justify-center'} py-3 w-full text-gray-400 hover:text-red-400 transition-colors rounded-xl hover:bg-white/5`}
          >
            <HiOutlineLogout className="w-6 h-6" />
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fc] relative">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center space-x-4 flex-1 max-w-xl">
            <div className="relative w-full group">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-sky-600 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm nhanh thông tin..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              type="button"
              className="relative p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
              aria-label="Notifications"
            >
              <HiOutlineBell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
              aria-label="Settings"
            >
              <HiOutlineCog className="w-6 h-6" />
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border-2 border-white shadow-sm group-hover:border-sky-200 transition-all">
                {user?.name?.charAt(0).toUpperCase() || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
