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
  status?: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'OCCUPIED' | 'HOLD';
  note?: string;
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
  status: 'pending_payment' | 'pending' | 'deposit_paid' | 'confirmed' | 'checked_in' | 'checkout_pending_payment' | 'checked_out' | 'completed' | 'cancel_requested' | 'cancelled' | 'no_show';
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
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
}

export interface BookingGuest {
  id: string;
  bookingId: string;
  fullName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  cccd?: string;
  note?: string;
  type?: 'ADULT' | 'CHILD';
  primaryGuest?: boolean;
  checkInPerson?: boolean;
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
