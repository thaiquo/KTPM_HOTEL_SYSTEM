import axios from 'axios';

const ROOM_SERVICE_URL = import.meta.env.VITE_ROOM_API_URL || '/room-api';
const BOOKING_SERVICE_URL = import.meta.env.VITE_BOOKING_API_URL || '/booking-api';
const USER_SERVICE_URL = import.meta.env.VITE_USER_API_URL || '/user-api';
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_API_URL || '/auth-api';
const PAYMENT_SERVICE_URL = import.meta.env.VITE_PAYMENT_API_URL || '/payment-api';
const NOTIFICATION_SERVICE_URL = import.meta.env.VITE_NOTIFICATION_API_URL || '/notification-api';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000;

const createAxiosInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (import.meta.env.DEV) {
        console.error('API ERROR:', {
          url: error?.config?.url,
          method: error?.config?.method,
          status: error?.response?.status,
          message: error?.message,
          data: error?.response?.data,
        });
      }
      if (error.response?.status === 401) {
        // Handle token refresh or logout here
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const roomHttp = createAxiosInstance(ROOM_SERVICE_URL);
export const bookingHttp = createAxiosInstance(BOOKING_SERVICE_URL);
export const userHttp = createAxiosInstance(USER_SERVICE_URL);
export const authHttp = createAxiosInstance(AUTH_SERVICE_URL);
export const paymentHttp = createAxiosInstance(PAYMENT_SERVICE_URL);
export const notificationHttp = createAxiosInstance(NOTIFICATION_SERVICE_URL);
