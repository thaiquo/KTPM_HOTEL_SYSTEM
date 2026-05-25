import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineChartBar,
  HiOutlineClipboardCheck,
  HiOutlineFilter,
  HiOutlineIdentification,
  HiOutlinePhone,
  HiOutlineSearch,
  HiOutlineUserGroup,
  HiX,
} from 'react-icons/hi';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { staffBookingApi, userApi, vietnamTodayISO, type CheckInOutStats } from '../../../services/api';
import { roomApi } from '../../../services/roomApi';
import type { Booking, BookingGuest, Room } from '../../../types';

type BookingRow = Booking & {
  room?: Room;
  roomList?: Room[];
  guestList?: BookingGuest[];
  remainingAmount: number;
};
type CheckInTab = 'OVERDUE' | 'TODAY' | 'DONE';
type ApiErrorLike = { response?: { status?: number; data?: { message?: string } }; message?: string };

const ADULT_AGE = 18;

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;
const isValidCccd = (value: string | undefined) => /^\d{12}$/.test((value || '').trim());
const isValidPhone = (value: string | undefined) => /^\d{10}$/.test((value || '').trim());
const isValidRoomId = (value: unknown): value is string | number => {
  if (value == null) return false;
  const normalized = String(value).trim();
  return Boolean(normalized) && normalized !== 'undefined' && normalized !== 'null' && normalized !== 'NaN';
};

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
};

const isAdultGuest = (guest?: BookingGuest | null) =>
  Boolean(guest && (guest.type === 'ADULT' || calculateAge(guest.dateOfBirth) >= ADULT_AGE));

const getBookingNights = (booking: Booking) => {
  const itemNights = booking.items?.[0]?.nights;
  if (itemNights && itemNights > 0) return itemNights;
  const diff = Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff || 1);
};

const getBookingRoomIds = (booking: Booking) => {
  const roomIds = (booking.items || [])
    .map((item) => item.roomId)
    .filter(isValidRoomId)
    .map((roomId) => String(roomId));
  if (roomIds.length > 0) {
    return Array.from(new Set(roomIds));
  }
  return isValidRoomId(booking.roomId) ? [String(booking.roomId)] : [];
};

const getBookingOneNightPrice = (booking: Booking) => {
  const itemTotal = (booking.items || []).reduce((sum, item) => sum + Number(item.priceSnapshot || item.finalPrice || 0), 0);
  if (itemTotal > 0) return itemTotal;
  const totalPrice = Number(booking.totalPrice || 0);
  return totalPrice > 0 ? totalPrice / getBookingNights(booking) : 0;
};

const getEarlyCheckInSurchargePreview = (booking?: Booking | null) => {
  if (!booking) return 0;
  const now = new Date();
  const checkInDate = new Date(booking.checkIn);
  const sameDate = now.getFullYear() === checkInDate.getFullYear()
    && now.getMonth() === checkInDate.getMonth()
    && now.getDate() === checkInDate.getDate();
  if (!sameDate || now.getHours() >= 12) return 0;
  return getBookingOneNightPrice(booking) * 0.5;
};

const getRoomDetails = (room: Room) => {
  const details = [
    room.roomType?.type ? `Loai: ${room.roomType.type}` : undefined,
    room.floorLevel ? `Tang: ${room.floorLevel}` : room.floorNumber != null ? `Tang: ${room.floorNumber}` : undefined,
    room.maxCapacity ? `Suc chua: ${room.maxCapacity} khach` : undefined,
    room.areaM2 ? `Dien tich: ${room.areaM2} m2` : undefined,
    room.viewType ? `Huong: ${room.viewType}` : undefined,
    room.status ? `Trang thai: ${room.status}` : undefined,
  ].filter(Boolean);
  return details.join(' • ');
};

const getRoomStatusForBooking = (booking: BookingRow, room: Room) => {
  const status = String(booking.status || '').toLowerCase();
  if (status === 'checked_in') return 'OCCUPIED';
  if (status === 'completed' || status === 'checked_out') return 'CLEANING';
  if (status === 'confirmed' || status === 'deposit_paid') return 'RESERVED';
  return room.status || 'UNKNOWN';
};

