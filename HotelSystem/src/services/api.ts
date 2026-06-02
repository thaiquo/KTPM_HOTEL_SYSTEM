import axios from 'axios';
import type { Room, Booking, BookingGuest, BookingItem, User, UserProfile, SearchFilters } from '../types';

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000;
const PAYMENT_FLOW_TIMEOUT_MS = Number(import.meta.env.VITE_PAYMENT_FLOW_TIMEOUT_MS) || 45000;
const NETWORK_ERROR_MESSAGE = 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối hoặc thử lại.';

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

export interface CustomerBackend {
  id: number;
  email: string;
  phoneNumber: string;
  name: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  role?: string;
  active?: boolean;
}

export interface CreateCustomerPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  active?: boolean;
}

export interface UpdateCustomerPayload {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  active?: boolean;
}

type RoomAmenityBackend = {
  id: number;
  amenity: {
    id: number;
    code: string;
    name: string;
    category: string;
    isChargeable: boolean;
    icon?: string;
  };
  isActive: boolean;
};

type RoomBedOverrideBackend = {
  id: number;
  bedType: { id: number; code: string; name: string; maxOccupantsPerBed?: number };
  quantity: number;
};

type RoomTypeBedConfigBackend = {
  id: number;
  bedType: { id: number; code: string; name: string; maxOccupantsPerBed?: number };
  quantity: number;
  isPrimary: boolean;
};

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
    images: { id?: number; imageUrl: string; isThumbnail: boolean }[];
    bedConfigs?: RoomTypeBedConfigBackend[];
  };
  status: string;
  // cũ: floor — mới: floorNumber + floorLevel
  floor?: number;
  floorNumber?: number;
  floorLevel?: string;
  note?: string;
  actualCapacity?: number;
  areaM2?: number;
  viewType?: string;
  hasBalcony?: boolean;
  hasBathtub?: boolean;
  smokingPolicy?: string;
  isAccessible?: boolean;
  isConnecting?: boolean;
  connectedRoomId?: number;
  maintenanceStatus?: string;
  // Được nạp lazy bởi Hibernate BatchSize
  amenities?: RoomAmenityBackend[];
  bedOverrides?: RoomBedOverrideBackend[];
};

type BookingBackend = {
  id?: number | string;
  bookingCode?: string;
  userId?: number | string;
  roomId?: number | string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  createdAt?: string;
  confirmedAt?: string;
  subtotal?: number;
  discountTotal?: number;
  taxAmount?: number;
  finalTotal?: number;
  totalPrice?: number;
  totalRooms?: number;
  totalGuests?: number;
  depositAmount?: number;
  paidAmount?: number;
  ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE';
  paymentType?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  customerName?: string;
  representativeName?: string;
  representativePhone?: string;
  representativeCccd?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  reservationExpiredAt?: string;
  lockStatus?: string;
  source?: string;
  notes?: string;
  currency?: string;
  guests?: number;
  items?: any[];
};

