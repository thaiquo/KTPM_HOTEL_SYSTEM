import axios from 'axios';
import type { Room, Booking, BookingGuest, User, UserProfile, SearchFilters } from '../types';

export interface EmployeeBackend {
  id: number;
  email: string;
  phoneNumber: string;
  name: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  role: string;
  active?: boolean;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  active?: boolean;
}

export interface UpdateEmployeePayload {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  active?: boolean;
}

type RoomBackend = {
  id: number;
  roomNumber: string;
  roomType: {
    id: number;
    type: string;
    basePrice: number;
    maxCapacity: number;
    defaultCapacity: number;
    description: string;
    images: { imageUrl: string; isThumbnail: boolean }[];
  };
  status: string;
  floor: number;
  beds: { type: string; quantity: number }[];
  note?: string;
  actualCapacity: number;
};

type BookingBackend = {
  id?: number | string;
  roomId?: number | string;
  userId?: number | string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  createdAt?: string;
  finalTotal?: number;
  depositAmount?: number;
  paidAmount?: number;
  ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE';
  paymentType?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
};

type BookingGuestBackend = {
  id?: number | string;
  bookingId?: number | string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  cccd?: string;
  note?: string;
  type?: string;
  primaryGuest?: boolean;
  checkInPerson?: boolean;
};

type PaymentBackend = {
  id?: number | string;
  bookingId?: number | string;
  userId?: number | string;
  totalAmount?: number;
  paidAmount?: number;
  amount?: number;
  paymentType?: string;
  method?: string;
  status?: string;
  invoiceCategory?: 'CHECKIN' | 'CHECKOUT' | 'REFUND';
  transactionId?: string;
  vnpTransactionNo?: string;
  vnpResponseCode?: string;
  createdAt?: string;
};

type CheckinQrBackend = {
  paymentCode?: string;
  amount?: number;
  confirmUrl?: string;
  expiredAt?: string;
  paymentType?: string;
  invoiceCategory?: string;
};

type NotificationBackend = {
  id?: number | string;
  bookingId?: number | string;
  userId?: number | string;
  type?: string;
  message?: string;
  createdAt?: string;
};

