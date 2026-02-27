import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import {
  User, Mail, Phone, MapPin, Calendar, Edit3, LogOut,
  Star, Clock, CreditCard, Shield, ChevronRight, Check
} from 'lucide-react';

const ProfilePage = () => {
  const { user, logout, loading } = useAuth();

  const [profileExists, setProfileExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'security'>('profile');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    dob: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await userApi.getMe();
        setProfileExists(true);
        setProfileData((prev) => ({
          ...prev,
          fullName: res.data.fullName || prev.fullName,
          phone: res.data.phone || prev.phone,
          address: res.data.address || '',
          dob: res.data.dateOfBirth || '',
          email: user?.email || prev.email,
        }));
      } catch {
        setProfileExists(false);
        setProfileData((prev) => ({
          ...prev,
          email: user?.email || prev.email,
        }));
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSave = async () => {
    try {
      const payload = {
        fullName: profileData.fullName,
        phone: profileData.phone,
        address: profileData.address,
        dateOfBirth: profileData.dob,
      };

      if (profileExists) {
        await userApi.updateMe(payload);
      } else {
        await userApi.createProfile(payload);
        setProfileExists(true);
      }

      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setEditing(false);
    }
  };

  const mockBookings = [
    { id: 'BK001', room: 'Phòng Deluxe', date: '15/01/2025', nights: 2, status: 'completed', amount: '2,400,000 ₫' },
    { id: 'BK002', room: 'Phòng Suite', date: '20/03/2025', nights: 1, status: 'upcoming', amount: '1,800,000 ₫' },
    { id: 'BK003', room: 'Phòng Superior', date: '05/06/2025', nights: 3, status: 'upcoming', amount: '3,600,000 ₫' },
  ];

  const memberLevel = 'Gold';
  const totalNights = 12;
  const totalBookings = 7;

  const tabs = [
    { key: 'profile', label: 'Thông tin', icon: User },
    { key: 'bookings', label: 'Đặt phòng', icon: Calendar },
    { key: 'security', label: 'Bảo mật', icon: Shield },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f7f4ef', fontFamily: "'Georgia', serif" }}>
      {/* Header Bar */}
      <div className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-800 flex items-center justify-center">
            <span className="text-orange-800 font-bold text-xs">STT</span>
          </div>
          <span className="tracking-[0.3em] text-xs uppercase text-gray-600 hidden sm:block">S-T-T Love Hotel</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors tracking-wider uppercase"
        >
          <LogOut size={14} />
          <span className="hidden sm:block">Đăng xuất</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Profile Hero */}
        <div
          className="relative overflow-hidden mb-8 p-8"
          style={{
            background: 'linear-gradient(135deg, #1c0a00 0%, #431800 50%, #6b2d0a 100%)',
          }}
        >
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)'
          }} />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <span className="text-xs tracking-[0.3em] uppercase text-yellow-500">
                  {memberLevel} Member
                </span>
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">{profileData.fullName}</h1>
              <p className="text-gray-400 text-sm">{profileData.email}</p>
            </div>

            {/* Stats */}
            <div className="flex gap-6 sm:gap-8 text-center">
              <div>
                <p className="text-2xl font-light text-yellow-400">{totalNights}</p>
                <p className="text-xs text-gray-500 tracking-wider uppercase mt-1">Đêm lưu trú</p>
              </div>
              <div className="w-px bg-stone-700" />
              <div>
                <p className="text-2xl font-light text-yellow-400">{totalBookings}</p>
                <p className="text-xs text-gray-500 tracking-wider uppercase mt-1">Đặt phòng</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-300 mb-8 bg-white">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-4 text-xs tracking-widest uppercase transition-all border-b-2 ${
                activeTab === key
                  ? 'border-orange-800 text-orange-800 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info Card */}
            <div className="lg:col-span-2 bg-white p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-orange-700 mb-1">Thông tin cá nhân</p>
                  <div className="w-8 h-px bg-orange-700" />
                </div>
                <button
                  onClick={() => editing ? handleSave() : setEditing(true)}
                  className="flex items-center gap-2 text-xs tracking-wider uppercase transition-colors"
                  style={{ color: editing ? '#15803d' : '#9a3412' }}
                >
                  {saved ? (
                    <><Check size={14} /> Đã lưu</>
                  ) : editing ? (
                    <><Check size={14} /> Lưu</>
                  ) : (
                    <><Edit3 size={14} /> Chỉnh sửa</>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Họ và tên', icon: User, key: 'fullName', type: 'text' },
                  { label: 'Email', icon: Mail, key: 'email', type: 'email' },
                  { label: 'Số điện thoại', icon: Phone, key: 'phone', type: 'tel' },
                  { label: 'Địa chỉ', icon: MapPin, key: 'address', type: 'text' },
                  { label: 'Ngày sinh', icon: Calendar, key: 'dob', type: 'text' },
                ].map(({ label, icon: Icon, key, type }) => (
                  <div key={key}>
                    <label className="flex items-center gap-2 text-xs tracking-widest uppercase text-gray-400 mb-2">
                      <Icon size={12} />
                      {label}
                    </label>
                    {editing ? (
                      <input
                        type={type}
                        value={profileData[key as keyof typeof profileData]}
                        onChange={(e) => setProfileData({ ...profileData, [key]: e.target.value })}
                        className="w-full py-2 border-0 border-b-2 border-orange-200 bg-transparent focus:border-orange-700 focus:outline-none text-gray-800 transition-colors"
                        style={{ fontFamily: 'inherit' }}
                      />
                    ) : (
                      <p className="text-gray-800 py-2 border-b border-stone-100">
                        {profileData[key as keyof typeof profileData]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {editing && (
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleSave}
                    className="px-8 py-3 text-white text-xs tracking-widest uppercase transition-colors"
                    style={{ background: '#9a3412' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#7c2d12')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#9a3412')}
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-8 py-3 border border-gray-300 text-gray-600 text-xs tracking-widest uppercase hover:border-gray-600 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            {/* Side Cards */}
            <div className="space-y-4">
              {/* Membership Card */}
              <div
                className="p-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #92400e, #78350f)' }}
              >
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full border border-yellow-600 opacity-20" />
                <p className="text-xs tracking-[0.3em] uppercase text-yellow-400 mb-3">Hạng thành viên</p>
                <div className="flex items-center gap-2 mb-1">
                  <Star size={20} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-2xl font-light">{memberLevel}</span>
                </div>
                <p className="text-stone-300 text-xs mt-3">Tích lũy thêm 8 đêm để lên hạng Platinum</p>
                <div className="mt-4 bg-stone-800 bg-opacity-40 h-1.5">
                  <div className="h-full bg-yellow-400" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-stone-400 mt-1">12/20 đêm</p>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-4">Nhanh</p>
                {[
                  { label: 'Đặt phòng mới', href: '/rooms', icon: Calendar },
                  { label: 'Ưu đãi của tôi', href: '/offers', icon: CreditCard },
                  { label: 'Lịch sử thanh toán', href: '/payments', icon: Clock },
                ].map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    to={href}
                    className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0 text-sm text-gray-700 hover:text-orange-800 group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={14} className="text-gray-400 group-hover:text-orange-700" />
                      {label}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-orange-700" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white">
            <div className="p-6 border-b border-stone-100">
              <p className="text-xs tracking-[0.3em] uppercase text-orange-700 mb-1">Lịch sử đặt phòng</p>
              <div className="w-8 h-px bg-orange-700" />
            </div>
            <div className="divide-y divide-stone-100">
              {mockBookings.map((booking) => (
                <div key={booking.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ background: booking.status === 'completed' ? '#f5f5f4' : '#fff7ed' }}
                    >
                      <Calendar size={16} className={booking.status === 'completed' ? 'text-gray-400' : 'text-orange-700'} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{booking.room}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{booking.date} · {booking.nights} đêm</p>
                      <p className="text-xs tracking-wider text-gray-400 mt-0.5 uppercase">#{booking.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:text-right">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.amount}</p>
                    </div>
                    <span
                      className="text-xs px-3 py-1 tracking-wider uppercase"
                      style={{
                        background: booking.status === 'completed' ? '#f1f5f9' : '#fff7ed',
                        color: booking.status === 'completed' ? '#64748b' : '#c2410c',
                      }}
                    >
                      {booking.status === 'completed' ? 'Hoàn thành' : 'Sắp tới'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8">
              <p className="text-xs tracking-[0.3em] uppercase text-orange-700 mb-1">Đổi mật khẩu</p>
              <div className="w-8 h-px bg-orange-700 mb-8" />
              <div className="space-y-6">
                {['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu'].map((label) => (
                  <div key={label}>
                    <label className="block text-xs tracking-widest uppercase text-gray-400 mb-3">{label}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full py-3 border-0 border-b-2 border-gray-200 bg-transparent focus:border-orange-700 focus:outline-none text-gray-800 transition-colors"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
                <button
                  className="w-full py-3 text-white text-xs tracking-widest uppercase transition-colors mt-4"
                  style={{ background: '#9a3412' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#7c2d12')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#9a3412')}
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-4">Bảo mật tài khoản</p>
                {[
                  { label: 'Xác thực hai yếu tố', value: 'Chưa bật', action: 'Bật ngay' },
                  { label: 'Phiên đăng nhập', value: '2 thiết bị', action: 'Quản lý' },
                  { label: 'Nhật ký hoạt động', value: 'Hoạt động gần đây', action: 'Xem' },
                ].map(({ label, value, action }) => (
                  <div key={label} className="flex items-center justify-between py-4 border-b border-stone-100 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{value}</p>
                    </div>
                    <button className="text-xs text-orange-700 hover:text-orange-900 tracking-wider uppercase transition-colors">
                      {action}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-white p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-red-600 mb-4">Nguy hiểm</p>
                <button className="text-sm text-red-600 hover:text-red-800 transition-colors flex items-center gap-2">
                  <LogOut size={14} />
                  Đăng xuất khỏi tất cả thiết bị
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;