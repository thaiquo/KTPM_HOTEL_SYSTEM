import axios from 'axios';
import type { Room, Booking, User, UserProfile, ApiResponse, SearchFilters } from '../types';

type RoomBackend = {
  id: number | string;
  roomNumber?: string;
  name?: string;
  type?: string;
  price?: number;
  status?: string;
  maxGuests?: number;
  description?: string;
  imageUrl?: string;
  images?: string[];
  amenities?: string[];
  available?: boolean;
};

type BookingBackend = {
  id?: number | string;
  roomId?: number | string;
  userId?: number | string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  createdAt?: string;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_BOOKING_API_URL || '/booking-api',
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

const DEFAULT_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800';

const mapRoom = (room: RoomBackend): Room => {
  const roomId = String(room.id);
  const roomName = room.name || (room.roomNumber ? `Phòng ${room.roomNumber}` : `Phòng ${roomId}`);

  return {
    id: roomId,
    name: roomName,
    type: room.type || 'Standard',
    price: room.price ?? 0,
    maxGuests: room.maxGuests ?? 2,
    images: room.images?.length ? room.images : [room.imageUrl || DEFAULT_ROOM_IMAGE],
    amenities: room.amenities?.length ? room.amenities : ['WiFi', 'TV', 'AC'],
    description: room.description || 'Phòng với đầy đủ tiện nghi hiện đại',
    available:
      typeof room.available === 'boolean'
        ? room.available
        : (room.status || '').toUpperCase() === 'AVAILABLE',
  };
};

const mapBooking = (booking: BookingBackend): Booking => {
  const rawStatus = String(booking.status || 'PENDING').toLowerCase();
  const status = (['pending', 'confirmed', 'cancelled'].includes(rawStatus) ? rawStatus : 'pending') as Booking['status'];

  return {
    id: String(booking.id ?? ''),
    roomId: String(booking.roomId ?? ''),
    userId: String(booking.userId ?? ''),
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    totalPrice: 0,
    status,
    guests: 0,
    rooms: 0,
    createdAt: booking.createdAt || '',
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
  
  checkAvailability: (roomId: string, checkIn: string, checkOut: string) =>
    roomHttp.post<ApiResponse<boolean>>('/rooms/check-availability', { roomId, checkIn, checkOut }),
};

// Booking APIs
export const bookingApi = {
  create: async (bookingData: { roomId: number; userId: number; checkIn: string; checkOut: string }): Promise<Booking> => {
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
    password: string;
    role?: string;
  }) =>
    authHttp.post<string>('/auth/register', {
      name: payload.name || '',
      email: payload.email,
      phoneNumber: payload.phoneNumber || payload.phone || '',
      dateOfBirth: payload.dateOfBirth || '',
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
  getMe: () => userHttp.get<UserProfile>('/users/me'),
  updateMe: (profile: UserProfile) => userHttp.put<UserProfile>('/users/me', profile),
  createProfile: (profile: UserProfile) => userHttp.post<UserProfile>('/users', profile),
};

export default api;