type RefundBackend = {
  id?: number | string;
  bookingId?: number | string;
  paymentTransactionId?: string;
  paidAmount?: number;
  cancellationFee?: number;
  refundAmount?: number;
  refundMethod?: string;
  amount?: number;
  status?: string;
  reason?: string;
  processedBy?: string;
  assignedTo?: number | string;
  dueAt?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentRecord = {
  id: string;
  bookingId: string;
  userId: string;
  totalAmount: number;
  paidAmount: number;
  amount: number;
  paymentType: string;
  method: string;
  status: string;
  invoiceCategory?: 'CHECKIN' | 'CHECKOUT' | 'REFUND';
  transactionId: string;
  vnpTransactionNo?: string;
  vnpResponseCode?: string;
  createdAt: string;
};

export type CheckinQrPayment = {
  paymentCode: string;
  amount: number;
  confirmUrl: string;
  expiredAt: string;
  paymentType?: string;
  invoiceCategory?: string;
};

export type CheckinPaymentStatus = {
  paymentCode: string;
  bookingId: string;
  bookingCode: string;
  amount: number;
  status: string;
  paymentType?: string;
  invoiceCategory?: string;
};

export type UserNotification = {
  id: string;
  bookingId: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
};

export type RefundRecord = {
  id: string;
  bookingId: string;
  paymentTransactionId: string;
  paidAmount: number;
  cancellationFee: number;
  refundAmount: number;
  refundMethod: string;
  amount: number;
  status: string;
  reason: string;
  processedBy: string;
  assignedTo: string;
  dueAt: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingGuestPayload = {
  fullName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  primary?: boolean;
  checkInPerson?: boolean;
};

export type CreateBookingPayload = {
  roomId: number;
  userId: number;
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  paymentType?: PaymentType;
  ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE';
  guestCount: number;
  roomCapacitySnapshot?: number;
  primaryGuest: BookingGuestPayload;
  guests: BookingGuestPayload[];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_BOOKING_API_URL || '/booking-api',
  timeout: 30000, // 30s timeout for stability
  headers: {
    'Content-Type': 'application/json',
  },
});

const authHttp = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/auth-api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const userHttp = axios.create({
  baseURL: import.meta.env.VITE_USER_API_URL || '/user-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const roomHttp = axios.create({
  baseURL: import.meta.env.VITE_ROOM_API_URL || '/room-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const paymentHttp = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL || '/payment-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const notificationHttp = axios.create({
  baseURL: import.meta.env.VITE_NOTIFICATION_API_URL || '/notification-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const authResourceHttp = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/auth-api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem('token');
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('token');
  },
};

const attachAuthInterceptors = (client: typeof api) => {
  client.interceptors.request.use(
    (config) => {
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
          tokenStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          const refreshed = await authHttp.post<{ accessToken: string; refreshToken: string }>(
            '/auth/refresh',
            { refreshToken }
          );

          tokenStorage.setTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${refreshed.data.accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          tokenStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

const mapRoom = (room: RoomBackend): Room => {
  return {
    id: String(room.id),
    name: `${room.roomType.type} ${room.roomNumber ? `- ${room.roomNumber}` : ''}`.trim(),
    roomNumber: room.roomNumber,
    type: room.roomType.type,
    price: room.roomType.basePrice,
    maxGuests: room.actualCapacity || room.roomType.maxCapacity,
    images: room.roomType.images?.map(img => img.imageUrl) || [],
    amenities: [],
    description: room.roomType.description,
    available: room.status === 'AVAILABLE',
    status: room.status,
    floor: room.floor,
    bedType: room.beds?.map(b => `${b.quantity} ${b.type}`).join(', ') || 'Chưa cấu hình',
  };
};

const mapBooking = (booking: BookingBackend): Booking => {
  const rawStatus = String(booking.status || 'pending_payment').toLowerCase();
  const status = ([
    'pending_payment', 'pending', 'deposit_paid', 'confirmed',
    'checked_in', 'checkout_pending_payment', 'checked_out', 'completed', 'cancel_requested', 'cancelled', 'no_show'
  ].includes(rawStatus) ? rawStatus : 'pending_payment') as Booking['status'];

  return {
    id: String(booking.id ?? ''),
    roomId: String(booking.roomId ?? ''),
    userId: String(booking.userId ?? ''),
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    totalPrice: Number(booking.finalTotal || 0),
    status,
    guests: 0,
    rooms: 0,
    createdAt: booking.createdAt || '',
    ratePlan: booking.ratePlan,
    paymentType: booking.paymentType,
    paymentStatus: booking.paymentStatus,
    paidAmount: Number(booking.paidAmount || 0),
    depositAmount: Number(booking.depositAmount || 0),
    paymentTransactionId: booking.paymentTransactionId,
    cancelledAt: booking.cancelledAt,
    cancellationReason: booking.cancellationReason,
    actualCheckInAt: booking.actualCheckInAt,
    actualCheckOutAt: booking.actualCheckOutAt,
  };
};

const extractRoomList = (payload: unknown): Room[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapRoom(item as RoomBackend));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: RoomBackend[] }).data.map((item) => mapRoom(item));
  }

  return [];
};

const extractSingleRoom = (payload: unknown): Room => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return mapRoom((payload as { data: RoomBackend }).data);
  }
  return mapRoom(payload as RoomBackend);
};

const extractBookingList = (payload: unknown): Booking[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapBooking(item as BookingBackend));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: BookingBackend[] }).data.map((item) => mapBooking(item));
  }

  return [];
};

const extractSingleBooking = (payload: unknown): Booking => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return mapBooking((payload as { data: BookingBackend }).data);
  }
  return mapBooking(payload as BookingBackend);
};

attachAuthInterceptors(api);
attachAuthInterceptors(userHttp);
attachAuthInterceptors(authResourceHttp);
attachAuthInterceptors(roomHttp);
attachAuthInterceptors(paymentHttp);
attachAuthInterceptors(notificationHttp);