const StaffCheckInPage: React.FC = () => {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CheckInTab>('TODAY');
  const [statsDate, setStatsDate] = useState(vietnamTodayISO());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [stats, setStats] = useState<CheckInOutStats | null>(null);
  const [showStatsFilter, setShowStatsFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [cccdByBooking, setCccdByBooking] = useState<Record<string, string>>({});
  const [representativeByBooking, setRepresentativeByBooking] = useState<Record<string, string>>({});
  const [phoneByBooking, setPhoneByBooking] = useState<Record<string, string>>({});
  const [userNameByBooking, setUserNameByBooking] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const hydrateBookingRow = React.useCallback(async (booking: Booking): Promise<BookingRow> => {
    const freshBooking = await staffBookingApi.getBooking(booking.id).catch(() => booking);
    const roomIds = getBookingRoomIds(freshBooking);
    const [guests, roomEntries] = await Promise.all([
      staffBookingApi.getGuests(freshBooking.id).catch(() => []),
      Promise.all(
        roomIds.map(async (roomId) => [roomId, await roomApi.getById(roomId).catch(() => undefined)] as const),
      ),
    ]);
    const roomById = new Map(roomEntries.filter((entry): entry is readonly [string, Room] => Boolean(entry[1])));
    const roomList = roomIds.map((roomId) => roomById.get(roomId)).filter((room): room is Room => Boolean(room));
    const totalPrice = freshBooking.totalPrice || 0;
    const paidAmount = Math.min(totalPrice, freshBooking.paidAmount || 0);

    return {
      ...freshBooking,
      room: roomList[0],
      roomList,
      guestList: guests,
      remainingAmount: Math.max(0, totalPrice - paidAmount),
      paidAmount,
    };
  }, []);

  const canSubmitCheckIn = (booking?: BookingRow | null) =>
    Boolean(booking && (booking.status === 'confirmed' || booking.status === 'deposit_paid'));

  const getSelectedRepresentative = (booking: BookingRow) => {
    const selectedId = representativeByBooking[booking.id];
    return booking.guestList?.find((guest) => guest.id === selectedId && isAdultGuest(guest));
  };

  const getRepresentativePhone = (booking: BookingRow) => {
    const selected = getSelectedRepresentative(booking);
    return (phoneByBooking[booking.id] || selected?.phone || '').trim();
  };

  const getCheckInValidationErrors = (booking?: BookingRow | null) => {
    if (!booking) return ['Chua chon booking can check-in'];
    const errors: string[] = [];
    const representative = getSelectedRepresentative(booking);
    const phone = getRepresentativePhone(booking);
    const cccd = cccdByBooking[booking.id]?.trim();

    if (!canSubmitCheckIn(booking)) {
      errors.push('Booking phai o trang thai da xac nhan hoac da dat coc moi duoc check-in.');
    }
    if (!representative) {
      errors.push('Can chon nguoi dai dien co trong danh sach khach luu tru va du 18 tuoi.');
    }
    if (!isValidPhone(phone)) {
      errors.push('So dien thoai nguoi dai dien phai gom dung 10 chu so.');
    }
    if (!isValidCccd(cccd)) {
      errors.push('CCCD nguoi dai dien phai gom dung 12 chu so.');
    }

    return errors;
  };

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryDate = (activeTab === 'TODAY' || !showAllHistory) ? statsDate : undefined;

      const getListPromise = () => {
        switch (activeTab) {
          case 'TODAY':
            return staffBookingApi.getTodayCheckInList(queryDate);
          case 'OVERDUE':
            return staffBookingApi.getTodayCheckInList(queryDate);
          case 'DONE':
            return staffBookingApi.getAlreadyCheckedInTodayList(queryDate);
          default:
            return staffBookingApi.getCheckInList();
        }
      };

      const [rawBookings, todayStats] = await Promise.all([
        getListPromise(),
        staffBookingApi.getTodayStats(statsDate).catch(() => null),
      ]);

      setStats(todayStats);

      const allRoomIds = Array.from(new Set(rawBookings.flatMap(getBookingRoomIds)));
      const roomEntries = await Promise.all(
        allRoomIds.map(async (roomId) => [roomId, await roomApi.getById(roomId).catch(() => undefined)] as const),
      );
      const roomById = new Map(roomEntries.filter((entry): entry is readonly [string, Room] => Boolean(entry[1])));

      const enriched = await Promise.all(
        rawBookings.map(async (booking) => {
          const roomIds = getBookingRoomIds(booking);
          const guests = await staffBookingApi.getGuests(booking.id).catch(() => []);
          const roomList = roomIds.map((roomId) => roomById.get(roomId)).filter((room): room is Room => Boolean(room));
          const totalPrice = booking.totalPrice || 0;
          const paidAmount = Math.min(totalPrice, booking.paidAmount || 0);
          return {
            ...booking,
            room: roomList[0],
            roomList,
            guestList: guests,
            remainingAmount: Math.max(0, totalPrice - paidAmount),
            paidAmount,
          } as BookingRow;
        }),
      );

      const userNames = new Map<string, string>();
      const uniqueUserIds = Array.from(new Set(enriched.map((booking) => String(booking.userId)).filter(Boolean)));
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const booking = enriched.find((item) => String(item.userId) === userId);
          if (!booking) return;
          try {
            const userResponse = await userApi.getUserById(userId);
            let userName = '';
            if (userResponse.data?.data?.name) userName = userResponse.data.data.name;
            else if (userResponse.data?.data?.fullName) userName = userResponse.data.data.fullName;
            else if (userResponse.data?.name) userName = userResponse.data.name;
            else if (userResponse.data?.fullName) userName = userResponse.data.fullName;
            userNames.set(booking.id, userName.trim() ? userName : `User #${booking.userId}`);
          } catch {
            userNames.set(booking.id, `User #${booking.userId}`);
          }
        }),
      );
      setUserNameByBooking(Object.fromEntries(userNames));

      setRepresentativeByBooking((prev) => {
        const next = { ...prev };
        enriched.forEach((booking) => {
          const selected = booking.guestList?.find((guest) => guest.checkInPerson && isAdultGuest(guest))
            || booking.guestList?.find((guest) => guest.primaryGuest && isAdultGuest(guest))
            || booking.guestList?.find((guest) => isAdultGuest(guest));
          if (selected && !next[booking.id]) next[booking.id] = selected.id;
        });
        return next;
      });

      setItems(enriched);
    } catch (error: unknown) {
      console.error('Fetch data error:', error);
      toast.error('Khong the tai du lieu');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statsDate, showAllHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCheckInFlow = async (booking: BookingRow, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    const currentRepId = representativeByBooking[booking.id];
    if (!currentRepId) {
      const selected = booking.guestList?.find((guest) => guest.checkInPerson && isAdultGuest(guest))
        || booking.guestList?.find((guest) => guest.primaryGuest && isAdultGuest(guest))
        || booking.guestList?.find((guest) => isAdultGuest(guest));
      if (selected) {
        setRepresentativeByBooking((prev) => ({ ...prev, [booking.id]: selected.id }));
        setPhoneByBooking((prev) => ({ ...prev, [booking.id]: selected.phone || '' }));
        setCccdByBooking((prev) => ({ ...prev, [booking.id]: selected.cccd || '' }));
      }
    }

    setSelectedBooking(booking);
    try {
      const hydratedBooking = await hydrateBookingRow(booking);
      setSelectedBooking((current) => (current?.id === hydratedBooking.id ? hydratedBooking : current));
    } catch (error) {
      console.error('Hydrate booking for check-in failed:', error);
    }
  };

  const doCheckIn = async (booking: BookingRow) => {
    try {
      setProcessing(true);
      const representative = getSelectedRepresentative(booking);
      const repCccd = (cccdByBooking[booking.id] || representative?.cccd || '').trim();
      const repPhone = getRepresentativePhone(booking);
      const validationErrors = getCheckInValidationErrors(booking);

      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      await staffBookingApi.checkInWithRepresentative(booking.id, {
        representativeGuestId: representative.id,
        representativeCccd: repCccd,
        representativePhone: repPhone,
      });
      const earlyCheckInSurcharge = getEarlyCheckInSurchargePreview(booking);
      toast.success(
        earlyCheckInSurcharge > 0
          ? `Check-in thanh cong booking #${booking.id}. Da them phu thu som ${formatCurrency(earlyCheckInSurcharge)}`
          : `Check-in thanh cong booking #${booking.id}`,
      );
      setSelectedBooking(null);
      await fetchData();
    } catch (err: unknown) {
      const error = err as ApiErrorLike;
      toast.error(error.response?.data?.message || error.message || 'Check-in that bai');
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((booking) =>
      [
        `${booking.id}`,
        booking.room?.roomNumber,
        booking.room?.name,
        booking.roomList?.map((room) => room.roomNumber).join(' '),
        booking.userId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [items, searchTerm]);

  const selectedBookingReady = canSubmitCheckIn(selectedBooking);
  const selectedBookingReadOnly = activeTab === 'DONE';
  const earlyCheckInSurcharge = getEarlyCheckInSurchargePreview(selectedBooking);
  const selectedRooms = selectedBooking?.roomList?.length
    ? selectedBooking.roomList
    : selectedBooking?.roomId
      ? [{ id: selectedBooking.roomId, roomNumber: selectedBooking.roomId } as Room]
      : [];
  const checkInValidationErrors = getCheckInValidationErrors(selectedBooking);

  return (
    <div className="animate-in space-y-6 fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xu ly Check-in</h1>
        <p className="mt-1 text-sm text-gray-500">
          Xu ly nhan phong cho khach den dung han hoac den tre. Neu nhan phong truoc 12:00, booking se duoc them phu thu 50% gia 1 dem.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <HiOutlineFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as CheckInTab)}
            className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-10 text-sm font-bold text-gray-700 shadow-sm transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="TODAY">Check-in hom nay</option>
            <option value="OVERDUE">Het han check-in</option>
            <option value="DONE">Da check-in</option>
          </select>
        </div>
        <button
          onClick={() => setShowStatsFilter(!showStatsFilter)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50"
        >
          <HiOutlineChartBar className="h-4 w-4" /> Bo loc & Thong ke
        </button>
      </div>

      <AnimatePresence>
        {stats && showStatsFilter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-400">Tong check-in du kien</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{stats.totalCheckInToday}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-400">Da check-in</div>
                <div className="mt-1 text-2xl font-black text-emerald-600">{stats.alreadyCheckedIn}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-400">Chua check-in</div>
                <div className="mt-1 text-2xl font-black text-rose-600">{stats.notYetCheckedIn}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-400">Dang don dep</div>
                <div className="mt-1 text-2xl font-black text-cyan-600">{stats.inCleaningNow}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-50 p-6">
          <div className="relative max-w-md">
            <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tim booking, phong, khach..."
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-2 pl-11 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Dang tai booking...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Khong co booking nao trong danh sach nay</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">Booking / Nguoi dat</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">Phong</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">Luu tru</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">Thanh toan</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase text-gray-400">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((booking) => (
                  <tr
                    key={booking.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50/40"
                    onClick={() => openCheckInFlow(booking)}
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                            <HiOutlineClipboardCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">#Booking {booking.id}</div>
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-semibold text-gray-400">Tai khoan:</span>{' '}
                              <span className="font-bold text-gray-900">{userNameByBooking[booking.id] || `User #${booking.userId}`}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {booking.totalRooms || booking.roomList?.length || 1} phong
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {booking.roomList?.map((room) => room.roomNumber).join(', ') || booking.roomId || 'Chua co phong'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-medium text-gray-700">
                        {new Date(booking.checkIn).toLocaleDateString('vi-VN')} → {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalPrice)}</div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCheckInFlow(booking, e);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                      >
                        {activeTab === 'DONE' ? 'Xem chi tiet' : 'Xu ly Check-in'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 px-4 py-6 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 md:px-8">
                <div className="space-y-2">
                  <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                    <HiOutlineClipboardCheck className="h-6 w-6 text-sky-600" />
                    {selectedBookingReadOnly ? 'Chi tiet booking da check-in' : 'Chi tiet Check-in'} #{selectedBooking.id}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedBookingReadOnly
                      ? 'Xem thong tin booking, danh sach phong va khach luu tru da nhan phong.'
                      : 'Xac nhan nguoi dai dien, kiem tra phong va ap phu thu 50% gia 1 dem neu nhan phong truoc 12:00.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <HiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8">
                <div className="space-y-5">
                  <section className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4 lg:col-span-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-600">Booking</div>
                      <div className="mt-2 text-lg font-black text-gray-900">
                        {userNameByBooking[selectedBooking.id] || `User #${selectedBooking.userId}`}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-sky-800">
                        <span className="rounded-full bg-white px-3 py-1 font-bold shadow-sm">{selectedRooms.length || 1} phong</span>
                        <span className="rounded-full bg-white px-3 py-1 font-bold shadow-sm">{getBookingNights(selectedBooking)} dem</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Luu tru</div>
                      <div className="mt-2 text-sm font-bold text-gray-900">{new Date(selectedBooking.checkIn).toLocaleDateString('vi-VN')}</div>
                      <div className="text-xs text-gray-500">→ {new Date(selectedBooking.checkOut).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Tong tien</div>
                      <div className="mt-2 text-sm font-black text-gray-900">{formatCurrency(selectedBooking.totalPrice)}</div>
                      <div className="text-xs text-gray-500">
                        {selectedRooms.map((room) => room.roomNumber).join(', ') || selectedBooking.roomId || 'Chua co phong'}
                      </div>
                    </div>
                  </section>

                  {earlyCheckInSurcharge > 0 && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold text-amber-900">Phu thu check-in som</div>
                          <div className="text-xs text-amber-800">Nhan phong truoc 12:00 se tinh them 50% gia 1 dem cho booking nay.</div>
                        </div>
                        <div className="text-base font-black text-amber-900">{formatCurrency(earlyCheckInSurcharge)}</div>
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <HiOutlineClipboardCheck className="h-4 w-4" /> Danh sach phong luu tru
                    </h3>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {selectedRooms.map((room) => (
                        <div key={room.id} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-black text-gray-900">Phong {room.roomNumber}</div>
                              <div className="mt-1 text-[11px] font-semibold text-gray-500">{getRoomDetails(room) || 'Chua co chi tiet phong'}</div>
                            </div>
                            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700">
                              {getRoomStatusForBooking(selectedBooking, room)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr,0.9fr]">
                    <section className="rounded-2xl border border-gray-100 bg-white p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <HiOutlineUserGroup className="h-4 w-4" /> Danh sach khach luu tru
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {selectedBooking.guestList?.map((guest) => (
                          <div key={guest.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <div>
                              <div className="text-sm font-bold text-gray-800">{guest.fullName}</div>
                              <div className="text-[11px] text-gray-500">
                                {guest.type === 'ADULT' ? 'Nguoi lon' : 'Tre em'}
                                {guest.phone ? ` • ${guest.phone}` : ''}
                              </div>
                            </div>
                            {guest.checkInPerson && (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
                                Mac dinh
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {!selectedBookingReadOnly && (
                    <section className="rounded-2xl border border-gray-100 bg-white p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <HiOutlineIdentification className="h-4 w-4" /> Nguoi dai dien check-in
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-600">Chon nguoi check-in (du 18 tuoi)</label>
                          <select
                            value={representativeByBooking[selectedBooking.id] || ''}
                            onChange={(event) => {
                              const guest = selectedBooking.guestList?.find((item) => item.id === event.target.value);
                              setRepresentativeByBooking({ ...representativeByBooking, [selectedBooking.id]: event.target.value });
                              setPhoneByBooking({ ...phoneByBooking, [selectedBooking.id]: guest?.phone || '' });
                              setCccdByBooking({ ...cccdByBooking, [selectedBooking.id]: guest?.cccd || '' });
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          >
                            <option value="">-- Chon dai dien --</option>
                            {selectedBooking.guestList?.filter((guest) => isAdultGuest(guest)).map((guest) => (
                              <option key={guest.id} value={guest.id}>{guest.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">So dien thoai</label>
                            <div className="relative">
                              <HiOutlinePhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <input
                                value={phoneByBooking[selectedBooking.id] ?? getSelectedRepresentative(selectedBooking)?.phone ?? ''}
                                onChange={(event) => setPhoneByBooking({ ...phoneByBooking, [selectedBooking.id]: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                                placeholder="Nhap SDT (10 so)"
                                inputMode="numeric"
                                maxLength={10}
                                className={`w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${getRepresentativePhone(selectedBooking) && !isValidPhone(getRepresentativePhone(selectedBooking)) ? 'border-rose-300 bg-rose-50 focus:border-rose-500' : 'border-gray-200 bg-white focus:border-sky-500'}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">So CCCD (12 so)</label>
                            <div className="relative">
                              <HiOutlineIdentification className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <input
                                value={cccdByBooking[selectedBooking.id] || ''}
                                onChange={(event) => setCccdByBooking({ ...cccdByBooking, [selectedBooking.id]: event.target.value.replace(/\D/g, '').slice(0, 12) })}
                                placeholder="CCCD"
                                inputMode="numeric"
                                maxLength={12}
                                className={`w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${cccdByBooking[selectedBooking.id] && !isValidCccd(cccdByBooking[selectedBooking.id]) ? 'border-rose-300 bg-rose-50 focus:border-rose-500' : 'border-gray-200 bg-white focus:border-sky-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 bg-white px-6 py-4 md:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className={`text-xs ${!selectedBookingReadOnly && checkInValidationErrors.length > 0 ? 'font-semibold text-rose-600' : 'text-gray-500'}`}>
                    {selectedBookingReadOnly ? 'Booking da check-in. Chi xem thong tin, khong cap nhat lai trang thai.' : (checkInValidationErrors[0] || 'Thong tin da san sang de xac nhan check-in.')}
                  </div>
                  <div className="flex gap-3 self-end">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(null)}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
                    >
                      Huy bo
                    </button>
                    {!selectedBookingReadOnly && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => doCheckIn(selectedBooking)}
                        className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processing ? 'Dang xu ly...' : !selectedBookingReady ? 'Booking chua san sang' : 'Xac nhan Check-in'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffCheckInPage;
