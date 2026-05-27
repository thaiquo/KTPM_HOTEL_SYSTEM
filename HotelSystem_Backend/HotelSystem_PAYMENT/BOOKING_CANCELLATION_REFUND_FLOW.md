# Booking Cancellation with Refund Flow - Implementation Guide

## Overview

This document outlines the corrected booking cancellation and refund flow for the hotel management system. The previous implementation was incomplete - it only marked payments as FAILED without creating proper refund transactions or linking to source payments.

## Fixed Issues

### Previous Problems

1. ❌ **No Original Transaction Link**: Cancelled payments had no reference to the original successful payment
2. ❌ **Wrong Status**: Used FAILED status instead of CANCELLED
3. ❌ **No Refund Workflow**: No way for staff to review and approve refunds
4. ❌ **No Room Status Reset**: Cancelled bookings didn't release the room back to AVAILABLE
5. ❌ **No Refund Eligibility Check**: Didn't distinguish between refundable vs non-refundable cancellations

### Solutions Implemented

✅ **Proper Transaction Linking**: RefundTransaction now has `originalPaymentId` to track source
✅ **Correct Status Handling**: Original payment marked as CANCELLED, creates RefundTransaction with STAFF_REVIEW
✅ **Refund Approval Workflow**: Staff can review and approve refunds before payment is processed
✅ **Automatic Room Release**: Sends `room.release` message to reset room status to AVAILABLE
✅ **Refund Eligibility**: Supports both refundable and non-refundable cancellations

## New API Endpoint

### POST `/payment/booking/cancel`

**Request Body (BookingCancellationRequest)**

```json
{
  "bookingId": 41,
  "userId": 1,
  "eligibleForRefund": true,
  "refundAmount": 12800000.0,
  "cancellationReason": "Customer requested cancellation",
  "originalTransactionId": "VNP_TXN_20260520_12345"
}
```

**Response (BookingCancellationResponse)**

```json
{
  "bookingId": 41,
  "status": "PENDING_REFUND_APPROVAL",
  "refundTransactionId": 123,
  "refundAmount": 12800000.0,
  "originalPaymentId": 456,
  "message": "Refund request created for staff approval. RefundTransaction ID: 123"
}
```

**Status Values**

- `PENDING_REFUND_APPROVAL`: Refund created and waiting for staff review
- `CANCELLED_NO_REFUND`: Booking cancelled without refund per policy
- `NO_PAYMENT_FOUND`: No original payment exists for the booking

## Cancellation Flow Diagram

### Case 1: With Refund (Eligible)

```
Customer Request
    ↓
Find Original Payment
    ↓
Mark Payment as CANCELLED
    ↓
Create RefundTransaction (STAFF_REVIEW)
    ↓
Release Room to AVAILABLE
    ↓
Response: PENDING_REFUND_APPROVAL
    ↓
Staff Reviews RefundTransaction
    ↓
Staff Approves → Payment Processor Creates Invoice (REFUND category)
Staff Rejects → Cancellation ends
```

### Case 2: Without Refund (Per Policy)

```
Customer Request
    ↓
Find Original Payment
    ↓
Mark Payment as CANCELLED
    ↓
NO RefundTransaction created
    ↓
Release Room to AVAILABLE
    ↓
Response: CANCELLED_NO_REFUND
    ↓
Booking cancelled successfully
```

## Database Changes

### New Enum Values

**RefundReason**

```java
public enum RefundReason {
    EARLY_CHECKOUT,
    BOOKING_CANCELLATION  // NEW
}
```

**RefundTransactionStatus**

```java
public enum RefundTransactionStatus {
    PENDING,
    PENDING_APPROVAL,
    STAFF_REVIEW,          // NEW - for cancellation reviews
    COMPLETED,
    FAILED
}
```

### RefundTransaction Fields Used

- `originalPaymentId`: Links to the source payment being refunded
- `reason`: BOOKING_CANCELLATION
- `status`: STAFF_REVIEW (waiting for staff approval)
- `processedByStaffId`: Will be set when staff approves/rejects

## Messaging Integration

### Room Service Communication

When a booking is cancelled, the system automatically sends a message to the Room service:

```
Exchange: hotel.exchange
Routing Key: room.release
Message Type: RoomMessage
{
  "bookingId": 41,
  "roomId": null,    // Optional, Room service will resolve from booking
  "action": "RELEASE"
}
```

This causes the Room service to set the room status to AVAILABLE.

## Implementation Files Modified

### 1. Enums

- `RefundReason.java` - Added BOOKING_CANCELLATION
- `RefundTransactionStatus.java` - Added STAFF_REVIEW

### 2. DTOs (New)

- `BookingCancellationRequest.java` - Request model
- `BookingCancellationResponse.java` - Response model
- `RoomMessage.java` - Already exists, used for messaging

### 3. Configuration

- `RabbitConfig.java` - Added room routing key constants

### 4. Business Logic

- `PaymentService.java` - New `cancelBooking()` method
- `PaymentService.java` - Updated `cancelCheckinPayment()` to use new logic

### 5. API Layer

- `PaymentController.java` - New endpoint POST `/payment/booking/cancel`

## Usage Examples

### Example 1: Cancel with Refund

```bash
curl -X POST http://localhost:8080/payment/booking/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 41,
    "userId": 1,
    "eligibleForRefund": true,
    "refundAmount": 12800000.0,
    "cancellationReason": "Customer changed plans"
  }'
```

### Example 2: Cancel without Refund (Per Policy)

```bash
curl -X POST http://localhost:8080/payment/booking/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 41,
    "userId": 1,
    "eligibleForRefund": false,
    "refundAmount": 0,
    "cancellationReason": "Cancelled after cutoff time"
  }'
```

## Testing Checklist

- [ ] Verify original payment is marked as CANCELLED
- [ ] Verify RefundTransaction is created with STAFF_REVIEW status
- [ ] Verify room.release message is sent to RabbitMQ
- [ ] Verify room status is updated to AVAILABLE
- [ ] Test with VNPAY payments (should preserve transaction reference)
- [ ] Test with CASH payments (should use CASH refund method)
- [ ] Test with zero refund amount (no refund)
- [ ] Verify cancellation response contains correct refundTransactionId
- [ ] Verify originalPaymentId is properly linked

## Future Enhancements

1. **Staff Approval Workflow**: Create endpoint for staff to approve/reject refund transactions
2. **Auto-refund Processing**: When staff approves, automatically process refund to original payment method
3. **Refund Policy Integration**: Query refund policy service to auto-determine refund eligibility
4. **Email Notifications**: Send confirmation emails on cancellation and refund approval
5. **Audit Logging**: Log all cancellation and refund transactions with staff actions