// Room APIs
export const roomApi = {
  getAll: async (filters?: SearchFilters): Promise<Room[]> => {
    const response = await roomHttp.get<unknown>('/rooms', { params: filters });
    return extractRoomList(response.data);
  },

  getById: async (id: string): Promise<Room> => {
    const response = await roomHttp.get<unknown>(`/rooms/${id}`);
    return extractSingleRoom(response.data);
  },

  getAvailableRooms: async (roomTypeId: string, checkIn: string, checkOut: string): Promise<Room[]> => {
    const response = await roomHttp.get<unknown>('/rooms/available', {
      params: { roomTypeId, checkIn, checkOut }
    });
    return extractRoomList(response.data);
  },

  create: async (room: Partial<Room>): Promise<Room> => {
    const response = await roomHttp.post<unknown>('/rooms', room);
    return extractSingleRoom(response.data);
  },

  update: async (id: string, room: Partial<Room>): Promise<Room> => {
    const response = await roomHttp.put<unknown>(`/rooms/${id}`, room);
    return extractSingleRoom(response.data);
  },

  updateStatus: async (id: string, status: string): Promise<Room> => {
    const response = await roomHttp.put<unknown>(`/rooms/${id}/status`, { roomId: Number(id), status });
    return extractSingleRoom(response.data);
  },

  remove: async (id: string): Promise<void> => {
    await roomHttp.delete(`/rooms/${id}`);
  },

  getRoomTypes: async (): Promise<any[]> => {
    const response = await roomHttp.get<any[]>('/room-types');
    return response.data;
  },

  createType: (type: any) => roomHttp.post('/room-types', type),
  updateType: (id: number, type: any) => roomHttp.put(`/room-types/${id}`, type),
  deleteType: (id: number) => roomHttp.delete(`/room-types/${id}`),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return roomHttp.post<{ url: string }>('/rooms/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Booking APIs
export const bookingApi = {
  create: async (bookingData: CreateBookingPayload): Promise<Booking> => {
    const response = await api.post<unknown>('/bookings', bookingData);
    return extractSingleBooking(response.data);
  },

  getByUser: async (userId: string): Promise<Booking[]> => {
    const response = await api.get<unknown>(`/bookings/user/${userId}`);
    return extractBookingList(response.data);
  },

  getById: async (id: string): Promise<Booking> => {
    const response = await api.get<unknown>(`/bookings/${id}`);
    return extractSingleBooking(response.data);
  },

  getPricing: async (pricingData: { checkInDate: string; checkOutDate: string; pricePerNight: number; ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE' }): Promise<any> => {
    const response = await api.post<any>('/bookings/pricing', pricingData);
    return response.data?.data ?? response.data;
  },

  cancel: async (id: string, reason?: string): Promise<any> => {
    const response = await api.post<any>(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  getPolicy: async (id: string): Promise<any> => {
    const response = await api.get<any>(`/bookings/${id}/policy`);
    return response.data;
  },

  getGuests: async (id: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookings/${id}/guests`);
    return response.data;
  },

  submitPreCheckin: async (id: string, documents: Array<{
    guestId: number;
    idType: 'CCCD' | 'PASSPORT' | 'BIRTH_CERTIFICATE';
    idNumber: string;
    issuedDate?: string;
    issuedPlace?: string;
    idImageUrl?: string;
  }>): Promise<any[]> => {
    const response = await api.post<any[]>(`/bookings/${id}/pre-checkin`, { documents });
    return response.data;
  },
};

const mapPayment = (payment: PaymentBackend): PaymentRecord => ({
  id: String(payment.id ?? ''),
  bookingId: String(payment.bookingId ?? ''),
  userId: String(payment.userId ?? ''),
  totalAmount: Number(payment.totalAmount || 0),
  paidAmount: Number(payment.paidAmount || payment.amount || 0),
  amount: Number(payment.amount || payment.paidAmount || 0),
  paymentType: payment.paymentType || '',
  method: payment.method || '',
  status: payment.status || '',
  invoiceCategory: payment.invoiceCategory,
  transactionId: payment.transactionId || '',
  vnpTransactionNo: payment.vnpTransactionNo,
  vnpResponseCode: payment.vnpResponseCode,
  createdAt: payment.createdAt || '',
});

/**
 * URL trong QR phải là địa chỉ laptop trên LAN (vd. http://192.168.1.5:3000), không dùng localhost —
 * điện thoại quét QR sẽ mở trên chính máy điện thoại nếu dùng localhost.
 * - Đặt VITE_PUBLIC_APP_ORIGIN=http://<LAN-IP>:3000 khi nhân viên mở staff bằng http://localhost:3000
 * - Hoặc mở staff trực tiếp bằng http://<LAN-IP>:3000 (không cần env nếu backend confirmUrl vẫn là localhost)
 */
const normalizeConfirmUrl = (confirmUrl: string, paymentCode: string) => {
  const path = `/payment/confirm?code=${encodeURIComponent(paymentCode)}`;
  const envOrigin = (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined)?.trim().replace(/\/$/, '');
  if (envOrigin) {
    return `${envOrigin}${path}`;
  }
  if (confirmUrl && !confirmUrl.includes('localhost') && !confirmUrl.includes('127.0.0.1')) {
    return confirmUrl;
  }
  const origin = window.location.origin.replace(/\/$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.warn(
      '[HotelSystem] QR thanh toán: điện thoại không truy cập được localhost. Thêm VITE_PUBLIC_APP_ORIGIN=http://<IP-LAN>:3000 vào .env hoặc mở trang nhân viên qua IP LAN.'
    );
  }
  return `${origin}${path}`;
};

const mapCheckinQr = (payment: CheckinQrBackend): CheckinQrPayment => {
  const paymentCode = payment.paymentCode || '';
  return {
    paymentCode,
    amount: Number(payment.amount || 0),
    confirmUrl: normalizeConfirmUrl(payment.confirmUrl || '', paymentCode),
    expiredAt: payment.expiredAt || '',
    paymentType: payment.paymentType,
    invoiceCategory: payment.invoiceCategory,
  };
};

const mapCheckinPaymentStatus = (payment: any): CheckinPaymentStatus => ({
  paymentCode: String(payment?.paymentCode || ''),
  bookingId: String(payment?.bookingId || ''),
  bookingCode: String(payment?.bookingCode || payment?.bookingId || ''),
  amount: Number(payment?.amount || 0),
  status: String(payment?.status || ''),
  paymentType: payment?.paymentType != null ? String(payment.paymentType) : undefined,
  invoiceCategory: payment?.invoiceCategory != null ? String(payment.invoiceCategory) : undefined,
});

const extractPaymentList = (payload: unknown): PaymentRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapPayment(item as PaymentBackend));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: PaymentBackend[] }).data.map((item) => mapPayment(item));
  }

  return [];
};

const mapNotification = (notification: NotificationBackend): UserNotification => ({
  id: String(notification.id ?? ''),
  bookingId: String(notification.bookingId ?? ''),
  userId: String(notification.userId ?? ''),
  type: notification.type || '',
  message: notification.message || '',
  createdAt: notification.createdAt || '',
});

const extractNotificationList = (payload: unknown): UserNotification[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapNotification(item as NotificationBackend));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: NotificationBackend[] }).data.map((item) => mapNotification(item));
  }

  return [];
};

const mapRefund = (refund: RefundBackend): RefundRecord => ({
  id: String(refund.id ?? ''),
  bookingId: String(refund.bookingId ?? ''),
  paymentTransactionId: refund.paymentTransactionId || '',
  paidAmount: Number(refund.paidAmount || 0),
  cancellationFee: Number(refund.cancellationFee || 0),
  refundAmount: Number(refund.refundAmount || refund.amount || 0),
  refundMethod: refund.refundMethod || '',
  amount: Number(refund.amount || refund.refundAmount || 0),
  status: refund.status || '',
  reason: refund.reason || '',
  processedBy: refund.processedBy || '',
  assignedTo: String(refund.assignedTo ?? ''),
  dueAt: refund.dueAt || '',
  priority: refund.priority || '',
  createdAt: refund.createdAt || '',
  updatedAt: refund.updatedAt || '',
});

const extractRefundList = (payload: unknown): RefundRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapRefund(item as RefundBackend));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: RefundBackend[] }).data.map((item) => mapRefund(item));
  }

  return [];
};

export type PaymentType = 'DEPOSIT' | 'FULL' | 'REMAINING';

export type RefundAllocationLine = {
  amount?: number;
  receiverType?: string;
  receiverUserId?: number;
  receiverGuestId?: number;
  receiverName?: string;
  receiverPhone?: string;
  sourcePaymentPurpose?: string;
  refundChannel?: string;
  /** Dòng mô tả đầy đủ từ backend */
  recipientSummaryVi?: string;
};

export type CheckoutResponse = {
  bookingId: string;
  lateMinutes: number;
  lateCheckoutFee: number;
  paymentRequired: boolean;
  bookingStatus: string;
  checkoutType?: string;
  totalNights?: number;
  refundAmount?: number;
  refundRate?: number;
  /** Giá 1 đêm tham chiếu từ backend (công thức hoàn tiền) */
  effectivePricePerNight?: number;
  finalAmount?: number;
  usedNights?: number;
  chargeNights?: number;
  unusedNights?: number;
  representativeGuestId?: string;
  representativeFullName?: string;
  representativePhone?: string;
  representativeCccd?: string;
  message?: string;
  refundAllocations?: RefundAllocationLine[];
};

export type CheckInOutStats = {
  totalCheckInToday: number;
  alreadyCheckedIn: number;
  notYetCheckedIn: number;
  totalCheckOutToday: number;
  alreadyCheckedOut: number;
  notYetCheckedOut: number;
  inCleaningNow: number;
};

/** Ngày hiện tại theo múi giờ VN (yyyy-MM-dd) — đồng bộ với backend staff APIs. */
export const vietnamTodayISO = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

const extractCheckInOutStats = (payload: unknown): CheckInOutStats => {
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: Record<string, unknown> }).data
      : (payload as Record<string, unknown> | null);

  const num = (key: keyof CheckInOutStats) => Number(data?.[key] ?? 0);

  return {
    totalCheckInToday: num('totalCheckInToday'),
    alreadyCheckedIn: num('alreadyCheckedIn'),
    notYetCheckedIn: num('notYetCheckedIn'),
    totalCheckOutToday: num('totalCheckOutToday'),
    alreadyCheckedOut: num('alreadyCheckedOut'),
    notYetCheckedOut: num('notYetCheckedOut'),
    inCleaningNow: num('inCleaningNow'),
  };
};

const mapBookingGuest = (guest: BookingGuestBackend): BookingGuest => ({
  id: String(guest.id ?? ''),
  bookingId: String(guest.bookingId ?? ''),
  fullName: guest.fullName || '',
  dateOfBirth: guest.dateOfBirth,
  phone: guest.phone,
  email: guest.email,
  cccd: guest.cccd,
  note: guest.note,
  type: (guest.type || undefined) as BookingGuest['type'],
  primaryGuest: Boolean(guest.primaryGuest),
  checkInPerson: Boolean(guest.checkInPerson),
});

const extractBookingGuestList = (payload: unknown): BookingGuest[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapBookingGuest(item as BookingGuestBackend));
  }
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: BookingGuestBackend[] }).data.map((item) => mapBookingGuest(item));
  }
  return [];
};

export type InvoiceSummary = {
  monthlyRevenue: number;
  paidTotal: number;
  pendingTotal: number;
  paidCount: number;
  pendingCount: number;
};

export const paymentApi = {
  createVNPay: async (paymentData: {
    bookingId: number;
    userId: number;
    totalAmount: number;
    paymentType: PaymentType;
    bankCode?: string;
    locale?: 'vn' | 'en';
  }): Promise<{ paymentUrl: string }> => {
    const response = await paymentHttp.post<any>('/payments/vnpay/create', paymentData);
    const payload = response.data?.data ?? response.data;
    return {
      paymentUrl: payload?.paymentUrl || payload?.url || payload?.payment_url || '',
    };
  },

  createMoMo: async (paymentData: {
    bookingId: number;
    userId: number;
    totalAmount: number;
    paymentType: PaymentType;
    requestType?: 'captureWallet' | 'payWithATM';
  }): Promise<{ paymentUrl: string }> => {
    const response = await paymentHttp.post<any>('/payments/momo/create', paymentData);
    const payload = response.data?.data ?? response.data;
    return {
      paymentUrl: payload?.paymentUrl || payload?.payUrl || payload?.url || payload?.payment_url || '',
    };
  },

  getByBooking: async (bookingId: string, userId?: string): Promise<PaymentRecord[]> => {
    const response = await paymentHttp.get<unknown>(`/payments/booking/${bookingId}`, {
      params: userId ? { userId } : undefined,
    });
    return extractPaymentList(response.data);
  },

  markLateCheckoutPaid: async (bookingId: string, method?: string, body?: { payerName?: string; payerPhone?: string; payerGuestId?: number; payerCccd?: string }): Promise<PaymentRecord> => {
    const response = await paymentHttp.post<unknown>(
      `/payments/bookings/${bookingId}/late-checkout-fee/paid`,
      body || null,
      { params: method ? { method } : undefined }
    );
    return mapPayment(response.data as PaymentBackend);
  },

  markEarlyCheckinPaid: async (bookingId: string, method?: string): Promise<PaymentRecord> => {
    const response = await paymentHttp.post<unknown>(
      `/payments/bookings/${bookingId}/early-checkin-fee/paid`,
      null,
      { params: method ? { method } : undefined }
    );
    return mapPayment(response.data as PaymentBackend);
  },

  createCheckinQr: async (payload: {
    bookingId: string;
    amount: number;
    method: 'BANK_TRANSFER';
    type: 'CHECKIN_REMAINING_PAYMENT' | 'EARLY_CHECKIN_FEE' | 'LATE_CHECKOUT_FEE';
  }): Promise<CheckinQrPayment> => {
    const response = await paymentHttp.post<unknown>('/payments/checkin-qr', {
      bookingId: Number(payload.bookingId),
      amount: payload.amount,
      method: payload.method,
      type: payload.type,
    });
    return mapCheckinQr(response.data as CheckinQrBackend);
  },

  getCheckinQr: async (paymentCode: string): Promise<CheckinPaymentStatus> => {
    const response = await paymentHttp.get<unknown>('/payments/checkin-qr', { params: { code: paymentCode } });
    return mapCheckinPaymentStatus(response.data);
  },

  confirmCheckinQr: async (paymentCode: string): Promise<CheckinPaymentStatus> => {
    const response = await paymentHttp.post<unknown>(`/payments/${paymentCode}/confirm`);
    return mapCheckinPaymentStatus(response.data);
  },

  confirmLateCheckoutQr: async (paymentCode: string): Promise<CheckinPaymentStatus> => {
    const response = await paymentHttp.post<unknown>(`/payments/late-checkout/${encodeURIComponent(paymentCode)}/confirm`);
    return mapCheckinPaymentStatus(response.data);
  },

  cancelCheckinQr: async (paymentCode: string): Promise<CheckinPaymentStatus> => {
    const response = await paymentHttp.post<unknown>(`/payments/${paymentCode}/cancel`);
    return mapCheckinPaymentStatus(response.data);
  },
};

export const buildPaymentSocketUrl = () => {
  const configured = import.meta.env.VITE_PAYMENT_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/payment-api/ws/payments`;
};

export const notificationApi = {
  getByUser: async (userId: string): Promise<UserNotification[]> => {
    const response = await notificationHttp.get<unknown>('/notifications', { params: { userId } });
    return extractNotificationList(response.data).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
};

export const refundApi = {
  getByUser: async (userId: string): Promise<RefundRecord[]> => {
    const response = await api.get<unknown>(`/refunds/user/${userId}`);
    return extractRefundList(response.data).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getByBooking: async (bookingId: string): Promise<RefundRecord[]> => {
    const response = await api.get<unknown>(`/refunds/booking/${bookingId}`);
    return extractRefundList(response.data).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
};

function mapCheckoutResponse(data: Record<string, unknown>, bookingId: string): CheckoutResponse {
  const rawLines = data?.refundAllocations;
  let refundAllocations: RefundAllocationLine[] | undefined;
  if (Array.isArray(rawLines)) {
    refundAllocations = rawLines.map((line: Record<string, unknown>) => ({
      amount: line.amount != null ? Number(line.amount) : undefined,
      receiverType: line.receiverType != null ? String(line.receiverType) : undefined,
      receiverUserId: line.receiverUserId != null ? Number(line.receiverUserId) : undefined,
      receiverGuestId: line.receiverGuestId != null ? Number(line.receiverGuestId) : undefined,
      receiverName: line.receiverName != null ? String(line.receiverName) : undefined,
      receiverPhone: line.receiverPhone != null ? String(line.receiverPhone) : undefined,
      sourcePaymentPurpose:
        line.sourcePaymentPurpose != null ? String(line.sourcePaymentPurpose) : undefined,
      refundChannel: line.refundChannel != null ? String(line.refundChannel) : undefined,
      recipientSummaryVi:
        line.recipientSummaryVi != null ? String(line.recipientSummaryVi) : undefined,
    }));
  }
  return {
    bookingId: String(data?.bookingId ?? bookingId),
    lateMinutes: Number(data?.lateMinutes || 0),
    lateCheckoutFee: Number(data?.lateCheckoutFee || 0),
    paymentRequired: Boolean(data?.paymentRequired),
    bookingStatus: String(data?.bookingStatus || ''),
    checkoutType: data?.checkoutType != null ? String(data.checkoutType) : undefined,
    totalNights: data?.totalNights != null ? Number(data.totalNights) : undefined,
    refundAmount: data?.refundAmount != null ? Number(data.refundAmount) : undefined,
    refundRate: data?.refundRate != null ? Number(data.refundRate) : undefined,
    finalAmount: data?.finalAmount != null ? Number(data.finalAmount) : undefined,
    usedNights: data?.usedNights != null ? Number(data.usedNights) : undefined,
    chargeNights: data?.chargeNights != null ? Number(data.chargeNights) : undefined,
    unusedNights: data?.unusedNights != null ? Number(data.unusedNights) : undefined,
    effectivePricePerNight:
      data?.effectivePricePerNight != null ? Number(data.effectivePricePerNight) : undefined,
    representativeGuestId:
      data?.representativeGuestId != null ? String(data.representativeGuestId) : undefined,
    representativeFullName:
      data?.representativeFullName != null ? String(data.representativeFullName) : undefined,
    representativePhone: data?.representativePhone != null ? String(data.representativePhone) : undefined,
    representativeCccd: data?.representativeCccd != null ? String(data.representativeCccd) : undefined,
    message: data?.message != null ? String(data.message) : undefined,
    refundAllocations,
  };
}

export const staffBookingApi = {
  getCheckInList: async (): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/check-in-list');
    return extractBookingList(response.data);
  },

  getTodayCheckInList: async (date?: string): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/check-in-today', {
      params: { date: date || vietnamTodayISO() },
    });
    return extractBookingList(response.data);
  },

  getCheckoutList: async (): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/checkout-list');
    return extractBookingList(response.data);
  },

  getTodayCheckoutList: async (date?: string): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/checkout-today', {
      params: { date: date || vietnamTodayISO() },
    });
    return extractBookingList(response.data);
  },

  getAlreadyCheckedInTodayList: async (date?: string): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/checked-in-today', { params: { date } });
    return extractBookingList(response.data);
  },

  getAlreadyCheckedOutTodayList: async (date?: string): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings/checked-out-today', { params: { date } });
    return extractBookingList(response.data);
  },

  getTodayStats: async (date?: string): Promise<CheckInOutStats> => {
    const response = await api.get<unknown>('/api/staff/bookings/today-stats', {
      params: { date: date || vietnamTodayISO() },
    });
    return extractCheckInOutStats(response.data);
  },

  getBooking: async (bookingId: string): Promise<Booking> => {
    const response = await api.get<unknown>(`/api/staff/bookings/${bookingId}`);
    return extractSingleBooking(response.data);
  },

  checkIn: async (bookingId: string, representativeCccd: string): Promise<Booking> => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/check-in`, { representativeCccd });
    return extractSingleBooking(response.data);
  },

  checkInWithRepresentative: async (
    bookingId: string,
    payload: { representativeGuestId: string; representativeCccd: string; representativePhone?: string }
  ): Promise<Booking> => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/check-in`, {
      representativeGuestId: Number(payload.representativeGuestId),
      representativeCccd: payload.representativeCccd,
      representativePhone: payload.representativePhone,
    });
    return extractSingleBooking(response.data);
  },

  updateCheckInRepresentative: async (
    bookingId: string,
    payload: { representativeGuestId: string; representativeCccd: string; representativePhone?: string }
  ): Promise<Booking> => {
    const response = await api.put<unknown>(`/api/staff/bookings/${bookingId}/check-in-representative`, {
      representativeGuestId: Number(payload.representativeGuestId),
      representativeCccd: payload.representativeCccd,
      representativePhone: payload.representativePhone,
    });
    return extractSingleBooking(response.data);
  },

  getGuests: async (bookingId: string): Promise<BookingGuest[]> => {
    const response = await api.get<unknown>(`/api/staff/bookings/${bookingId}/guests`);
    return extractBookingGuestList(response.data);
  },

  collectRemainingPayment: async (
    bookingId: string,
    payload: {
      amount: number;
      userId?: number;
      payerGuestId?: number;
      payerName?: string;
      payerPhone?: string;
      method: 'CASH' | 'BANK_TRANSFER';
      transactionId?: string;
    }
  ): Promise<Booking> => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/remaining-payment`, payload);
    return extractSingleBooking(response.data);
  },

  calculateCheckout: async (bookingId: string): Promise<CheckoutResponse> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/checkout/calculate`);
    return mapCheckoutResponse(response.data, bookingId);
  },

  confirmCheckout: async (
    bookingId: string,
    payload?: {
      verifierFullName?: string;
      verifierPhone?: string;
      verifierCccd?: string;
      earlyCheckoutReason?: string;
      verificationOverride?: boolean;
      overrideReason?: string;
    }
  ): Promise<CheckoutResponse> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/checkout/confirm`, payload ?? {});
    return mapCheckoutResponse(response.data, bookingId);
  },

  completeCheckout: async (bookingId: string): Promise<Booking> => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/checkout/complete`);
    return extractSingleBooking(response.data);
  },
};

