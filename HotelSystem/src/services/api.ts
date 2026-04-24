import axios from 'axios';
import type { Room, Booking, User, UserProfile, ApiResponse, SearchFilters } from '../types';

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

const DEFAULT_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800';

const mapRoom = (room: RoomBackend): Room => {
  return {
    id: String(room.id),
    roomNumber: room.roomNumber,
    type: room.roomType.type,
    price: room.roomType.basePrice,
    maxGuests: room.actualCapacity || room.roomType.maxCapacity,
    images: room.roomType.images?.map(img => img.imageUrl) || [],
    amenities: [], 
    description: room.roomType.description,
    available: room.status === 'AVAILABLE',
    floor: room.floor,
    bedType: room.beds?.map(b => `${b.quantity} ${b.type}`).join(', ') || 'Chưa cấu hình',
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
attachAuthInterceptors(authResourceHttp);
attachAuthInterceptors(roomHttp);

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
    return roomHttp.post<{url: string}>('/rooms/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
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