type BookingGuestBackend = {
  id?: number | string;
  bookingId?: number | string;
  bookingRoomId?: number | string;
  roomId?: number | string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  cccd?: string;
  passport?: string;
  gender?: string;
  role?: string;
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

export type BookingInvoiceRecord = {
  id: string;
  bookingId: string;
  bookingCode?: string;
  invoiceStatus?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  customerUserId?: string;
  customerName?: string;
  representativeName?: string;
  representativePhone?: string;
  representativeCccd?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalRooms?: number;
  checkoutStaffId?: string;
  checkoutStaffName?: string;
  checkinStaffId?: string;
  checkinStaffName?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  refundTransactionId?: string;
  refundStatus?: string;
  refundSettlementAmount?: number;
  totalOriginalAmount?: number;
  totalUsedRoomAmount?: number;
  totalUnusedRoomAmount?: number;
  totalHotelKeepAmount?: number;
  totalAllocatedPaidAmount?: number;
  totalActualRevenue?: number;
  totalRefundToCustomer?: number;
  totalAdditionalCharge?: number;
  roomServiceFeeTotal?: number;
  bookingServiceTotal?: number;
  draftServiceLinesTotal?: number;
  damageFeeTotal?: number;
  manualSurchargeTotal?: number;
  lateCheckoutFeeTotal?: number;
  earlyCheckinFeeTotal?: number;
  totalAmount?: number;
  paidAmount?: number;
  amount: number;
  currency?: string;
  lines?: any;
  createdAt?: string;
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
  rooms: Array<{
    roomId: number;
    roomTypeId?: number;
    priceSnapshot: number;
    guests?: Array<BookingGuestPayload & { citizenId?: string; passport?: string; gender?: string; role?: 'REPRESENTATIVE' | 'MEMBER' }>;
  }>;
  userId: number;
  checkIn: string;
  checkOut: string;
  paymentType?: PaymentType;
  ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE';
  source?: string;
  notes?: string;
  guestCount: number;
  roomCapacitySnapshot?: number;
  primaryGuest: BookingGuestPayload;
  guests: BookingGuestPayload[];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_BOOKING_API_URL || '/booking-api',
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authHttp = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/auth-api',
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const userHttp = axios.create({
  baseURL: import.meta.env.VITE_USER_API_URL || '/user-api',
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const roomHttp = axios.create({
  baseURL: import.meta.env.VITE_ROOM_API_URL || '/room-api',
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const paymentHttp = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL || '/payment-api',
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const notificationHttp = axios.create({
  baseURL: import.meta.env.VITE_NOTIFICATION_API_URL || '/notification-api',
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authResourceHttp = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/auth-api',
  timeout: API_TIMEOUT_MS,
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

const attachFriendlyError = (error: any) => {
  const backendMessage = error?.response?.data?.message || error?.response?.data?.error;
  if (backendMessage) {
    error.userMessage = backendMessage;
    return error;
  }
  if (error?.code === 'ECONNABORTED' || String(error?.message || '').toLowerCase().includes('timeout')) {
    error.userMessage = NETWORK_ERROR_MESSAGE;
    return error;
  }
  if (!error?.response) {
    error.userMessage = NETWORK_ERROR_MESSAGE;
    return error;
  }
  error.userMessage = error?.message || NETWORK_ERROR_MESSAGE;
  return error;
};

const logApiError = (error: any) => {
  if (!import.meta.env.DEV) return;
  console.error('API ERROR:', {
    url: error?.config?.url,
    baseURL: error?.config?.baseURL,
    method: error?.config?.method,
    status: error?.response?.status,
    message: error?.message,
    data: error?.response?.data,
  });
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
      attachFriendlyError(error);
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

      if ((error.response?.status === 401 || error.response?.status === 403) && originalRequest && !originalRequest._retry) {
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken || error.response?.status === 403) {
          logApiError(error);
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
          attachFriendlyError(refreshError);
          logApiError(refreshError);
          tokenStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      logApiError(error);
      return Promise.reject(error);
    }
  );
};

const mapRoom = (room: RoomBackend): Room => {
  const capacity = room.actualCapacity || room.roomType?.maxCapacity || 2;
  const floorNumber = room.floorNumber ?? room.floor ?? 0;
  const floorLevel = room.floorLevel || (floorNumber >= 8 ? 'TOP' : floorNumber >= 6 ? 'HIGH' : floorNumber >= 4 ? 'MID' : 'LOW');

  // Map amenities từ room_amenities (Set<RoomAmenity> của backend)
  const amenities = (room.amenities ?? []).map((ra) => ({
    id: ra.id,
    amenity: {
      id: ra.amenity.id,
      code: ra.amenity.code,
      name: ra.amenity.name,
      isChargeable: ra.amenity.isChargeable ?? false,
      isActive: ra.isActive ?? true,
    },
    isActive: ra.isActive ?? true,
  }));

  // Map beds từ bedOverrides (ưu tiên) hoặc bedConfigs của roomType
  let beds: { type: string; quantity: number }[] = [];
  if (room.bedOverrides && room.bedOverrides.length > 0) {
    beds = room.bedOverrides.map((b) => ({ type: b.bedType?.name ?? b.bedType?.code ?? 'Bed', quantity: b.quantity }));
  } else if (room.roomType?.bedConfigs && room.roomType.bedConfigs.length > 0) {
    beds = room.roomType.bedConfigs
      .filter((bc: any) => bc.isPrimary !== false)
      .map((bc: any) => ({ type: bc.bedType?.name ?? bc.bedType?.code ?? 'Bed', quantity: bc.quantity }));
  }

  // Sắp xếp ảnh: thumbnail trước
  const images = [...(room.roomType?.images ?? [])].sort((a, b) =>
    (b.isThumbnail ? 1 : 0) - (a.isThumbnail ? 1 : 0)
  );

  const bedConfigs = (room.roomType?.bedConfigs ?? []).map((bc) => ({
    id: bc.id,
    quantity: bc.quantity,
    isPrimary: bc.isPrimary ?? false,
    bedType: {
      id: bc.bedType.id,
      code: bc.bedType.code,
      name: bc.bedType.name,
      maxOccupantsPerBed: bc.bedType.maxOccupantsPerBed ?? 0,
    },
  }));

  return {
    id: String(room.id),
    name: `Phòng ${room.roomNumber}`,
    roomNumber: room.roomNumber,
    type: room.roomType.type,
    price: room.roomType.basePrice,
    maxGuests: capacity,
    maxCapacity: capacity,
    images: images.map(img => img.imageUrl) || [],
    amenities: amenities,
    description: room.roomType.description,
    available: room.status === 'AVAILABLE',
    floor: floorNumber,
    floorNumber: floorNumber,
    floorLevel: floorLevel,
    bedType: beds?.map(b => `${b.quantity} ${b.type}`).join(', ') || 'Chưa cấu hình',
    beds: beds,
    viewType: room.viewType || 'City View',
    areaM2: room.areaM2 || 0,
    hasBalcony: !!room.hasBalcony,
    hasBathtub: !!room.hasBathtub,
    smokingPolicy: (room.smokingPolicy || 'NON_SMOKING') as any,
    isAccessible: !!room.isAccessible,
    isConnecting: !!room.isConnecting,
    connectedRoomId: room.connectedRoomId,
    status: room.status as Room['status'],
    maintenanceStatus: room.maintenanceStatus || 'OK',
    roomType: {
      id: String(room.roomType.id),
      type: room.roomType.type,
      basePrice: room.roomType.basePrice,
      maxCapacity: room.roomType.maxCapacity,
      defaultCapacity: room.roomType.defaultCapacity,
      description: room.roomType.description,
      images: images,
      bedConfigs: bedConfigs as any,
    },
    note: room.note,
  };
};

const normalizeOptionalId = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null' || normalized === 'NaN') {
    return undefined;
  }
  return normalized;
};

const mapBooking = (booking: BookingBackend): Booking => {
  const rawStatus = String(booking.status || 'pending_payment').toLowerCase();
  const status = ([
    'pending_payment', 'pending', 'deposit_paid', 'confirmed', 'booked',
    'partially_checked_in', 'checked_in', 'partially_checked_out', 'checkout_pending_payment', 'checked_out', 'completed', 'cancel_requested', 'cancelled', 'no_show'
  ].includes(rawStatus) ? rawStatus : 'pending_payment') as Booking['status'];
  const primaryRoomId = normalizeOptionalId(booking.roomId)
    || normalizeOptionalId(booking.items?.[0]?.roomId);

  return {
    id: String(booking.id ?? ''),
    bookingCode: booking.bookingCode,
    userId: String(booking.userId ?? ''),
    roomId: primaryRoomId,
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    subtotal: Number(booking.subtotal || booking.finalTotal || 0),
    discountTotal: Number(booking.discountTotal || 0),
    taxAmount: Number(booking.taxAmount || 0),
    totalPrice: Number(booking.totalPrice || booking.finalTotal || 0),
    totalRooms: Number(booking.totalRooms || 0),
    totalGuests: Number(booking.totalGuests || booking.guests || 0),
    status,
    guests: Number(booking.guests || 0),
    items: ((booking.items || []).map((item: any) => ({
      id: String(item.id),
      roomId: normalizeOptionalId(item.roomId),
      roomTypeId: normalizeOptionalId(item.roomTypeId),
      priceSnapshot: Number(item.priceSnapshot ?? item.pricePerNightAtBooking ?? 0),
      finalPrice: Number(item.finalPrice || 0),
      discount: Number(item.discount || 0),
      status: item.status,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      nights: item.nights,
      actualCheckInAt: item.actualCheckInAt,
      actualCheckOutAt: item.actualCheckOutAt,
      representativeGuestId: item.representativeGuestId != null ? String(item.representativeGuestId) : undefined,
      checkedInByStaffId: item.checkedInByStaffId != null ? String(item.checkedInByStaffId) : undefined,
      checkedOutByStaffId: item.checkedOutByStaffId != null ? String(item.checkedOutByStaffId) : undefined,
      roomCharge: item.roomCharge != null ? Number(item.roomCharge) : undefined,
      serviceCharge: item.serviceCharge != null ? Number(item.serviceCharge) : undefined,
      surcharge: item.surcharge != null ? Number(item.surcharge) : undefined,
      damageFee: item.damageFee != null ? Number(item.damageFee) : undefined,
      finalAmount: item.finalAmount != null ? Number(item.finalAmount) : undefined,
      guests: Array.isArray(item.guests) ? item.guests.map((guest: BookingGuestBackend) => mapBookingGuest(guest)) : undefined,
    })) as any),
    createdAt: booking.createdAt || '',
    confirmedAt: booking.confirmedAt,
    ratePlan: booking.ratePlan,
    paymentType: booking.paymentType,
    paymentStatus: booking.paymentStatus,
    paidAmount: Number(booking.paidAmount || 0),
    depositAmount: Number(booking.depositAmount || 0),
    paymentTransactionId: booking.paymentTransactionId,
    customerName: booking.customerName != null ? String(booking.customerName) : undefined,
    representativeName: booking.representativeName != null ? String(booking.representativeName) : undefined,
    representativePhone: booking.representativePhone != null ? String(booking.representativePhone) : undefined,
    representativeCccd: booking.representativeCccd != null ? String(booking.representativeCccd) : undefined,
    cancelledAt: booking.cancelledAt,
    cancellationReason: booking.cancellationReason,
    actualCheckInAt: booking.actualCheckInAt,
    actualCheckOutAt: booking.actualCheckOutAt,
    reservationExpiredAt: booking.reservationExpiredAt,
    lockStatus: booking.lockStatus as any,
    source: booking.source as Booking['source'],
    notes: booking.notes,
    currency: booking.currency,
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

const ROOM_CACHE_TTL_MS = 30_000;
const roomByIdCache = new Map<string, { room: Room; expiresAt: number }>();
const roomByIdPending = new Map<string, Promise<Room>>();

const cacheRoom = (room: Room) => {
  if (!room?.id) return room;
  roomByIdCache.set(String(room.id), { room, expiresAt: Date.now() + ROOM_CACHE_TTL_MS });
  return room;
};

const clearRoomCache = (id?: string) => {
  if (id) {
    roomByIdCache.delete(String(id));
    roomByIdPending.delete(String(id));
    return;
  }
  roomByIdCache.clear();
  roomByIdPending.clear();
};

// Room APIs
export const roomApi = {
  getAll: async (filters?: SearchFilters): Promise<Room[]> => {
    const response = await roomHttp.get<unknown>('/public/rooms', { params: filters });
    const rooms = extractRoomList(response.data);
    rooms.forEach(cacheRoom);
    return rooms;
  },

  getById: async (id: string): Promise<Room> => {
    const normalizedId = String(id);
    const cached = roomByIdCache.get(normalizedId);
    if (cached && cached.expiresAt > Date.now()) return cached.room;

    const pending = roomByIdPending.get(normalizedId);
    if (pending) return pending;

    const request = roomHttp.get<unknown>(`/public/rooms/${normalizedId}`)
      .then((response) => cacheRoom(extractSingleRoom(response.data)))
      .finally(() => roomByIdPending.delete(normalizedId));

    roomByIdPending.set(normalizedId, request);
    return request;
  },

  getAvailableRooms: async (roomTypeId: string | undefined, checkIn: string, checkOut: string): Promise<Room[]> => {
    const response = await roomHttp.get<unknown>('/public/rooms/available', {
      params: { roomTypeId, checkIn, checkOut }
    });
    return extractRoomList(response.data);
  },

  create: async (room: Partial<Room>): Promise<Room> => {
    const response = await roomHttp.post<unknown>('/rooms', room);
    const created = extractSingleRoom(response.data);
    cacheRoom(created);
    return created;
  },

  update: async (id: string, room: Partial<Room>): Promise<Room> => {
    const response = await roomHttp.put<unknown>(`/rooms/${id}`, room);
    const updated = extractSingleRoom(response.data);
    cacheRoom(updated);
    return updated;
  },

  updateStatus: async (id: string, status: string): Promise<Room> => {
    const response = await roomHttp.put<unknown>(`/rooms/${id}/status`, { roomId: Number(id), status });
    const updated = extractSingleRoom(response.data);
    cacheRoom(updated);
    return updated;
  },

  remove: async (id: string): Promise<void> => {
    await roomHttp.delete(`/rooms/${id}`);
    clearRoomCache(id);
  },

  getRoomTypes: async (): Promise<any[]> => {
    const response = await roomHttp.get<any[]>('/room-types');
    return response.data;
  },

  getPrice: async (id: string, checkIn: string, checkOut: string): Promise<any> => {
    const response = await roomHttp.get<unknown>(`/public/rooms/${id}/price`, { params: { checkIn, checkOut } });
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
  },

  // ─── Staff-only APIs ──────────────────────────────────────────────────────

  /**
   * Tìm kiếm phòng cho Staff Panel với đầy đủ filter.
   * Gọi GET /staff/rooms/search
   */
  staffSearch: async (params: {
    keyword?: string;
    floor?: number;
    roomType?: string;
    status?: string;
    viewType?: string;
    minCapacity?: number;
    minPrice?: number;
    maxPrice?: number;
    checkInDate?: string;
    checkOutDate?: string;
    sortBy?: string;
  }): Promise<Room[]> => {
    // Loại bỏ undefined trước khi gửi
    const cleanParams: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = v as string | number;
      }
    }
    const response = await roomHttp.get<unknown>('/staff/rooms/search', { params: cleanParams });
    return extractRoomList(response.data);
  },

  /**
   * Cập nhật trạng thái phòng bởi Staff — có validate transition và ghi lịch sử.
   * Gọi PATCH /staff/rooms/{id}/status
   */
  staffUpdateStatus: async (
    id: string,
    status: string,
    options?: { reason?: string; note?: string; changedBy?: string }
  ): Promise<{ message: string; oldStatus: string; newStatus: string }> => {
    const response = await roomHttp.patch<{ message: string; oldStatus: string; newStatus: string }>(
      `/staff/rooms/${id}/status`,
      {
        status,
        reason: options?.reason,
        note: options?.note,
        changedBy: options?.changedBy,
      }
    );
    clearRoomCache(id);
    return response.data;
  },
};


// Booking APIs
export const bookingApi = {
  create: async (bookingData: CreateBookingPayload): Promise<Booking> => {
    const response = await api.post<unknown>('/bookings', bookingData, { timeout: PAYMENT_FLOW_TIMEOUT_MS });
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

  getGuests: async (id: string): Promise<BookingGuest[]> => {
    const response = await api.get<unknown>(`/bookings/${id}/guests`);
    return extractBookingGuestList(response.data);
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
  const qrOrigin = (import.meta.env.VITE_FRONTEND_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (qrOrigin && !qrOrigin.includes('localhost') && !qrOrigin.includes('127.0.0.1')) {
    return `${qrOrigin}${path}`;
  }
  if (confirmUrl && !confirmUrl.includes('localhost') && !confirmUrl.includes('127.0.0.1')) {
    return confirmUrl;
  }
  const envOrigin = (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined)?.trim().replace(/\/$/, '');
  if (envOrigin && !envOrigin.includes('localhost') && !envOrigin.includes('127.0.0.1')) {
    return `${envOrigin}${path}`;
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
  refundRequired?: boolean;
  bookingStatus: string;
  actualCheckoutAt?: string;
  checkoutType?: string;
  totalNights?: number;
  refundAmount?: number;
  refundRate?: number;
  /** Giá 1 đêm tham chiếu từ backend (công thức hoàn tiền) */
  effectivePricePerNight?: number;
  finalAmount?: number;
  roomCharge?: number;
  actualRoomCharge?: number;
  totalOriginalAmount?: number;
  totalUsedRoomAmount?: number;
  totalUnusedRoomAmount?: number;
  totalHotelKeepAmount?: number;
  totalAllocatedPaidAmount?: number;
  totalActualRevenue?: number;
  totalRefundToCustomer?: number;
  totalAdditionalCharge?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
  amountPaid?: number;
  remainingRoomAmount?: number;
  remainingBalance?: number;
  refundSettlementAmount?: number;
  paymentStatus?: string;
  usedNights?: number;
  chargeNights?: number;
  unusedNights?: number;
  representativeGuestId?: string;
  representativeFullName?: string;
  representativePhone?: string;
  representativeCccd?: string;
  checkedInByStaffId?: string;
  checkedOutByStaffId?: string;
  message?: string;
  refundAllocations?: RefundAllocationLine[];
  serviceTotal?: number;
  roomServiceFeeTotal?: number;
  serviceLines?: {
    id?: string;
    bookingId?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    lineTotal?: number;
  }[];
};

export type CheckoutInvoiceLine = {
  bookingRoomId?: string;
  roomId?: string;
  roomNumber?: string;
  roomTypeName?: string;
  itemType?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
};

export type CheckoutRoomSummary = {
  bookingRoomId?: string;
  roomId?: string;
  roomNumber?: string;
  roomTypeName?: string;
  roomOriginalAmount?: number;
  roomCharge?: number;
  usedRoomAmount?: number;
  unusedRoomAmount?: number;
  hotelKeepAmount?: number;
  allocatedPaidAmount?: number;
  actualRoomRevenue?: number;
  serviceCharge?: number;
  damageFee?: number;
  manualSurcharge?: number;
  lateCheckoutFee?: number;
  totalAmount?: number;
  actualCheckOutAt?: string;
  usedNightAmount?: number;
  unusedNightAmount?: number;
  hotelPenaltyAmount?: number;
  earlyCheckinFee?: number;
  earlyCheckoutRefund?: number;
  refundToCustomer?: number;
  additionalCharge?: number;
  extraCharges?: number;
  paidAllocated?: number;
  netRefundForRoom?: number;
  additionalChargeForRoom?: number;
};

export type BookingCheckoutPreview = {
  bookingId: string;
  bookingCode?: string;
  bookingStatus?: string;
  currency?: string;
  actualCheckOutAt?: string;
  selectedRoomCount?: number;
  selectedRoomIds?: string[];
  roomSummaries?: CheckoutRoomSummary[];
  invoiceLines?: CheckoutInvoiceLine[];
  totalOriginalAmount?: number;
  totalUsedRoomAmount?: number;
  totalUnusedRoomAmount?: number;
  totalHotelKeepAmount?: number;
  totalAllocatedPaidAmount?: number;
  totalActualRevenue?: number;
  totalRefundToCustomer?: number;
  totalAdditionalCharge?: number;
  roomCharge?: number;
  serviceTotal?: number;
  bookingServiceTotal?: number;
  draftServiceLinesTotal?: number;
  roomServiceFeeTotal?: number;
  manualServiceTotal?: number;
  damageFeeTotal?: number;
  manualSurchargeTotal?: number;
  lateCheckoutFeeTotal?: number;
  earlyCheckinFeeTotal?: number;
  earlyCheckoutRefund?: number;
  actualRoomCharge?: number;
  grandTotal?: number;
  amountPaid?: number;
  remainingBalance?: number;
  refundSettlementAmount?: number;
  paymentRequired?: boolean;
  refundRequired?: boolean;
  checkoutType?: string;
  usedNights?: number;
  unusedNights?: number;
  refundRate?: number;
  message?: string;
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

export type RoomChangeResponse = {
  bookingId: string;
  fromRoomId: string;
  toRoomId: string;
  remainingNights: number;
  oldNightlyPrice: number;
  newNightlyPrice: number;
  priceDifferencePerNight: number;
  totalDifference: number;
  paymentAction: 'COLLECT' | 'REFUND' | 'NONE' | string;
  oldRoomNextStatus: string;
  booking?: Booking;
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
  bookingRoomId: normalizeOptionalId(guest.bookingRoomId),
  roomId: normalizeOptionalId(guest.roomId),
  fullName: guest.fullName || '',
  dateOfBirth: guest.dateOfBirth,
  phone: guest.phone,
  email: guest.email,
  cccd: guest.cccd,
  passport: guest.passport,
  gender: guest.gender,
  role: guest.role as BookingGuest['role'],
  note: guest.note,
  type: (guest.type || undefined) as BookingGuest['type'],
  primaryGuest: Boolean(guest.primaryGuest),
  checkInPerson: Boolean(guest.checkInPerson),
} as any);

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
    const response = await paymentHttp.post<any>('/payments/vnpay/create', paymentData, { timeout: PAYMENT_FLOW_TIMEOUT_MS });
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
    const response = await paymentHttp.post<any>('/payments/momo/create', paymentData, { timeout: PAYMENT_FLOW_TIMEOUT_MS });
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

  markLateCheckoutPaid: async (bookingId: string, method?: string, body?: { payerName?: string; payerPhone?: string; payerGuestId?: number; payerCccd?: string; receivedAmount?: number; changeAmount?: number }): Promise<PaymentRecord> => {
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
    refundRequired: data?.refundRequired != null ? Boolean(data.refundRequired) : undefined,
    bookingStatus: String(data?.bookingStatus || ''),
    actualCheckoutAt: data?.actualCheckoutAt != null ? String(data.actualCheckoutAt) : undefined,
    checkoutType: data?.checkoutType != null ? String(data.checkoutType) : undefined,
    totalNights: data?.totalNights != null ? Number(data.totalNights) : undefined,
    refundAmount: data?.refundAmount != null ? Number(data.refundAmount) : undefined,
    refundRate: data?.refundRate != null ? Number(data.refundRate) : undefined,
    finalAmount: data?.finalAmount != null ? Number(data.finalAmount) : undefined,
    roomCharge: data?.roomCharge != null ? Number(data.roomCharge) : undefined,
    actualRoomCharge: data?.actualRoomCharge != null ? Number(data.actualRoomCharge) : undefined,
    taxAmount: data?.taxAmount != null ? Number(data.taxAmount) : undefined,
    discountAmount: data?.discountAmount != null ? Number(data.discountAmount) : undefined,
    grandTotal: data?.grandTotal != null ? Number(data.grandTotal) : undefined,
    amountPaid: data?.amountPaid != null ? Number(data.amountPaid) : undefined,
    remainingRoomAmount: data?.remainingRoomAmount != null ? Number(data.remainingRoomAmount) : undefined,
    remainingBalance: data?.remainingBalance != null ? Number(data.remainingBalance) : undefined,
    refundSettlementAmount:
      data?.refundSettlementAmount != null ? Number(data.refundSettlementAmount) : undefined,
    totalOriginalAmount: data?.totalOriginalAmount != null ? Number(data.totalOriginalAmount) : undefined,
    totalUsedRoomAmount: data?.totalUsedRoomAmount != null ? Number(data.totalUsedRoomAmount) : undefined,
    totalUnusedRoomAmount: data?.totalUnusedRoomAmount != null ? Number(data.totalUnusedRoomAmount) : undefined,
    totalHotelKeepAmount: data?.totalHotelKeepAmount != null ? Number(data.totalHotelKeepAmount) : undefined,
    totalAllocatedPaidAmount: data?.totalAllocatedPaidAmount != null ? Number(data.totalAllocatedPaidAmount) : undefined,
    totalActualRevenue: data?.totalActualRevenue != null ? Number(data.totalActualRevenue) : data?.netRevenue != null ? Number(data.netRevenue) : undefined,
    totalRefundToCustomer: data?.totalRefundToCustomer != null ? Number(data.totalRefundToCustomer) : undefined,
    totalAdditionalCharge: data?.totalAdditionalCharge != null ? Number(data.totalAdditionalCharge) : undefined,
    paymentStatus: data?.paymentStatus != null ? String(data.paymentStatus) : undefined,
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
    checkedInByStaffId: data?.checkedInByStaffId != null ? String(data.checkedInByStaffId) : undefined,
    checkedOutByStaffId: data?.checkedOutByStaffId != null ? String(data.checkedOutByStaffId) : undefined,
    message: data?.message != null ? String(data.message) : undefined,
    refundAllocations,
    serviceTotal: data?.serviceTotal != null ? Number(data.serviceTotal) : undefined,
    roomServiceFeeTotal: data?.roomServiceFeeTotal != null ? Number(data.roomServiceFeeTotal) : undefined,
    serviceLines: Array.isArray(data?.serviceLines)
      ? data.serviceLines.map((l: any) => ({
          id: l.id != null ? String(l.id) : undefined,
          bookingId: l.bookingId != null ? String(l.bookingId) : undefined,
          name: l.name != null ? String(l.name) : undefined,
          quantity: l.quantity != null ? Number(l.quantity) : undefined,
          unitPrice: l.unitPrice != null ? Number(l.unitPrice) : undefined,
          lineTotal: l.lineTotal != null ? Number(l.lineTotal) : undefined,
        }))
      : undefined,
  };
}

function mapBookingInvoiceRecord(data: any): BookingInvoiceRecord {
  return {
    id: String(data?.id ?? ''),
    bookingId: String(data?.bookingId ?? ''),
    bookingCode: data?.bookingCode != null ? String(data.bookingCode) : undefined,
    invoiceStatus: data?.invoiceStatus != null ? String(data.invoiceStatus) : data?.status != null ? String(data.status) : undefined,
    bookingStatus: data?.bookingStatus != null ? String(data.bookingStatus) : data?.status != null ? String(data.status) : undefined,
    paymentStatus: data?.paymentStatus != null ? String(data.paymentStatus) : undefined,
    customerUserId: data?.customerUserId != null ? String(data.customerUserId) : undefined,
    customerName: data?.customerName != null ? String(data.customerName) : undefined,
    representativeName: data?.representativeName != null ? String(data.representativeName) : undefined,
    representativePhone: data?.representativePhone != null ? String(data.representativePhone) : data?.customerPhone != null ? String(data.customerPhone) : undefined,
    representativeCccd: data?.representativeCccd != null ? String(data.representativeCccd) : undefined,
    checkInDate: data?.checkInDate != null ? String(data.checkInDate) : undefined,
    checkOutDate: data?.checkOutDate != null ? String(data.checkOutDate) : undefined,
    totalRooms: data?.totalRooms != null ? Number(data.totalRooms) : undefined,
    checkoutStaffId: data?.checkoutStaffId != null ? String(data.checkoutStaffId) : undefined,
    checkoutStaffName: data?.checkoutStaffName != null ? String(data.checkoutStaffName) : undefined,
    checkinStaffId: data?.checkinStaffId != null ? String(data.checkinStaffId) : undefined,
    checkinStaffName: data?.checkinStaffName != null ? String(data.checkinStaffName) : undefined,
    checkedInAt: data?.checkedInAt != null ? String(data.checkedInAt) : undefined,
    checkedOutAt: data?.checkedOutAt != null ? String(data.checkedOutAt) : undefined,
    refundTransactionId: data?.refundTransactionId != null ? String(data.refundTransactionId) : undefined,
    refundStatus: data?.refundStatus != null ? String(data.refundStatus) : undefined,
    refundSettlementAmount: data?.refundSettlementAmount != null ? Number(data.refundSettlementAmount) : undefined,
    totalOriginalAmount: data?.totalOriginalAmount != null ? Number(data.totalOriginalAmount) : data?.grossInvoiceAmount != null ? Number(data.grossInvoiceAmount) : undefined,
    totalUsedRoomAmount: data?.totalUsedRoomAmount != null ? Number(data.totalUsedRoomAmount) : undefined,
    totalUnusedRoomAmount: data?.totalUnusedRoomAmount != null ? Number(data.totalUnusedRoomAmount) : undefined,
    totalHotelKeepAmount: data?.totalHotelKeepAmount != null ? Number(data.totalHotelKeepAmount) : undefined,
    totalAllocatedPaidAmount: data?.totalAllocatedPaidAmount != null ? Number(data.totalAllocatedPaidAmount) : undefined,
    totalActualRevenue: data?.totalActualRevenue != null ? Number(data.totalActualRevenue) : undefined,
    totalRefundToCustomer: data?.totalRefundToCustomer != null ? Number(data.totalRefundToCustomer) : data?.totalRefundAmount != null ? Number(data.totalRefundAmount) : undefined,
    totalAdditionalCharge: data?.totalAdditionalCharge != null ? Number(data.totalAdditionalCharge) : undefined,
    roomServiceFeeTotal: data?.roomServiceFeeTotal != null ? Number(data.roomServiceFeeTotal) : undefined,
    bookingServiceTotal: data?.bookingServiceTotal != null ? Number(data.bookingServiceTotal) : undefined,
    draftServiceLinesTotal: data?.draftServiceLinesTotal != null ? Number(data.draftServiceLinesTotal) : undefined,
    damageFeeTotal: data?.damageFeeTotal != null ? Number(data.damageFeeTotal) : undefined,
    manualSurchargeTotal: data?.manualSurchargeTotal != null ? Number(data.manualSurchargeTotal) : undefined,
    lateCheckoutFeeTotal: data?.lateCheckoutFeeTotal != null ? Number(data.lateCheckoutFeeTotal) : undefined,
    earlyCheckinFeeTotal: data?.earlyCheckinFeeTotal != null ? Number(data.earlyCheckinFeeTotal) : undefined,
    totalAmount: data?.totalAmount != null ? Number(data.totalAmount) : data?.netRevenue != null ? Number(data.netRevenue) : data?.grossInvoiceAmount != null ? Number(data.grossInvoiceAmount) : undefined,
    paidAmount: data?.paidAmount != null ? Number(data.paidAmount) : undefined,
    amount: Number(data?.amount ?? data?.netRevenue ?? data?.totalActualRevenue ?? data?.grossInvoiceAmount ?? 0),
    currency: data?.currency != null ? String(data.currency) : undefined,
    lines: data?.lines,
    createdAt: data?.createdAt != null ? String(data.createdAt) : undefined,
  };
}

const mapBookingRoom = (item: any): BookingItem => ({
  id: String(item?.id ?? ''),
  roomId: normalizeOptionalId(item?.roomId) || '',
  roomTypeId: normalizeOptionalId(item?.roomTypeId),
  priceSnapshot: Number(item?.priceSnapshot ?? item?.pricePerNightAtBooking ?? 0),
  finalPrice: item?.finalPrice != null ? Number(item.finalPrice) : undefined,
  discount: item?.discount != null ? Number(item.discount) : undefined,
  status: item?.status,
  checkIn: item?.checkIn || item?.booking?.checkIn || '',
  checkOut: item?.checkOut || item?.booking?.checkOut || '',
  nights: Number(item?.nights || 0),
  actualCheckInAt: item?.actualCheckInAt,
  actualCheckOutAt: item?.actualCheckOutAt,
  representativeGuestId: item?.representativeGuestId != null ? String(item.representativeGuestId) : undefined,
  checkedInByStaffId: item?.checkedInByStaffId != null ? String(item.checkedInByStaffId) : undefined,
  checkedOutByStaffId: item?.checkedOutByStaffId != null ? String(item.checkedOutByStaffId) : undefined,
  roomCharge: item?.roomCharge != null ? Number(item.roomCharge) : undefined,
  serviceCharge: item?.serviceCharge != null ? Number(item.serviceCharge) : undefined,
  surcharge: item?.surcharge != null ? Number(item.surcharge) : undefined,
  damageFee: item?.damageFee != null ? Number(item.damageFee) : undefined,
  finalAmount: item?.finalAmount != null ? Number(item.finalAmount) : undefined,
  guests: Array.isArray(item?.guests) ? item.guests.map((guest: BookingGuestBackend) => mapBookingGuest(guest)) : [],
  bookingId: item?.bookingId != null ? String(item.bookingId) : undefined,
  bookingCode: item?.bookingCode != null ? String(item.bookingCode) : undefined,
  bookingPaymentStatus: item?.bookingPaymentStatus != null ? String(item.bookingPaymentStatus) : undefined,
  bookingStatus: item?.bookingStatus != null ? String(item.bookingStatus) : undefined,
  booking: item?.booking ? mapBooking(item.booking) : item?.bookingId != null ? {
    id: String(item.bookingId),
    bookingCode: item?.bookingCode != null ? String(item.bookingCode) : undefined,
    userId: '',
    checkIn: item?.checkIn || '',
    checkOut: item?.checkOut || '',
    totalPrice: 0,
    totalRooms: 0,
    totalGuests: 0,
    status: String(item?.bookingStatus || 'pending_payment').toLowerCase() as Booking['status'],
    guests: 0,
    items: [],
    createdAt: '',
    paymentStatus: item?.bookingPaymentStatus != null ? String(item.bookingPaymentStatus) : undefined,
  } : undefined,
});

const extractBookingRoomList = (payload: unknown): BookingItem[] => {
  if (Array.isArray(payload)) return payload.map(mapBookingRoom);
  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as any).data)) {
    return (payload as any).data.map(mapBookingRoom);
  }
  return [];
};

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

  getTodayCheckInRooms: async (date?: string): Promise<BookingItem[]> => {
    const response = await api.get<unknown>('/api/staff/booking-rooms/check-in-today', {
      params: { date: date || vietnamTodayISO() },
    });
    return extractBookingRoomList(response.data);
  },

  getInHouseRooms: async (): Promise<BookingItem[]> => {
    const response = await api.get<unknown>('/api/staff/booking-rooms/in-house');
    return extractBookingRoomList(response.data);
  },

  getTodayCheckoutRooms: async (date?: string): Promise<BookingItem[]> => {
    const response = await api.get<unknown>('/api/staff/booking-rooms/check-out-today', {
      params: { date: date || vietnamTodayISO() },
    });
    return extractBookingRoomList(response.data);
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

  getStaffBookings: async (): Promise<Booking[]> => {
    const response = await api.get<unknown>('/api/staff/bookings');
    return extractBookingList(response.data);
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

  checkInBookingRoom: async (
    bookingRoomId: string,
    payload?: { representativeCccd?: string; representativePhone?: string; representativeGuestId?: string }
  ): Promise<BookingItem> => {
    const response = await api.post<unknown>(`/api/staff/booking-rooms/${bookingRoomId}/check-in`, {
      representativeCccd: payload?.representativeCccd,
      representativePhone: payload?.representativePhone,
      representativeGuestId: payload?.representativeGuestId ? Number(payload.representativeGuestId) : undefined,
    });
    return mapBookingRoom(response.data);
  },

  checkInMultipleBookingRooms: async (
    bookingId: string,
    bookingRoomIds: string[],
    checkIns?: Array<{ bookingRoomId: string; representativeGuestId?: string; representativePhone?: string; representativeCccd?: string }>
  ): Promise<{ success: boolean; rooms: BookingItem[]; errors: string[] }> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/check-in-multiple`, {
      bookingRoomIds,
      checkIns: checkIns?.map((line) => ({
        bookingRoomId: Number(line.bookingRoomId),
        representativeGuestId: line.representativeGuestId ? Number(line.representativeGuestId) : undefined,
        representativePhone: line.representativePhone,
        representativeCccd: line.representativeCccd,
      })),
    });
    return {
      success: Boolean(response.data?.success),
      rooms: extractBookingRoomList(response.data?.rooms || []),
      errors: Array.isArray(response.data?.errors) ? response.data.errors.map(String) : [],
    };
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
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/checkout-preview`);
    const data = response.data ?? {};
    return {
      bookingId: String(data.bookingId ?? bookingId),
      lateMinutes: Number(data.lateMinutes ?? 0),
      lateCheckoutFee: Number(data.lateCheckoutFeeTotal ?? data.lateCheckoutFee ?? 0),
      paymentRequired: Boolean(data.paymentRequired),
      refundRequired: Boolean(data.refundRequired),
      bookingStatus: data.bookingStatus != null ? String(data.bookingStatus) : '',
      actualCheckoutAt: data.actualCheckOutAt != null ? String(data.actualCheckOutAt) : undefined,
      checkoutType: data.checkoutType != null ? String(data.checkoutType) : undefined,
      totalNights: data.usedNights != null ? Number(data.usedNights) : undefined,
      refundAmount: data.earlyCheckoutRefund != null ? Number(data.earlyCheckoutRefund) : undefined,
      refundRate: data.refundRate != null ? Number(data.refundRate) : undefined,
      effectivePricePerNight: undefined,
      finalAmount: data.grandTotal != null ? Number(data.grandTotal) : undefined,
      roomCharge: data.roomCharge != null ? Number(data.roomCharge) : undefined,
      actualRoomCharge: data.actualRoomCharge != null ? Number(data.actualRoomCharge) : undefined,
      taxAmount: undefined,
      discountAmount: undefined,
      grandTotal: data.grandTotal != null ? Number(data.grandTotal) : undefined,
      amountPaid: data.amountPaid != null ? Number(data.amountPaid) : undefined,
      remainingRoomAmount: undefined,
      remainingBalance: data.remainingBalance != null ? Number(data.remainingBalance) : undefined,
      refundSettlementAmount: data.refundSettlementAmount != null ? Number(data.refundSettlementAmount) : undefined,
      totalOriginalAmount: data.totalOriginalAmount != null ? Number(data.totalOriginalAmount) : undefined,
      totalUsedRoomAmount: data.totalUsedRoomAmount != null ? Number(data.totalUsedRoomAmount) : undefined,
      totalUnusedRoomAmount: data.totalUnusedRoomAmount != null ? Number(data.totalUnusedRoomAmount) : undefined,
      totalHotelKeepAmount: data.totalHotelKeepAmount != null ? Number(data.totalHotelKeepAmount) : undefined,
      totalAllocatedPaidAmount: data.totalAllocatedPaidAmount != null ? Number(data.totalAllocatedPaidAmount) : undefined,
      totalActualRevenue: data.totalActualRevenue != null ? Number(data.totalActualRevenue) : undefined,
      totalRefundToCustomer: data.totalRefundToCustomer != null ? Number(data.totalRefundToCustomer) : undefined,
      totalAdditionalCharge: data.totalAdditionalCharge != null ? Number(data.totalAdditionalCharge) : undefined,
      paymentStatus: data.refundRequired ? 'REFUND_REQUIRED' : data.paymentRequired ? 'PENDING_PAYMENT' : 'PAID',
      usedNights: data.usedNights != null ? Number(data.usedNights) : undefined,
      chargeNights: undefined,
      unusedNights: data.unusedNights != null ? Number(data.unusedNights) : undefined,
      representativeGuestId: undefined,
      representativeFullName: undefined,
      representativePhone: undefined,
      representativeCccd: undefined,
      checkedInByStaffId: undefined,
      checkedOutByStaffId: undefined,
      message: data.message != null ? String(data.message) : undefined,
      refundAllocations: undefined,
      serviceTotal: data.serviceTotal != null ? Number(data.serviceTotal) : undefined,
      roomServiceFeeTotal: data.roomServiceFeeTotal != null ? Number(data.roomServiceFeeTotal) : undefined,
      bookingServiceTotal: data.bookingServiceTotal != null ? Number(data.bookingServiceTotal) : undefined,
      serviceLines: Array.isArray(data.invoiceLines)
        ? data.invoiceLines
            .filter((item: any) => item?.itemType === 'BOOKING_SERVICE')
            .map((item: any) => ({
              id: item?.bookingRoomId != null ? String(item.bookingRoomId) : undefined,
              bookingId: bookingId,
              name: item?.description != null ? String(item.description) : undefined,
              quantity: item?.quantity != null ? Number(item.quantity) : undefined,
              unitPrice: item?.unitPrice != null ? Number(item.unitPrice) : undefined,
              lineTotal: item?.amount != null ? Number(item.amount) : undefined,
            }))
        : undefined,
    };
  },

  previewCheckout: async (
    bookingId: string,
    payload?: {
      bookingRoomIds?: string[];
      extraFees?: Array<{ bookingRoomId: string; serviceCharge?: number; surcharge?: number; damageFee?: number; note?: string }>;
      serviceLines?: Array<{ name: string; quantity?: number; unitPrice?: number; lineTotal?: number }>;
      paymentMethod?: 'CASH' | 'BANK_TRANSFER';
      receivedAmount?: number;
      changeAmount?: number;
    }
  ): Promise<BookingCheckoutPreview> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/checkout-preview`, payload ?? {});
    const data = response.data ?? {};
    return {
      bookingId: String(data.bookingId ?? bookingId),
      bookingCode: data.bookingCode != null ? String(data.bookingCode) : undefined,
      bookingStatus: data.bookingStatus != null ? String(data.bookingStatus) : undefined,
      currency: data.currency != null ? String(data.currency) : undefined,
      actualCheckOutAt: data.actualCheckOutAt != null ? String(data.actualCheckOutAt) : undefined,
      selectedRoomCount: data.selectedRoomCount != null ? Number(data.selectedRoomCount) : undefined,
      selectedRoomIds: Array.isArray(data.selectedRoomIds) ? data.selectedRoomIds.map((value: any) => String(value)) : undefined,
      roomSummaries: Array.isArray(data.roomSummaries)
        ? data.roomSummaries.map((item: any) => ({
            bookingRoomId: item?.bookingRoomId != null ? String(item.bookingRoomId) : undefined,
            roomId: item?.roomId != null ? String(item.roomId) : undefined,
            roomNumber: item?.roomNumber != null ? String(item.roomNumber) : undefined,
            roomTypeName: item?.roomTypeName != null ? String(item.roomTypeName) : undefined,
            roomOriginalAmount: item?.roomOriginalAmount != null ? Number(item.roomOriginalAmount) : undefined,
            roomCharge: item?.roomCharge != null ? Number(item.roomCharge) : undefined,
            usedRoomAmount: item?.usedRoomAmount != null ? Number(item.usedRoomAmount) : undefined,
            unusedRoomAmount: item?.unusedRoomAmount != null ? Number(item.unusedRoomAmount) : undefined,
            hotelKeepAmount: item?.hotelKeepAmount != null ? Number(item.hotelKeepAmount) : undefined,
            allocatedPaidAmount: item?.allocatedPaidAmount != null ? Number(item.allocatedPaidAmount) : undefined,
            actualRoomRevenue: item?.actualRoomRevenue != null ? Number(item.actualRoomRevenue) : undefined,
            serviceCharge: item?.serviceCharge != null ? Number(item.serviceCharge) : undefined,
            damageFee: item?.damageFee != null ? Number(item.damageFee) : undefined,
            manualSurcharge: item?.manualSurcharge != null ? Number(item.manualSurcharge) : undefined,
            lateCheckoutFee: item?.lateCheckoutFee != null ? Number(item.lateCheckoutFee) : undefined,
            totalAmount: item?.totalAmount != null ? Number(item.totalAmount) : undefined,
            actualCheckOutAt: item?.actualCheckOutAt != null ? String(item.actualCheckOutAt) : undefined,
            earlyCheckinFee: item?.earlyCheckinFee != null ? Number(item.earlyCheckinFee) : undefined,
            earlyCheckoutRefund: item?.earlyCheckoutRefund != null ? Number(item.earlyCheckoutRefund) : undefined,
            refundToCustomer: item?.refundToCustomer != null ? Number(item.refundToCustomer) : undefined,
            additionalCharge: item?.additionalCharge != null ? Number(item.additionalCharge) : undefined,
            extraCharges: item?.extraCharges != null ? Number(item.extraCharges) : undefined,
            paidAllocated: item?.paidAllocated != null ? Number(item.paidAllocated) : undefined,
            netRefundForRoom: item?.netRefundForRoom != null ? Number(item.netRefundForRoom) : undefined,
            additionalChargeForRoom: item?.additionalChargeForRoom != null ? Number(item.additionalChargeForRoom) : undefined,
          }))
        : undefined,
      invoiceLines: Array.isArray(data.invoiceLines)
        ? data.invoiceLines.map((item: any) => ({
            bookingRoomId: item?.bookingRoomId != null ? String(item.bookingRoomId) : undefined,
            roomId: item?.roomId != null ? String(item.roomId) : undefined,
            roomNumber: item?.roomNumber != null ? String(item.roomNumber) : undefined,
            roomTypeName: item?.roomTypeName != null ? String(item.roomTypeName) : undefined,
            itemType: item?.itemType != null ? String(item.itemType) : undefined,
            description: item?.description != null ? String(item.description) : undefined,
            quantity: item?.quantity != null ? Number(item.quantity) : undefined,
            unitPrice: item?.unitPrice != null ? Number(item.unitPrice) : undefined,
            amount: item?.amount != null ? Number(item.amount) : undefined,
          }))
        : undefined,
      roomCharge: data.roomCharge != null ? Number(data.roomCharge) : undefined,
      serviceTotal: data.serviceTotal != null ? Number(data.serviceTotal) : undefined,
      roomServiceFeeTotal: data.roomServiceFeeTotal != null ? Number(data.roomServiceFeeTotal) : undefined,
      bookingServiceTotal: data.bookingServiceTotal != null ? Number(data.bookingServiceTotal) : undefined,
      draftServiceLinesTotal: data.draftServiceLinesTotal != null ? Number(data.draftServiceLinesTotal) : undefined,
      manualServiceTotal: data.manualServiceTotal != null ? Number(data.manualServiceTotal) : undefined,
      damageFeeTotal: data.damageFeeTotal != null ? Number(data.damageFeeTotal) : undefined,
      manualSurchargeTotal: data.manualSurchargeTotal != null ? Number(data.manualSurchargeTotal) : undefined,
      lateCheckoutFeeTotal: data.lateCheckoutFeeTotal != null ? Number(data.lateCheckoutFeeTotal) : undefined,
      earlyCheckinFeeTotal: data.earlyCheckinFeeTotal != null ? Number(data.earlyCheckinFeeTotal) : undefined,
      earlyCheckoutRefund: data.earlyCheckoutRefund != null ? Number(data.earlyCheckoutRefund) : undefined,
      actualRoomCharge: data.actualRoomCharge != null ? Number(data.actualRoomCharge) : undefined,
      grandTotal: data.grandTotal != null ? Number(data.grandTotal) : undefined,
      amountPaid: data.amountPaid != null ? Number(data.amountPaid) : undefined,
      remainingBalance: data.remainingBalance != null ? Number(data.remainingBalance) : undefined,
      refundSettlementAmount: data.refundSettlementAmount != null ? Number(data.refundSettlementAmount) : undefined,
      totalOriginalAmount: data.totalOriginalAmount != null ? Number(data.totalOriginalAmount) : undefined,
      totalUsedRoomAmount: data.totalUsedRoomAmount != null ? Number(data.totalUsedRoomAmount) : undefined,
      totalUnusedRoomAmount: data.totalUnusedRoomAmount != null ? Number(data.totalUnusedRoomAmount) : undefined,
      totalHotelKeepAmount: data.totalHotelKeepAmount != null ? Number(data.totalHotelKeepAmount) : undefined,
      totalAllocatedPaidAmount: data.totalAllocatedPaidAmount != null ? Number(data.totalAllocatedPaidAmount) : undefined,
      totalActualRevenue: data.totalActualRevenue != null ? Number(data.totalActualRevenue) : undefined,
      totalRefundToCustomer: data.totalRefundToCustomer != null ? Number(data.totalRefundToCustomer) : undefined,
      totalAdditionalCharge: data.totalAdditionalCharge != null ? Number(data.totalAdditionalCharge) : undefined,
      paymentRequired: Boolean(data.paymentRequired),
      refundRequired: Boolean(data.refundRequired),
      checkoutType: data.checkoutType != null ? String(data.checkoutType) : undefined,
      usedNights: data.usedNights != null ? Number(data.usedNights) : undefined,
      unusedNights: data.unusedNights != null ? Number(data.unusedNights) : undefined,
      refundRate: data.refundRate != null ? Number(data.refundRate) : undefined,
      message: data.message != null ? String(data.message) : undefined,
    };
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

  checkOutBookingRoom: async (
    bookingRoomId: string,
    payload?: { serviceCharge?: number; surcharge?: number; damageFee?: number; note?: string }
  ): Promise<BookingItem> => {
    const response = await api.post<unknown>(`/api/staff/booking-rooms/${bookingRoomId}/check-out`, payload ?? {});
    return mapBookingRoom(response.data);
  },

  checkOutMultipleBookingRooms: async (
    bookingId: string,
    bookingRoomIds: string[],
    extraFees?: Array<{ bookingRoomId: string; serviceCharge?: number; surcharge?: number; damageFee?: number; note?: string }>,
    payment?: { paymentMethod?: 'CASH' | 'BANK_TRANSFER'; receivedAmount?: number; changeAmount?: number }
  ): Promise<{ success: boolean; rooms: BookingItem[]; errors: string[]; invoiceId?: string; invoiceCode?: string }> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/check-out-multiple`, { bookingRoomIds, extraFees, ...payment });
    return {
      success: Boolean(response.data?.success),
      rooms: extractBookingRoomList(response.data?.rooms || []),
      errors: Array.isArray(response.data?.errors) ? response.data.errors.map(String) : [],
      invoiceId: response.data?.invoiceId != null ? String(response.data.invoiceId) : undefined,
      invoiceCode: response.data?.invoiceCode != null ? String(response.data.invoiceCode) : undefined,
    };
  },

  completeCheckout: async (bookingId: string): Promise<Booking> => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/checkout/complete`);
    return extractSingleBooking(response.data);
  },

  getInvoice: async (bookingId: string): Promise<BookingInvoiceRecord> => {
    const response = await api.get<unknown>(`/api/staff/bookings/${bookingId}/invoice`);
    const responseData = response.data as any;
    return mapBookingInvoiceRecord(responseData?.data ?? responseData);
  },

  getInvoices: async (): Promise<BookingInvoiceRecord[]> => {
    const response = await api.get<unknown>(`/api/staff/invoices`);
    const responseData = response.data as any;
    const payload = Array.isArray(responseData) ? responseData : responseData?.data ?? [];
    return Array.isArray(payload) ? payload.map(mapBookingInvoiceRecord) : [];
  },

  searchInvoices: async (params: { page?: number; size?: number; invoiceCode?: string; bookingCode?: string; customerName?: string; date?: string; fromDate?: string; toDate?: string; status?: string[]; paymentStatus?: string }): Promise<{ content: BookingInvoiceRecord[]; totalElements: number; totalPages: number }> => {
    const requestParams = { ...params, invoiceStatus: params.status };
    delete (requestParams as any).status;
    const response = await api.get<any>(`/api/staff/invoices/search`, { params: requestParams });
    const data = response.data;
    return {
      content: Array.isArray(data?.content) ? data.content.map(mapBookingInvoiceRecord) : [],
      totalElements: data?.totalElements || 0,
      totalPages: data?.totalPages || 0,
    };
  },

  // Service lines (room service) management for staff
  getServiceLines: async (bookingId: string) => {
    const response = await api.get<unknown>(`/api/staff/bookings/${bookingId}/services`);
    const responseData = response.data as any;
    return Array.isArray(responseData) ? responseData : responseData?.data ?? [];
  },

  addServiceLine: async (bookingId: string, payload: { name: string; quantity?: number; unitPrice?: number }) => {
    const response = await api.post<unknown>(`/api/staff/bookings/${bookingId}/services`, payload);
    const responseData = response.data as any;
    return responseData?.data ?? responseData;
  },

  deleteServiceLine: async (bookingId: string, lineId: string) => {
    const response = await api.delete<unknown>(`/api/staff/bookings/${bookingId}/services/${lineId}`);
    return response.data;
  },

  changeRoom: async (
    bookingId: string,
    payload: { fromRoomId?: string; toRoomId: string; oldRoomNextStatus?: 'CLEANING' | 'AVAILABLE'; reason?: string }
  ): Promise<RoomChangeResponse> => {
    const response = await api.post<any>(`/api/staff/bookings/${bookingId}/room-change`, {
      fromRoomId: payload.fromRoomId ? Number(payload.fromRoomId) : undefined,
      toRoomId: Number(payload.toRoomId),
      oldRoomNextStatus: payload.oldRoomNextStatus || 'CLEANING',
      reason: payload.reason,
    });
    const data = response.data?.data ?? response.data;
    return {
      bookingId: String(data.bookingId ?? bookingId),
      fromRoomId: String(data.fromRoomId ?? ''),
      toRoomId: String(data.toRoomId ?? ''),
      remainingNights: Number(data.remainingNights || 0),
      oldNightlyPrice: Number(data.oldNightlyPrice || 0),
      newNightlyPrice: Number(data.newNightlyPrice || 0),
      priceDifferencePerNight: Number(data.priceDifferencePerNight || 0),
      totalDifference: Number(data.totalDifference || 0),
      paymentAction: String(data.paymentAction || 'NONE'),
      oldRoomNextStatus: String(data.oldRoomNextStatus || 'CLEANING'),
      booking: data.booking ? mapBooking(data.booking as BookingBackend) : undefined,
    };
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

// ─── New Invoice Management API (v2) ────────────────────────────────────────
export interface InvoiceListItem {
  id: number;
  invoiceCode: string;
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  roomNumbers: string;
  createdAt: string;
  grossInvoiceAmount: number;
  totalRefundAmount: number;
  netRevenue: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  invoiceStatus: string;
  paymentStatus: string; // UNPAID | PARTIALLY_PAID | PAID | REFUNDED
}

export interface InvoiceSummaryV2 {
  totalInvoices: number;
  grossInvoiceAmount: number;
  totalRefundAmount: number;
  netRevenue: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  refundedInvoiceCount: number;
  todayInvoiceCount: number;
  totalActualRevenue: number;
  totalRefundedAmount: number;
  totalPendingRefundAmount: number;
  totalAdditionalCharge: number;
  totalRemainingToPay: number;
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  partiallyPaidInvoiceCount: number;
  partialInvoiceCount?: number;
  completedInvoiceCount?: number;
}

export interface InvoiceSearchResponse {
  content: InvoiceListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: InvoiceSummaryV2;
}

export interface InvoiceDetailResponse {
  id: number;
  invoiceCode: string;
  bookingId: number;
  bookingCode: string;
  createdAt: string;
  checkoutStaff: string;
  checkoutStaffId?: string;
  checkoutStaffName?: string;
  checkinStaff?: string;
  checkinStaffId?: string;
  checkinStaffName?: string;
  processedByStaffId?: string;
  processedBy?: string;
  processedByName?: string;
  checkoutTime?: string;
  invoiceStatus?: string;
  bookingStatus?: string;
  status?: string;
  paymentStatus?: string;
  refundStatus?: string;
  customer: { fullName: string; phone: string; cccd: string } | null;
  rooms: Array<{
    roomName: string;
    roomCode?: string;
    roomType: string;
    checkInDate?: string;
    plannedCheckoutDate?: string;
    actualCheckoutDate?: string;
    originalAmount: number;
    usedAmount: number;
    unusedAmount: number;
    earlyCheckoutRefund: number;
    hotelKeepAmount: number;
    netRevenue: number;
    allocatedPaidAmount: number;
    roomStatus?: string;
  }>;
  serviceCharges: Array<{ category: string; itemName: string; amount: number; quantity: number }>;
  damageCharges: Array<{ itemName: string; amount: number; note: string }>;
  invoiceLines?: Array<Record<string, any>>;
  paymentHistory: {
    records: Array<{
      id?: number;
      time: string;
      paidAt?: string;
      amount: number;
      method: string;
      status: string;
      paymentType?: string;
      invoiceCategory?: string;
      transactionId?: string;
      paymentCode?: string;
      vnpTransactionNo?: string;
      payerName?: string;
      payerPhone?: string;
    }>;
  };
  refundHistory: { records: Array<{ time: string; amount: number; reason: string; staff: string }> };
  revenueSummary: {
    totalRoomAmount: number;
    totalServiceAmount: number;
    totalDamageAmount: number;
    grossInvoiceAmount: number;
    totalEarlyCheckoutRefundAmount: number;
    netRevenue: number;
    totalPaidAmount: number;
    totalAllocatedPaidAmount?: number;
    totalActualRevenue?: number;
    remainingAmount: number;
    refundToCustomer: number;
    alreadyRefundedAmount?: number;
    pendingRefundAmount?: number;
    additionalRefundAmount?: number;
    additionalChargeAmount?: number;
    remainingToPay?: number;
  };
}

export interface InvoiceSearchParams {
  invoiceCode?: string;
  bookingCode?: string;
  customerName?: string;
  customerPhone?: string;
  specificDate?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  invoiceStatus?: string[];
  paymentStatus?: string;
  page?: number;
  size?: number;
}

export const newInvoiceApi = {
  search: async (params: InvoiceSearchParams): Promise<InvoiceSearchResponse> => {
    const p: Record<string, any> = { page: params.page ?? 0, size: params.size ?? 10 };
    if (params.invoiceCode) p.invoiceCode = params.invoiceCode;
    if (params.bookingCode) p.bookingCode = params.bookingCode;
    if (params.customerName) p.customerName = params.customerName;
    if (params.customerPhone) p.customerPhone = params.customerPhone;
    if (params.specificDate) p.specificDate = params.specificDate;
    if (params.date) p.date = params.date;
    if (params.fromDate) p.fromDate = params.fromDate;
    if (params.toDate) p.toDate = params.toDate;
    if (params.invoiceStatus && params.invoiceStatus.length > 0) p.invoiceStatus = params.invoiceStatus.join(',');
    if (params.paymentStatus && params.paymentStatus !== 'ALL') p.paymentStatus = params.paymentStatus;
    const response = await api.get<InvoiceSearchResponse>('/api/staff/invoices/search', { params: p });
    // Normalize numbers from backend BigDecimal strings
    const data = response.data;
    const norm = (v: any) => Number(v ?? 0);
    if (data.summary) {
      data.summary.grossInvoiceAmount = norm(data.summary.grossInvoiceAmount);
      data.summary.totalRefundAmount = norm(data.summary.totalRefundAmount);
      data.summary.netRevenue = norm(data.summary.netRevenue);
      data.summary.totalPaidAmount = norm(data.summary.totalPaidAmount);
      data.summary.totalRemainingAmount = norm(data.summary.totalRemainingAmount);
      data.summary.totalActualRevenue = norm(data.summary.totalActualRevenue);
      data.summary.totalRefundedAmount = norm(data.summary.totalRefundedAmount);
      data.summary.totalPendingRefundAmount = norm(data.summary.totalPendingRefundAmount);
      data.summary.totalAdditionalCharge = norm(data.summary.totalAdditionalCharge);
      data.summary.totalRemainingToPay = norm(data.summary.totalRemainingToPay);
      data.summary.partialInvoiceCount = norm(data.summary.partialInvoiceCount);
      data.summary.completedInvoiceCount = norm(data.summary.completedInvoiceCount);
    }
    if (data.content) {
      data.content = data.content.map(inv => ({
        ...inv,
        grossInvoiceAmount: norm(inv.grossInvoiceAmount),
        totalRefundAmount: norm(inv.totalRefundAmount),
        netRevenue: norm(inv.netRevenue),
        paidAmount: norm(inv.paidAmount),
        remainingAmount: norm(inv.remainingAmount),
      }));
    }
    return data;
  },

  getDetail: async (invoiceId: number): Promise<InvoiceDetailResponse> => {
    const response = await api.get<InvoiceDetailResponse>(`/api/staff/invoices/${invoiceId}`);
    const d = response.data;
    const norm = (v: any) => Number(v ?? 0);
    if (d.revenueSummary) {
      const rs = d.revenueSummary;
      rs.totalRoomAmount = norm(rs.totalRoomAmount);
      rs.totalServiceAmount = norm(rs.totalServiceAmount);
      rs.totalDamageAmount = norm(rs.totalDamageAmount);
      rs.grossInvoiceAmount = norm(rs.grossInvoiceAmount);
      rs.totalEarlyCheckoutRefundAmount = norm(rs.totalEarlyCheckoutRefundAmount);
      rs.netRevenue = norm(rs.netRevenue);
      rs.totalPaidAmount = norm(rs.totalPaidAmount);
      rs.totalAllocatedPaidAmount = norm(rs.totalAllocatedPaidAmount);
      rs.totalActualRevenue = norm(rs.totalActualRevenue);
      rs.remainingAmount = norm(rs.remainingAmount);
      rs.refundToCustomer = norm(rs.refundToCustomer);
      rs.alreadyRefundedAmount = norm(rs.alreadyRefundedAmount);
      rs.pendingRefundAmount = norm(rs.pendingRefundAmount);
      rs.additionalRefundAmount = norm(rs.additionalRefundAmount);
      rs.additionalChargeAmount = norm(rs.additionalChargeAmount);
      rs.remainingToPay = norm(rs.remainingToPay);
    }
    if (d.rooms) d.rooms = d.rooms.map(r => ({ ...r, originalAmount: norm(r.originalAmount), usedAmount: norm(r.usedAmount), unusedAmount: norm(r.unusedAmount), earlyCheckoutRefund: norm(r.earlyCheckoutRefund), hotelKeepAmount: norm(r.hotelKeepAmount), netRevenue: norm(r.netRevenue), allocatedPaidAmount: norm(r.allocatedPaidAmount) }));
    if (d.paymentHistory?.records) {
      d.paymentHistory.records = d.paymentHistory.records.map(p => ({ ...p, amount: norm(p.amount) }));
    }
    return d;
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

export const customerApi = {
  getAll: (params?: { keyword?: string; active?: boolean }) =>
    userHttp.get<CustomerBackend[]>('/api/users/customers', { params }),

  create: (payload: CreateCustomerPayload) =>
    userHttp.post<CustomerBackend>('/api/users/customers', payload),

  update: (customerId: number, payload: UpdateCustomerPayload) =>
    userHttp.put<CustomerBackend>(`/api/users/customers/${customerId}`, payload),

  updateStatus: (customerId: number, active: boolean) =>
    userHttp.patch<CustomerBackend>(`/api/users/customers/${customerId}/status`, null, {
      params: { active },
    }),
};

export const shiftApi = {
  getAll: () => userHttp.get<any[]>('/api/shifts'),

  getScheduleByWeek: (weekStart: string) =>
    userHttp.get<any[]>('/api/shifts/schedule', { params: { weekStart } }),

  getMySchedule: (weekStart: string) =>
    userHttp.get<any[]>('/api/shifts/my-schedule', { params: { weekStart } }),

  saveSchedule: (data: any) =>
    userHttp.post<any>('/api/shifts/schedule/save', data),

  copyWeek: (data: any) =>
    userHttp.post<any>('/api/shifts/schedule/copy-week', data),

  replaceShift: (scheduleId: number, data: any) =>
    userHttp.patch<any>(`/api/shifts/schedule/${scheduleId}/replace`, data),

  resetSchedule: (scheduleId: number) =>
    userHttp.patch<any>(`/api/shifts/schedule/${scheduleId}/reset`),

  checkin: (data: any) =>
    userHttp.post<any>('/api/shifts/checkin', data),

  checkout: (data: any) =>
    userHttp.post<any>('/api/shifts/checkout', data),

  getDashboard: (date: string) =>
    userHttp.get<any>('/api/shifts/dashboard', { params: { date } }),

  getCheckinHistory: () =>
    userHttp.get<any[]>('/api/shifts/checkin-history'),
};

attachAuthInterceptors(api);
attachAuthInterceptors(userHttp);
attachAuthInterceptors(roomHttp);
attachAuthInterceptors(paymentHttp);
attachAuthInterceptors(notificationHttp);
attachAuthInterceptors(authResourceHttp);

export default api;