export const staffRefundApi = {
  getAll: async (): Promise<RefundRecord[]> => {
    const response = await api.get<unknown>('/api/staff/refund-requests');
    return extractRefundList(response.data);
  },

  assign: async (id: string): Promise<RefundRecord> => {
    const response = await api.post<unknown>(`/api/staff/refund-requests/${id}/assign`);
    return mapRefund(response.data as RefundBackend);
  },

  approve: async (id: string): Promise<RefundRecord> => {
    const response = await api.post<unknown>(`/api/staff/refund-requests/${id}/approve`);
    return mapRefund(response.data as RefundBackend);
  },

  createEarlyCheckoutRefund: async (bookingId: string, refundAmount: number): Promise<RefundRecord> => {
    const response = await api.post<unknown>(`/api/staff/refund-requests/early-checkout/${bookingId}`, {
      refundAmount,
    });
    return mapRefund(response.data as RefundBackend);
  },
};

export const staffInvoiceApi = {
  getSummary: async (): Promise<InvoiceSummary> => {
    const response = await paymentHttp.get<any>('/api/staff/invoices/summary');
    return {
      monthlyRevenue: Number(response.data.monthlyRevenue || 0),
      paidTotal: Number(response.data.paidTotal || 0),
      pendingTotal: Number(response.data.pendingTotal || 0),
      paidCount: Number(response.data.paidCount || 0),
      pendingCount: Number(response.data.pendingCount || 0),
    };
  },

  getAll: async (): Promise<PaymentRecord[]> => {
    const response = await paymentHttp.get<unknown>('/api/staff/invoices');
    return extractPaymentList(response.data);
  },

  getById: async (id: string): Promise<PaymentRecord> => {
    const response = await paymentHttp.get<unknown>(`/api/staff/invoices/${id}`);
    return mapPayment(response.data as PaymentBackend);
  },
};

