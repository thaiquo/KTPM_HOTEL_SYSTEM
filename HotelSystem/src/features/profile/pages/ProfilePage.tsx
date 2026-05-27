import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import {
  bookingApi,
  notificationApi,
  refundApi,
  userApi,
  type RefundRecord,
  type UserNotification,
} from '../../../services/api';
import { roomApi } from '../../../services/apiRoom';
import type { Booking, BookingGuest, Room } from '../../../types';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  LogOut,
  Star,
  Shield,
  ChevronRight,
  Check,
  type LucideIcon,
  CreditCard,
  Settings,
  RefreshCcw,
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { normalizeDateInputValue } from '../../../shared/lib/date';
import { getBookingStatusText, isPaidBookingRecord } from '../../booking/utils/bookingHistory';

type BookingWithRoom = Booking & { room?: Room | null; rooms?: Room[]; guests?: BookingGuest[] };

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  imageUrl: string;
};

type FieldRowProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type: string;
  disabled: boolean;
};

const FieldRow = ({ label, icon: Icon, value, onChange, type, disabled }: FieldRowProps) => (
  <div className="group">
    <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-2 font-bold font-label">
      <Icon size={12} className="text-primary-fixed-dim" />
      {label}
    </label>
    {disabled ? (
      <div className="w-full py-3.5 px-4 rounded-xl bg-surface-container-highest/30 text-on-surface border border-outline-variant/10 font-medium">
        {value || 'Chưa cập nhật'}
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-3.5 px-4 rounded-xl bg-surface-container-highest/60 text-on-surface placeholder:text-on-surface-variant/50 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-2 focus:ring-primary-container/10 transition-all font-medium"
      />
    )}
  </div>
);

const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const getBookingStatusClass = (status: Booking['status']) => {
  if (status === 'confirmed' || status === 'checked_in') {
    return 'border-green-500/20 bg-green-500/5 text-green-600';
  }
  if (status === 'deposit_paid') {
    return 'border-primary/20 bg-primary/5 text-primary';
  }
  if (status === 'cancelled') {
    return 'border-error/20 bg-error/5 text-error';
  }
  return 'border-yellow-500/20 bg-yellow-500/5 text-yellow-700';
};

const formatCurrency = (amount: number) => `${Number(amount || 0).toLocaleString('vi-VN')} VND`;

const getRefundStatusText = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'Đã gửi yêu cầu';
    case 'ASSIGNED':
      return 'Đã phân công xử lý';
    case 'PROCESSING':
      return 'Đang hoàn tiền';
    case 'REFUNDED':
    case 'SUCCESS':
      return 'Đã hoàn tiền';
    case 'REJECTED':
      return 'Bị từ chối';
    case 'FAILED':
      return 'Hoàn tiền thất bại';
    case 'OVERDUE':
      return 'Quá hạn xử lý';
    default:
      return status || 'Đang cập nhật';
  }
};

const getRefundStatusClass = (status: string) => {
  switch (status.toUpperCase()) {
    case 'REFUNDED':
    case 'SUCCESS':
      return 'border-green-500/25 bg-green-500/10 text-green-700';
    case 'REJECTED':
    case 'FAILED':
      return 'border-error/25 bg-error/10 text-error';
    case 'PROCESSING':
    case 'ASSIGNED':
      return 'border-blue-500/25 bg-blue-500/10 text-blue-700';
    default:
      return 'border-primary/25 bg-primary/10 text-primary';
  }
};

const getRefundReasonText = (reason: string) => {
  switch (reason) {
    case 'Free cancellation before 24 hours':
      return 'Hủy miễn phí trước 24 giờ';
    case 'Free cancellation before 72 hours':
      return 'Hủy miễn phí trước 72 giờ';
    case 'Late cancel: charge one night':
      return 'Hủy sát ngày nhận phòng: tính phí 1 đêm';
    case 'Late cancel for DEPOSIT: lose deposit':
      return 'Hủy sát ngày nhận phòng: mất tiền đặt cọc';
    case 'No-show: charge one night':
      return 'Không đến nhận phòng: tính phí 1 đêm';
    case 'No-show for FULL payment: no refund':
      return 'Không đến nhận phòng: không hoàn tiền';
    default:
      return reason || 'Theo chính sách hủy phòng';
  }
};

