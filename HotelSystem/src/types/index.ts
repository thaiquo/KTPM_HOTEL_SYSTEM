export interface Room {
  id: string;
  roomNumber: string;
  type: string;
  price: number;
  maxGuests: number;
  images: string[];
  amenities: string[];
  description: string;
  available: boolean;
  floor: number;
  bedType: string;
}

export interface BookingData {
  location: string;
  checkIn: Date;
  checkOut: Date;
  rooms: number;
  guests: number;
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  guests: number;
  rooms: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  gender?: boolean;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface UserProfile {
  id?: number;
  userId?: number;
  fullName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
}

export interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  roomType?: string;
  maxGuests?: number;
  checkIn?: string;
  checkOut?: string;
}