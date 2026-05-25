export interface Bed {
  type: string;
  quantity: number;
}

export interface Amenity {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isChargeable: boolean;
  isActive: boolean;
}

export interface RoomAmenity {
  id: number;
  amenity: Amenity;
  isActive: boolean;
}

export interface RoomImage {
  imageUrl: string;
  isThumbnail: boolean;
}

export interface RoomTypeBedConfig {
  id: number;
  quantity: number;
  isPrimary: boolean;
  bedType: {
    id: number;
    code: string;
    name: string;
    maxOccupantsPerBed: number;
  };
}

export interface RoomType {
  id: string;
  type: string;
  basePrice: number;
  maxCapacity: number;
  defaultCapacity: number;
  description: string;
  images: RoomImage[];
  bedConfigs?: RoomTypeBedConfig[];
}

export interface Room {
  id: string;
  name: string;
  roomNumber: string;
  maxCapacity: number;
  price?: number;
  viewType: string;
  areaM2: number;
  hasBalcony: boolean;
  hasBathtub: boolean;
  smokingPolicy: 'NON_SMOKING' | 'SMOKING';
  isAccessible: boolean;
  isConnecting: boolean;
  connectedRoomId?: number;
  floorNumber: number;
  floorLevel: string;
  status: string;
  maintenanceStatus: string;
  roomType: RoomType;
  beds: Bed[];
  amenities: RoomAmenity[];
}

export interface BookingItem {
  id?: string;
  roomId: string;
  roomTypeId?: string;
  priceSnapshot: number;
  finalPrice?: number;
  discount?: number;
  status?: 'ACTIVE' | 'CANCELLED';
  checkIn: string;
  checkOut: string;
  nights: number;
}

export interface Booking {
  id: string;
  bookingCode?: string;
  userId: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
  subtotal?: number;
  discountTotal?: number;
  taxAmount?: number;
  totalPrice: number;
  totalRooms?: number;
  totalGuests?: number;
  status: 'pending_payment' | 'pending' | 'deposit_paid' | 'confirmed' | 'checked_in' | 'checkout_pending_payment' | 'checked_out' | 'completed' | 'cancel_requested' | 'cancelled' | 'no_show';
  guests: number;
  items: BookingItem[];
  createdAt: string;
  confirmedAt?: string;
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
  reservationExpiredAt?: string;
  lockStatus?: 'ACTIVE' | 'EXPIRED' | 'CONFIRMED';
  source?: 'WEB' | 'MOBILE' | 'ADMIN';
  notes?: string;
  currency?: string;
}

export interface BookingGuest {
  id: string;
  bookingId: string;
  roomId?: string;
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
  fullName?: string;
  phone: string;
  phoneNumber?: string;
  role: string;
  dateOfBirth?: string;
  address?: string;
  imageUrl?: string;
}

export interface UserProfile {
  id?: string | number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: boolean;
  address?: string;
  imageUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface SearchFilters {
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}