// Auth APIs
export const authApi = {
  login: (email: string, password: string) =>
    authHttp.post<{ accessToken: string; refreshToken: string }>('/auth/login', { email, password }),

  register: (payload: Partial<User> & {
    email?: string;
    name?: string;
    phone?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: boolean;
    password: string;
    role?: string;
  }) =>
    authHttp.post<string>('/auth/register', {
      name: payload.name || '',
      email: payload.email,
      phoneNumber: payload.phoneNumber || payload.phone || '',
      dateOfBirth: payload.dateOfBirth || '',
      gender: payload.gender,
      password: payload.password,
      role: payload.role || 'CUSTOMER',
    }),

  sendOtp: (method: 'EMAIL' | 'PHONE') =>
    authHttp.post<string>('/auth/send-otp', null, { params: { method } }),

  verifyOtp: (otp: string) =>
    authHttp.post<string>('/auth/verify-otp', null, { params: { otp } }),

  refreshTokens: (refreshToken: string) =>
    authHttp.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  logout: async () => {
    tokenStorage.clear();
  },
};

export const userApi = {
  getMe: () => userHttp.get<UserProfile>('/api/users/me'),
  updateMe: (profile: UserProfile) => userHttp.put<UserProfile>('/api/users/me', profile),
  createProfile: (profile: UserProfile) => userHttp.post<UserProfile>('/api/users', profile),
  getUserById: (id: string | number) => userHttp.get<any>(`/api/users/profile/${id}`),
};

export const employeeApi = {
  getAll: (params?: { keyword?: string; active?: boolean }) =>
    userHttp.get<EmployeeBackend[]>('/api/users/employees', { params }),

  create: (payload: CreateEmployeePayload) =>
    userHttp.post<EmployeeBackend>('/api/users/employees', payload),

  update: (employeeId: number, payload: UpdateEmployeePayload) =>
    userHttp.put<EmployeeBackend>(`/api/users/employees/${employeeId}`, payload),

  updateStatus: (employeeId: number, active: boolean) =>
    userHttp.patch<EmployeeBackend>(`/api/users/employees/${employeeId}/status`, null, {
      params: { active },
    }),

  remove: (employeeId: number) => userHttp.delete(`/api/users/employees/${employeeId}`),
};

export default api;
