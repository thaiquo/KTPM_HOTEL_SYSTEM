import axios from 'axios';

const ROOM_SERVICE_URL = 'http://localhost:8081/api';
const BOOKING_SERVICE_URL = 'http://localhost:8082/api';
const USER_SERVICE_URL = 'http://localhost:8083/api';
const AUTH_SERVICE_URL = 'http://localhost:8083/api';

const createAxiosInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
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
export const notificationHttp = userHttp; 
export const paymentHttp = bookingHttp; 
