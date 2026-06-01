import type { PaymentRecord } from '../../../services/api';
import type { Booking, BookingGuest, Room } from '../../../types';
import { formatDateDisplay } from '../../../shared/lib/date';
import { getBookingPaidAmount, getBookingStatusText } from '../utils/bookingHistory';

export type BookingWithRoom = Booking & {
  guestCount?: number;
  room?: Room | null;
  rooms?: Room[];
  bookingGuests?: BookingGuest[];
  payments?: PaymentRecord[];
  detailsLoaded?: boolean;
};

export const DEFAULT_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';

export const HOTEL_LOCATION_LABEL = 'Quận 1, TP. Hồ Chí Minh';

export const formatCurrency = (amount: number) => `${Number(amount || 0).toLocaleString('vi-VN')} VND`;

export const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có dữ liệu';
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

export const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

export const getLatestSuccessfulPayment = (booking: BookingWithRoom) => {
  const payments = booking.payments || [];
  const successful = payments.filter((payment) => payment.status.toUpperCase() === 'SUCCESS');
  const candidates = successful.length > 0 ? successful : payments;
  return [...candidates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
};

export const getDisplayPaidAmount = (booking: BookingWithRoom) => {
  const payments = booking.payments || [];
  const successful = payments.filter((payment) => payment.status.toUpperCase() === 'SUCCESS');
  if (successful.length > 0) {
    const totalPaid = successful.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
    if (totalPaid > 0) return totalPaid;
  }
  const payment = getLatestSuccessfulPayment(booking);
  return payment?.paidAmount || getBookingPaidAmount(booking);
};

export const getDisplayOrderReference = (booking: BookingWithRoom) => {
  const payment = getLatestSuccessfulPayment(booking);
  if (payment?.transactionId) return payment.transactionId;
  return booking.paymentTransactionId || `BOOKING-${booking.id}`;
};

export const getDisplayPaymentMethod = (booking: BookingWithRoom) => {
  const payment = getLatestSuccessfulPayment(booking);
  const method = (payment?.method || booking.paymentType || '').toUpperCase();
  if (method === 'VNPAY') return 'VNPay';
  if (method === 'MOMO') return 'MoMo';
  if (method === 'FULL') return 'Thanh toán toàn bộ';
  if (method === 'DEPOSIT') return 'Đặt cọc';
  if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
  if (method === 'CASH') return 'Tiền mặt';
  return payment?.method || booking.paymentType || 'Chưa có dữ liệu';
};

export const getBookingRooms = (booking: BookingWithRoom) => {
  const rooms = booking.rooms?.filter(Boolean) || [];
  if (rooms.length > 0) return rooms;
  if (booking.room) return [booking.room];
  return [];
};

export const getRoomDisplayName = (room?: Room | null) => {
  if (!room) return 'Hạng phòng đang cập nhật';
  return room.roomType?.type || room.name || `Phòng ${room.roomNumber || room.id}`;
};

export const getRoomLabel = (room?: Room | null) => {
  if (!room) return 'Phòng đang cập nhật';
  return `Phòng ${room.roomNumber || room.id}`;
};

export const getRoomHeroImage = (room?: Room | null) =>
  room?.roomType?.images?.find((image) => image.isThumbnail)?.imageUrl
  || room?.roomType?.images?.[0]?.imageUrl
  || DEFAULT_ROOM_IMAGE;

export const getBookingThumbnail = (booking: BookingWithRoom) => getRoomHeroImage(getBookingRooms(booking)[0]);

export const getBookingRoomTitles = (booking: BookingWithRoom) => {
  const titles = getBookingRooms(booking).map((room) => getRoomDisplayName(room));
  return titles.filter(Boolean);
};

export const getBookingRoomPreview = (booking: BookingWithRoom) => {
  const rooms = getBookingRooms(booking);
  const roomCount = rooms.length || Math.max(booking.items?.length || 0, booking.totalRooms || 0, booking.roomId ? 1 : 0);
  const titles = rooms.map((room) => {
    const roomNumber = room.roomNumber || room.id;
    return roomNumber ? `${getRoomDisplayName(room)} - Phong ${roomNumber}` : getRoomDisplayName(room);
  });
  return {
    count: roomCount,
    primary: titles.slice(0, 2),
    extraCount: Math.max(0, roomCount - 2),
  };
};

export const getBookingPrimaryGuest = (booking: BookingWithRoom) => {
  const guests = getBookingGuestRoster(booking);
  return guests.find((guest) => guest.primaryGuest) || guests.find((guest) => guest.checkInPerson) || guests[0] || null;
};

export const getBookingGuestNames = (booking: BookingWithRoom) => {
  return getBookingGuestRoster(booking).map((guest) => guest.fullName).filter(Boolean);
};

export const getBookingGuestRoster = (booking: BookingWithRoom, roomId?: string) => {
  const directGuests = booking.bookingGuests || [];
  const normalizedRoomId = roomId ? String(roomId) : '';
  const legacyRepresentative = booking.representativeName || booking.customerName;

  if (!normalizedRoomId) {
    if (directGuests.length > 0) return directGuests;
    const itemGuests = (booking.items || []).flatMap((item) => item.guests || []);
    if (itemGuests.length > 0) return itemGuests;
    if (legacyRepresentative) {
      return [{
        id: `${booking.id}-legacy-representative`,
        bookingId: booking.id,
        fullName: booking.representativeName || booking.customerName || 'Khách hàng đại diện',
        phone: booking.representativePhone,
        cccd: booking.representativeCccd,
        primaryGuest: true,
        checkInPerson: true,
      } as BookingGuest];
    }
    return [];
  }

  const directRoomGuests = directGuests.filter((guest) => {
    const guestRoomId = guest.bookingRoomId || guest.roomId;
    return guestRoomId ? String(guestRoomId) === normalizedRoomId : false;
  });

  if (directRoomGuests.length > 0) return directRoomGuests;

  const bookingItem = (booking.items || []).find((item) => String(item.id || '') === normalizedRoomId || String(item.roomId || '') === normalizedRoomId);
  if (bookingItem?.guests?.length) return bookingItem.guests;
  return [];
};

export const getRoomRepresentative = (booking: BookingWithRoom, roomId?: string) => {
  const guests = getBookingGuestRoster(booking, roomId);
  return guests.find((guest) => guest.primaryGuest)
    || guests.find((guest) => guest.checkInPerson)
    || guests.find((guest) => guest.role === 'REPRESENTATIVE')
    || guests[0]
    || null;
};

export const getBookingRepresentative = (booking: BookingWithRoom) => {
  const primaryGuest = getBookingPrimaryGuest(booking);
  return {
    name: primaryGuest?.fullName || booking.representativeName || booking.customerName || booking.bookingGuests?.[0]?.fullName || 'Khách hàng đại diện',
    phone: primaryGuest?.phone || booking.representativePhone || booking.bookingGuests?.[0]?.phone || 'Chưa có dữ liệu',
    email: primaryGuest?.email || booking.bookingGuests?.[0]?.email || 'Chưa có dữ liệu',
    dateOfBirth: formatDateDisplay(primaryGuest?.dateOfBirth || booking.bookingGuests?.[0]?.dateOfBirth),
  };
};

export const getDisplayBookingStatus = (booking: BookingWithRoom) => {
  const paymentStatus = booking.paymentStatus?.toUpperCase();
  if ((booking.status === 'booked' || booking.status === 'pending_payment' || booking.status === 'pending')
      && (paymentStatus === 'PAID' || paymentStatus === 'SUCCESS')) {
    return 'confirmed';
  }
  if ((booking.status === 'booked' || booking.status === 'pending_payment' || booking.status === 'pending')
      && (paymentStatus === 'DEPOSITED' || paymentStatus === 'PARTIAL')) {
    return 'deposit_paid';
  }
  if (booking.status && booking.status !== 'pending_payment' && booking.status !== 'pending') {
    return booking.status;
  }
  if (paymentStatus === 'PAID' || paymentStatus === 'SUCCESS') return 'confirmed';
  if (paymentStatus === 'DEPOSITED' || paymentStatus === 'PARTIAL') return 'deposit_paid';
  return booking.status;
};

export const getStatusTone = (status: Booking['status']) => {
  switch (status) {
    case 'confirmed':
      return {
        badge: 'border-emerald-300/60 bg-emerald-50 text-emerald-700',
        accent: 'bg-emerald-500',
      };
    case 'deposit_paid':
      return {
        badge: 'border-sky-300/60 bg-sky-50 text-sky-700',
        accent: 'bg-sky-500',
      };
    case 'checked_in':
      return {
        badge: 'border-indigo-300/60 bg-indigo-50 text-indigo-700',
        accent: 'bg-indigo-500',
      };
    case 'completed':
      return {
        badge: 'border-zinc-300/60 bg-zinc-100 text-zinc-700',
        accent: 'bg-zinc-500',
      };
    case 'cancelled':
      return {
        badge: 'border-rose-300/60 bg-rose-50 text-rose-700',
        accent: 'bg-rose-500',
      };
    case 'cancel_requested':
      return {
        badge: 'border-amber-300/60 bg-amber-50 text-amber-700',
        accent: 'bg-amber-500',
      };
    default:
      return {
        badge: 'border-slate-300/60 bg-slate-50 text-slate-700',
        accent: 'bg-slate-500',
      };
  }
};

export const getGuestsForRoom = (booking: BookingWithRoom, roomId?: string) => {
  if (!roomId) return getBookingGuestRoster(booking);
  return getBookingGuestRoster(booking, roomId);
};

export const getRoomPricing = (booking: BookingWithRoom, room?: Room | null) => {
  const bookingItem = booking.items?.find((item) => item.roomId === room?.id)
    || booking.items?.find((item) => String(item.roomId) === String(room?.id));
  const nights = Math.max(1, Number(bookingItem?.nights || 0) || getNights(booking.checkIn, booking.checkOut));
  const nightlyPrice = Number(bookingItem?.priceSnapshot || room?.roomType?.basePrice || room?.price || 0);
  const roomTotal = nightlyPrice * nights;
  const savedTotal = Number(bookingItem?.roomCharge || bookingItem?.finalPrice || bookingItem?.finalAmount || 0);
  const total = savedTotal >= roomTotal ? savedTotal : roomTotal;
  return { nightlyPrice, roomTotal, total, nights };
};

export const getRoomAmenityLabels = (room?: Room | null) => {
  if (!room) return [];
  const labels = (room.amenities || [])
    .filter((item) => item.isActive)
    .map((item) => item.amenity.name)
    .filter(Boolean);

  if (room.hasBalcony) labels.push('Balcony');
  if (room.hasBathtub) labels.push('Bathtub');
  if (room.smokingPolicy === 'NON_SMOKING') labels.push('Non-smoking');
  return Array.from(new Set(labels)).slice(0, 10);
};

export const getRoomStatusText = (booking: BookingWithRoom) => {
  const status = getDisplayBookingStatus(booking);
  switch (status) {
    case 'checked_in':
      return 'Đã check-in';
    case 'completed':
      return 'Đã check-out';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Chưa sử dụng';
  }
};

export const getRemainingAmount = (booking: BookingWithRoom) =>
  Math.max(0, Number(booking.totalPrice || 0) - Number(getDisplayPaidAmount(booking) || 0));

export const getCancellationPolicySummary = (booking: BookingWithRoom) => {
  if (booking.ratePlan === 'NON_REFUNDABLE') {
    return 'Gói không hoàn tiền. Hủy phòng sẽ áp dụng mức phí cao nhất theo chính sách.';
  }
  return 'Gói linh hoạt. Mức hoàn tiền sẽ được tính theo thời điểm hủy trước check-in.';
};

export const getSpecialRequestText = (booking: BookingWithRoom) =>
  booking.notes?.trim() || 'Không có yêu cầu đặc biệt.';

export const getRoomMetaLine = (room?: Room | null) => {
  if (!room) return 'Thông tin phòng đang được đồng bộ';
  const parts = [
    room.viewType,
    room.areaM2 ? `${room.areaM2} m2` : '',
    room.floorNumber ? `Tầng ${room.floorNumber}` : '',
    room.maxCapacity ? `${room.maxCapacity} khách` : '',
  ].filter(Boolean);
  return parts.join(' · ');
};

export const getPaymentSummaryRows = (booking: BookingWithRoom) => [
  { label: 'Tổng tiền booking', value: formatCurrency(booking.totalPrice || 0) },
  { label: 'Đã thanh toán', value: formatCurrency(getDisplayPaidAmount(booking)) },
  { label: 'Còn lại', value: formatCurrency(getRemainingAmount(booking)) },
  { label: 'Phương thức', value: getDisplayPaymentMethod(booking) },
  { label: 'Mã giao dịch', value: getDisplayOrderReference(booking) },
];

export const getBookingStatusLabel = (booking: BookingWithRoom) =>
  getBookingStatusText(getDisplayBookingStatus(booking));