const ProfilePage = () => {
  const { user, logout, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const [profileExists, setProfileExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'refunds' | 'security'>('profile');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookings, setBookings] = useState<BookingWithRoom[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);
  const [refundNotifications, setRefundNotifications] = useState<UserNotification[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileFormState>({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phoneNumber || user?.phone || '',
    address: user?.address || '',
    dob: normalizeDateInputValue(user?.dateOfBirth),
    imageUrl: user?.imageUrl || '',
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'refunds' || tab === 'bookings' || tab === 'security' || tab === 'profile') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await userApi.getMe();
        setProfileExists(true);
        setProfileData((prev) => ({
          ...prev,
          fullName: res.data.fullName || res.data.name || prev.fullName,
          phone: res.data.phone || res.data.phoneNumber || prev.phone,
          address: res.data.address || prev.address,
          dob: normalizeDateInputValue(res.data.dateOfBirth) || prev.dob,
          imageUrl: res.data.imageUrl || prev.imageUrl,
          email: user?.email || prev.email,
        }));
      } catch {
        setProfileExists(false);
        setProfileData((prev) => ({
          ...prev,
          email: user?.email || prev.email,
          fullName: user?.fullName || user?.name || prev.fullName,
          phone: user?.phoneNumber || user?.phone || prev.phone,
          address: user?.address || prev.address,
          dob: normalizeDateInputValue(user?.dateOfBirth) || prev.dob,
          imageUrl: user?.imageUrl || prev.imageUrl,
        }));
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    const loadRefundNotifications = async () => {
      if (!user) return;
      setRefundsLoading(true);
      try {
        const [list, refunds] = await Promise.all([
          notificationApi.getByUser(user.id),
          refundApi.getByUser(user.id),
        ]);
        setRefundRecords(refunds);
        setRefundNotifications(list.filter((item) => item.type.toUpperCase().includes('REFUND')));
      } catch (error) {
        console.error(error);
        setRefundRecords([]);
        setRefundNotifications([]);
      } finally {
        setRefundsLoading(false);
      }
    };

    loadRefundNotifications();
  }, [user]);

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;

      setBookingsLoading(true);
      setBookingsError('');

      try {
        const list = await bookingApi.getByUser(user.id);
        const enriched = await Promise.all(
          list.map(async (booking) => {
            try {
              const roomIds = Array.from(new Set((booking.items || []).map((item) => String(item.roomId)).filter(Boolean)));
              const [rooms, guests] = await Promise.all([
                Promise.all(roomIds.map((roomId) => roomApi.getById(roomId).catch(() => null))),
                bookingApi.getGuests(booking.id).catch(() => []),
              ]);

              return { ...booking, room: rooms[0] || null, rooms: rooms.filter(Boolean) as Room[], guests };
            } catch {
              return { ...booking, room: null };
            }
          })
        );

        setBookings(enriched.filter(isPaidBookingRecord));
      } catch (error) {
        console.error(error);
        setBookings([]);
        setBookingsError('Không thể tải lịch sử đặt phòng.');
      } finally {
        setBookingsLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  const displayName = profileData.fullName || user?.fullName || user?.name || 'Khách hàng';
  const displayPhone = profileData.phone || user?.phoneNumber || user?.phone || 'Chưa cập nhật';
  const displayAddress = profileData.address || user?.address || 'Chưa cập nhật';
  const displayDob = profileData.dob || user?.dateOfBirth || 'Chưa cập nhật';
  const displayEmail = profileData.email || user?.email || '';

  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

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

  void mockBookings;

  const memberLevel = 'Gold';
  const profileBookings = bookings.map((booking) => {
    const nights = getNights(booking.checkIn, booking.checkOut);
    const amount = booking.totalPrice || ((booking.room?.price || 0) * nights);
    const roomName = booking.rooms?.length
      ? `${booking.rooms.length} phòng`
      : booking.room?.name || `Phòng ${booking.roomId}`;

    return {
      id: booking.id,
      roomId: booking.roomId,
      room: { name: roomName },
      date: `${booking.checkIn} - ${booking.checkOut}`,
      nights,
      status: booking.status === 'confirmed' || booking.status === 'checked_in' ? 'completed' : 'upcoming',
      statusLabel: getBookingStatusText(booking.status),
      statusClass: getBookingStatusClass(booking.status),
      amount,
    };
  });
  const totalNights = profileBookings.reduce((sum, booking) => sum + booking.nights, 0);
  const totalBookings = profileBookings.length;

  const tabs = [
    { key: 'profile', label: 'Thông tin cá nhân', icon: User },
    { key: 'bookings', label: 'Lịch sử đặt phòng', icon: Calendar },
    { key: 'refunds', label: 'Lịch sử hoàn tiền', icon: RefreshCcw },
    { key: 'security', label: 'Bảo mật tài khoản', icon: Shield },
  ];

  const formatNotificationTime = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-20">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-outline-variant/15 bg-inverse-surface p-8 sm:p-10 shadow-2xl"
        >
          <div className="absolute inset-0 [background:radial-gradient(1000px_600px_at_15%_15%,rgba(255,106,0,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <User size={240} className="text-white" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="relative">
               <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-linear-to-br from-primary to-primary-container flex items-center justify-center text-on-primary-container shadow-xl overflow-hidden">
                {profileData.imageUrl ? (
                  <img src={profileData.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-black tracking-tight">{displayInitials || 'U'}</span>
                )}
              </div>
               <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-50">
                  <Star size={20} className="text-secondary-fixed fill-secondary-fixed" />
               </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                <span className="px-3 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] tracking-[0.2em] font-black uppercase font-label shadow-sm">
                  {memberLevel} Status
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-headline">
                {displayName}
              </h1>
              <p className="text-white/60 text-base mt-1 font-medium">{displayEmail}</p>
              
              <div className="mt-8 flex flex-wrap justify-center sm:justify-start gap-10">
                <div>
                  <p className="text-3xl font-extrabold text-white font-headline tracking-tight">{totalNights}</p>
                  <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase mt-1 font-bold font-label">Đêm lưu trú</p>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block mt-2" />
                <div>
                  <p className="text-3xl font-extrabold text-white font-headline tracking-tight">{totalBookings}</p>
                  <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase mt-1 font-bold font-label">Đặt phòng</p>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block mt-2" />
                <div>
                  <p className="text-3xl font-extrabold text-white font-headline tracking-tight">1.2M</p>
                  <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase mt-1 font-bold font-label">Tích lũy (đ)</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="sm:self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-error/20 hover:border-error/30 hover:text-error transition-all duration-300 font-bold text-sm"
              title="Đăng xuất"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mt-12 flex flex-wrap gap-3">
          {tabs.map(({ key, label, icon: Icon }) => (
            key === 'bookings' ? (
              <Link
                key={key}
                to="/my-bookings"
                className="relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all duration-300 bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              >
                <Icon size={18} />
                {label}
              </Link>
            ) : (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={
                  'relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all duration-300 ' +
                  (activeTab === key
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest')
                }
              >
                <Icon size={18} />
                {label}
                {activeTab === key && (
                  <motion.div 
                     layoutId="activeTab"
                     className="absolute inset-0 bg-primary rounded-2xl -z-10"
                  />
                )}
              </button>
            )
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="mt-8"
          >
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-8 sm:p-10 border-outline-variant/10 shadow-xl overflow-visible">
                  <div className="flex items-center justify-between mb-8 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label">Thông tin cơ bản</div>
                      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-on-surface font-headline">Hồ sơ dùng cho thanh toán</h2>
                      <p className="mt-2 text-sm text-on-surface-variant font-medium">Dữ liệu này được đồng bộ sau đăng ký / đăng nhập và dùng cho booking, payment, hoàn tiền.</p>
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary-fixed-dim hover:text-primary transition-all group"
                      >
                        <Edit3 size={18} className="group-hover:rotate-12 transition-transform" /> 
                        Chỉnh sửa
                      </button>
                    )}
                  </div>

                  <div className="mb-10 rounded-3xl border border-outline-variant/10 bg-linear-to-br from-surface-container-high to-surface-container-low p-6">
                    <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
                          {profileData.imageUrl ? (
                            <img src={profileData.imageUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">Thông tin đồng bộ</div>
                          <div className="mt-1 text-xl font-black text-on-surface font-headline">{displayName}</div>
                          <div className="text-sm text-on-surface-variant font-medium">{displayEmail}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
                        {[
                          { label: 'Điện thoại', value: displayPhone },
                          { label: 'Ngày sinh', value: displayDob },
                          { label: 'Địa chỉ', value: displayAddress },
                          { label: 'Vai trò', value: user?.role || 'CUSTOMER' },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-2xl bg-white/70 border border-outline-variant/10 px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</div>
                            <div className="mt-1 text-sm font-bold text-on-surface wrap-break-word">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    <FieldRow
                      label="Họ và tên"
                      icon={User}
                      type="text"
                      value={profileData.fullName}
                      onChange={(v) => setProfileData({ ...profileData, fullName: v })}
                      disabled={!editing}
                    />
                    <FieldRow
                      label="Email (Không thể thay đổi)"
                      icon={Mail}
                      type="email"
                      value={profileData.email}
                      onChange={(v) => setProfileData({ ...profileData, email: v })}
                      disabled={true}
                    />
                    <FieldRow
                      label="Số điện thoại"
                      icon={Phone}
                      type="tel"
                      value={profileData.phone}
                      onChange={(v) => setProfileData({ ...profileData, phone: v })}
                      disabled={!editing}
                    />
                    <FieldRow
                      label="Địa chỉ"
                      icon={MapPin}
                      type="text"
                      value={profileData.address}
                      onChange={(v) => setProfileData({ ...profileData, address: v })}
                      disabled={!editing}
                    />
                    <div className="md:col-span-2">
                      <FieldRow
                        label="Ngày sinh"
                        icon={Calendar}
                        type="date"
                        value={profileData.dob}
                        onChange={(v) => setProfileData({ ...profileData, dob: v })}
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  {editing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row gap-4 mt-12"
                    >
                      <Button type="button" onClick={handleSave} className="px-8 py-3.5 rounded-xl font-bold flex-1 sm:flex-none">
                        Lưu thay đổi
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditing(false)} className="px-8 py-3.5 rounded-xl font-bold flex-1 sm:flex-none">
                        Hủy
                      </Button>
                    </motion.div>
                  )}
                  
                  {saved && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 flex items-center gap-2 text-primary-fixed-dim font-bold"
                    >
                      <Check size={20} /> Đã cập nhật thông tin thành công!
                    </motion.div>
                  )}
                </Card>

                <div className="space-y-8">
                  <motion.div variants={itemVariants}>
                    <Card className="p-8 overflow-hidden relative border-none shadow-2xl bg-linear-to-br from-[#ffb694] to-[#ff6a00] text-white">
                      <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                         <Star size={120} />
                      </div>
                      <div className="relative">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-black font-label">E-Membership</div>
                        <div className="mt-4 flex items-center gap-3">
                          <Star size={24} className="fill-white" />
                          <span className="text-3xl font-black tracking-tight font-headline">{memberLevel} Tier</span>
                        </div>
                        <p className="mt-3 text-sm text-white/80 font-medium leading-relaxed">Tích lũy thêm 8 đêm để nâng cấp lên hạng Platinum và nhận ưu đãi 20%.</p>
                        <div className="mt-6 h-2.5 rounded-full bg-black/10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '60%' }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full rounded-full bg-white shadow-sm" 
                          />
                        </div>
                        <p className="mt-3 text-xs text-white/70 font-bold tracking-widest uppercase">12 / 20 Đêm lưu trú</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-8 border-outline-variant/10 shadow-xl">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label mb-6">Thao tác nhanh</div>
                      <div className="space-y-2">
                        {[
                          { label: 'Tìm phòng nghỉ mới', href: '/rooms', icon: MapPin },
                          { label: 'Lịch sử thanh toán', href: '/my-bookings', icon: CreditCard },
                          { label: 'Cài đặt tài khoản', href: '#', icon: Settings },
                        ].map(({ label, href, icon: Icon }) => (
                          <Link
                            key={label}
                            to={href}
                            className="group flex items-center justify-between p-4 -mx-2 rounded-2xl hover:bg-surface-container-high transition-all"
                          >
                            <div className="flex items-center gap-4">
                               <div className="p-2 rounded-xl bg-surface-container-highest text-primary-fixed-dim group-hover:bg-primary group-hover:text-on-primary transition-all">
                                  <Icon size={18} />
                               </div>
                               <span className="font-bold text-on-surface group-hover:translate-x-1 transition-transform">{label}</span>
                            </div>
                            <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-all" />
                          </Link>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}


            {activeTab === 'refunds' && (
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-outline-variant/10 shadow-xl">
                  <div className="p-8 sm:p-10 border-b border-outline-variant/10 bg-surface-container-low">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label">Lịch sử hoàn tiền</div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-on-surface font-headline">Theo dõi hoàn tiền</h2>
                    <p className="mt-2 text-sm text-on-surface-variant font-medium">
                      Dữ liệu lấy từ yêu cầu hoàn tiền thật sau khi hủy phòng. Thông báo chỉ dùng để cập nhật trạng thái mới nhất.
                    </p>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {refundsLoading ? (
                      <div className="p-10 text-center">
                        <Spinner className="h-10 w-10" />
                        <div className="mt-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Đang tải lịch sử hoàn tiền...</div>
                      </div>
                    ) : refundRecords.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="text-lg font-black text-on-surface">Chưa có yêu cầu hoàn tiền nào</div>
                        <p className="mt-2 text-sm text-on-surface-variant">Khi bạn hủy đặt phòng và phát sinh số tiền được hoàn, lịch sử xử lý sẽ xuất hiện tại đây.</p>
                      </div>
                    ) : (
                      refundRecords.map((refund, idx) => {
                        const latestNotice = refundNotifications.find((item) => item.bookingId === refund.bookingId);
                        return (
                          <motion.div
                            key={refund.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="p-8 hover:bg-surface-container-lowest transition-colors"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                              <div className="flex gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                  <RefreshCcw size={24} />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-[10px] tracking-widest uppercase text-on-surface-variant font-black">Yêu cầu #{refund.id} · Đặt phòng #{refund.bookingId}</div>
                                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getRefundStatusClass(refund.status)}`}>
                                      {getRefundStatusText(refund.status)}
                                    </span>
                                  </div>
                                  <div className="mt-2 grid gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-high p-4 sm:grid-cols-3">
                                    <div>
                                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Đã thanh toán</div>
                                      <div className="mt-1 text-sm font-black text-on-surface">{formatCurrency(refund.paidAmount)}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Giữ lại / hao hụt</div>
                                      <div className="mt-1 text-sm font-black text-error">{formatCurrency(Math.max(0, Number(refund.paidAmount || 0) - Number(refund.refundAmount || 0)))}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sẽ hoàn</div>
                                      <div className="mt-1 text-sm font-black text-green-700">{formatCurrency(refund.refundAmount)}</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm text-on-surface-variant font-semibold">
                                    Phí hủy: {formatCurrency(refund.cancellationFee)} · Giao dịch gốc: {refund.paymentTransactionId || 'Chưa có mã giao dịch'}
                                  </div>
                                  <div className="mt-1 text-sm text-on-surface-variant">Lý do: {getRefundReasonText(refund.reason)}</div>
                                  {latestNotice && (
                                    <div className="mt-3 rounded-2xl bg-surface-container-high px-4 py-3 text-sm font-semibold text-on-surface">
                                      {latestNotice.message}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="lg:text-right shrink-0">
                                <div className="text-xs font-bold text-on-surface-variant">{formatNotificationTime(refund.createdAt)}</div>
                                {refund.dueAt && (
                                  <div className="mt-1 text-xs font-semibold text-on-surface-variant">Hạn xử lý: {formatNotificationTime(refund.dueAt)}</div>
                                )}
                                <Link
                                  to={`/my-bookings?bookingId=${encodeURIComponent(refund.bookingId)}`}
                                  className="mt-4 inline-flex text-[10px] font-black tracking-widest uppercase text-primary-fixed-dim hover:text-primary transition-colors underline decoration-2 underline-offset-4"
                                >
                                  Xem đặt phòng
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {false && (
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-outline-variant/10 shadow-xl">
                  <div className="p-8 sm:p-10 border-b border-outline-variant/10 bg-surface-container-low">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label">Lịch sử hoàn tiền</div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-on-surface font-headline">Theo dõi hoàn tiền</h2>
                    <p className="mt-2 text-sm text-on-surface-variant font-medium italic">Các cập nhật hoàn tiền sau khi hủy đặt phòng sẽ được lưu tại đây.</p>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {refundsLoading ? (
                      <div className="p-10 text-center">
                        <Spinner className="h-10 w-10" />
                        <div className="mt-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Đang tải lịch sử hoàn tiền...</div>
                      </div>
                    ) : refundNotifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="text-lg font-black text-on-surface">Chưa có yêu cầu hoàn tiền nào</div>
                        <p className="mt-2 text-sm text-on-surface-variant">Khi bạn hủy đặt phòng và có hoàn tiền, trạng thái xử lý sẽ xuất hiện ở đây.</p>
                      </div>
                    ) : (
                      refundNotifications.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-surface-container-lowest transition-colors"
                        >
                          <div className="flex gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                              <RefreshCcw size={24} />
                            </div>
                            <div>
                              <div className="text-[10px] tracking-widest uppercase text-on-surface-variant font-black">Đặt phòng #{item.bookingId}</div>
                              <div className="mt-1 text-base font-black text-on-surface">{item.message}</div>
                              <div className="mt-1 text-sm text-on-surface-variant font-bold">{formatNotificationTime(item.createdAt)}</div>
                            </div>
                          </div>
                          <Link
                            to={`/my-bookings?bookingId=${encodeURIComponent(item.bookingId)}`}
                            className="text-[10px] font-black tracking-widest uppercase text-primary-fixed-dim hover:text-primary transition-colors underline decoration-2 underline-offset-4"
                          >
                            Xem đặt phòng
                          </Link>
                        </motion.div>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 sm:p-10 border-outline-variant/10 shadow-xl">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label">Quyền riêng tư và bảo mật</div>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-on-surface font-headline">Cập nhật mật khẩu</h2>

                  <div className="mt-10 space-y-8">
                    {['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'].map((label) => (
                      <div key={label}>
                        <label className="block text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-3 font-bold font-label">{label}</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full py-4 px-5 rounded-xl bg-surface-container-highest/60 text-on-surface placeholder:text-on-surface-variant/40 outline-none border border-outline-variant/15 focus:border-primary-container/40 focus:ring-4 focus:ring-primary-container/10 transition-all font-medium"
                        />
                      </div>
                    ))}

                    <Button type="button" className="w-full py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-primary/10">
                      Cập nhật mật khẩu
                    </Button>
                    <p className="text-center text-xs text-on-surface-variant italic">Tính năng hiện đang trong quá trình nâng cấp hệ thống.</p>
                  </div>
                </Card>

                <div className="space-y-8">
                  <motion.div variants={itemVariants}>
                    <Card className="p-8 border-outline-variant/10 shadow-xl">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-black font-label mb-6">Device management</div>
                      <div className="divide-y divide-outline-variant/10">
                        {[
                          { label: 'Xác thực hai yếu tố (2FA)', value: 'Khuyên dùng', action: 'Kích hoạt', icon: Shield },
                          { label: 'Quản lý phiên đăng nhập', value: '2 thiết bị đang online', action: 'Xem tất cả', icon: User },
                        ].map(({ label, value, action, icon: Icon }) => (
                          <div key={label} className="flex items-center justify-between py-5 first:pt-0">
                            <div className="flex items-center gap-4">
                               <div className="p-2.5 rounded-xl bg-surface-container-high text-primary-fixed-dim">
                                  <Icon size={18} />
                               </div>
                               <div>
                                  <div className="font-bold text-on-surface">{label}</div>
                                  <div className="text-xs text-on-surface-variant mt-0.5">{value}</div>
                               </div>
                            </div>
                            <button type="button" className="text-[10px] font-black tracking-widest uppercase text-primary-fixed-dim hover:text-primary transition-colors underline decoration-2 underline-offset-4">
                              {action}
                            </button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-8 border-error/10 shadow-xl border-dashed">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-error font-black font-label mb-4">Danger Zone</div>
                      <p className="text-sm text-on-surface-variant mb-6 leading-relaxed font-medium">Việc đăng xuất khỏi tất cả thiết bị sẽ yêu cầu bạn phải đăng nhập lại trên mọi ứng dụng.</p>
                      <button type="button" className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-error/20 text-error font-bold hover:bg-error/5 transition-all">
                        <LogOut size={18} />
                        Đăng xuất mọi thiết bị
                      </button>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfilePage;
