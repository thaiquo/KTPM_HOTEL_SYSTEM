export interface Room {
  id: string;
  name: string;
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
  status: 'pending_payment' | 'pending' | 'deposit_paid' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  guests: number;
  rooms: number;
  createdAt: string;
  ratePlan?: 'FLEXIBLE' | 'NON_REFUNDABLE';
  paymentType?: string;
  paymentStatus?: string;
  paidAmount?: number;
  depositAmount?: number;
  paymentTransactionId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
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
  phoneNumber?: string;
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
