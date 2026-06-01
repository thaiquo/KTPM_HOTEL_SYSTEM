import type { Booking } from '../../../types';

const PAID_STATUSES: Booking['status'][] = ['deposit_paid', 'confirmed', 'booked', 'checked_in', 'completed', 'cancel_requested'];
const CANCELABLE_STATUSES: Booking['status'][] = ['deposit_paid', 'confirmed'];
const PAID_PAYMENT_STATUSES = [
  'PAID',
  'DEPOSITED',
  'SUCCESS',
  'COMPLETED',
  'REFUND_PENDING',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'NO_REFUND',
];

export const isPaidBookingRecord = (booking: Booking) => {
  if (PAID_STATUSES.includes(booking.status)) return true;

  const paymentStatus = booking.paymentStatus?.toUpperCase();
  if (paymentStatus && PAID_PAYMENT_STATUSES.includes(paymentStatus)) return true;

  if (booking.status === 'cancelled' && paymentStatus && PAID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return true;
  }

  return booking.status === 'cancelled' && Number(booking.paidAmount || 0) > 0;
};

export const canRequestBookingCancel = (booking: Booking) => CANCELABLE_STATUSES.includes(booking.status);

export const getBookingPaidAmount = (booking: Booking) => {
  const paidAmount = Number(booking.paidAmount || 0);
  if (paidAmount > 0) return paidAmount;

  if (booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'completed') {
    return Number(booking.totalPrice || 0);
  }

  if (booking.status === 'deposit_paid') {
    return Number(booking.depositAmount || 0);
  }

  if (booking.status === 'cancelled') {
    const paymentStatus = booking.paymentStatus?.toUpperCase();
    if (paymentStatus === 'PAID') return Number(booking.totalPrice || 0);
    if (paymentStatus === 'DEPOSITED') return Number(booking.depositAmount || 0);
  }

  return 0;
};

export const getPaymentReferenceText = (booking: Booking) => {
  if (booking.paymentTransactionId) return booking.paymentTransactionId;
  if (getBookingPaidAmount(booking) > 0) return 'Đang đồng bộ từ cổng thanh toán';
  return 'Chưa có giao dịch';
};

export const getBookingStatusText = (status: Booking['status']) => {
  switch (status) {
    case 'deposit_paid':
      return 'Đã đặt cọc';
    case 'confirmed':
      return 'Đã thanh toán';
    case 'booked':
      return 'Đã thanh toán';
    case 'checked_in':
      return 'Đã nhận phòng';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    case 'cancel_requested':
      return 'Chờ nhân viên xác nhận hủy';
    default:
      return 'Chờ thanh toán';
  }
};
