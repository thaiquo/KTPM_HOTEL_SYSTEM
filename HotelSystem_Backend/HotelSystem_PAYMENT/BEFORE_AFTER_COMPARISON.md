# Cancellation Flow - Before vs After

## Before Implementation ❌

### Old `cancelCheckinPayment()` Method

```java
@Transactional
public CheckinPaymentConfirmResponse cancelCheckinPayment(String paymentCode) {
    Payment payment = paymentRepository.findByPaymentCode(paymentCode)
            .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentCode));
    payment.setStatus(PaymentStatus.FAILED);  // ❌ Wrong status!
    Payment saved = paymentRepository.save(payment);
    return toConfirmResponse(saved);
}
```

### Problems

1. ❌ Sets status to FAILED instead of CANCELLED
2. ❌ No link to original payment source
3. ❌ Doesn't create RefundTransaction for staff review
4. ❌ Doesn't check refund eligibility
5. ❌ Doesn't release room status
6. ❌ No business logic for refunds

### Database State After Old Cancel

```
payments table:
- id: 100
- status: FAILED                    ❌ (should be CANCELLED)
- linkedToOriginal: NULL            ❌ (no reference to source)

refund_transactions table:
  (empty - no refund record created) ❌

rooms table:
  room_id: 502
  status: BOOKED                    ❌ (should be AVAILABLE)
```

---

## After Implementation ✅

### New `cancelBooking()` Method

```java
@Transactional
public BookingCancellationResponse cancelBooking(BookingCancellationRequest request) {
    // 1. Find original successful payment
    Payment originalPayment = resolveLatestSuccessfulPayment(bookingId);

    // 2. Mark original as CANCELLED
    originalPayment.setStatus(PaymentStatus.CANCELLED);  ✅

    // 3. If eligible for refund - create RefundTransaction
    if (request.getEligibleForRefund() && request.getRefundAmount() > 0) {
        RefundTransaction refundTx = new RefundTransaction();
        refundTx.setOriginalPaymentId(originalPayment.getId());  ✅ Link to source!
        refundTx.setStatus(RefundTransactionStatus.STAFF_REVIEW);  ✅ For staff approval
        refundTx.setReason(RefundReason.BOOKING_CANCELLATION);  ✅ Clear reason
        refundTx.setAmount(BigDecimal.valueOf(request.getRefundAmount()));
        // ... more fields ...
        refundTransactionRepository.save(refundTx);
    }

    // 4. Release room to AVAILABLE
    releaseRoomStatus(bookingId);  ✅

    return response;  ✅
}
```

### Advantages

1. ✅ Proper CANCELLED status
2. ✅ RefundTransaction linked to original payment via originalPaymentId
3. ✅ Staff review workflow with STAFF_REVIEW status
4. ✅ Support for both refundable and non-refundable cancellations
5. ✅ Automatic room status reset
6. ✅ Clear audit trail

### Database State After New Cancel (With Refund)

```
payments table:
- id: 100
- status: CANCELLED                ✅ (correct status)
- linkedToOriginal: N/A

refund_transactions table:
- id: 555
- originalPaymentId: 100          ✅ (linked to source!)
- status: STAFF_REVIEW            ✅ (waiting for staff)
- reason: BOOKING_CANCELLATION    ✅ (clear reason)
- amount: 12,800,000
- createdAt: [timestamp]

rooms table:
  room_id: 502
  status: AVAILABLE                ✅ (released!)
```

### Database State After New Cancel (No Refund)

```
payments table:
- id: 100
- status: CANCELLED                ✅

refund_transactions table:
  (no new record - not eligible)    ✅

rooms table:
  room_id: 502
  status: AVAILABLE                ✅
```

---

## Workflow Comparison

### Before (Simple but Broken)

```
cancelCheckinPayment()
  └─ Set status = FAILED
  └─ Done ❌

Result: Payment marked FAILED, but no refund process, room still BOOKED
```

### After (Complete and Correct)

```
cancelBooking()
  ├─ Find original payment ✅
  ├─ Mark as CANCELLED ✅
  ├─ If eligible for refund:
  │   └─ Create RefundTransaction (STAFF_REVIEW) ✅
  │       ├─ Link originalPaymentId ✅
  │       ├─ Set reason: BOOKING_CANCELLATION ✅
  │       └─ Staff can now approve/reject ✅
  ├─ Release room (AVAILABLE) ✅
  └─ Return response with status & refund ID ✅

Result: Complete audit trail, staff workflow, room released
```

---

## API Comparison

### Before (No API)

```
No dedicated API endpoint for cancellation
```

### After (RESTful)

```
POST /payment/booking/cancel
Content-Type: application/json

{
  "bookingId": 41,
  "userId": 1,
  "eligibleForRefund": true,
  "refundAmount": 12800000.0,
  "cancellationReason": "Customer request"
}

Response:
{
  "bookingId": 41,
  "status": "PENDING_REFUND_APPROVAL",
  "refundTransactionId": 555,
  "refundAmount": 12800000.0,
  "originalPaymentId": 100,
  "message": "Refund request created for staff approval. RefundTransaction ID: 555"
}
```

---

## Key Improvements Summary

| Aspect                     | Before       | After                |
| -------------------------- | ------------ | -------------------- |
| **Status Used**            | FAILED       | CANCELLED            |
| **Transaction Link**       | None         | originalPaymentId    |
| **Refund Workflow**        | None         | STAFF_REVIEW status  |
| **Room Status**            | BOOKED       | AVAILABLE            |
| **Staff Review**           | Not possible | Can approve/reject   |
| **Audit Trail**            | Minimal      | Complete             |
| **API Endpoint**           | None         | POST /booking/cancel |
| **Refund Eligibility**     | N/A          | Checked per policy   |
| **Message to RoomService** | None         | room.release event   |

---

## Migration Guide

### For Backend Development

1. The old `cancelCheckinPayment(paymentCode)` method still works (legacy support)
2. Use new `cancelBooking(request)` method for all new cancellations
3. Staff refund approval workflow needs to be implemented separately

### For Frontend Integration

1. Replace calls to `/{paymentCode}/cancel` with `/booking/cancel` endpoint
2. Prepare BookingCancellationRequest with:
   - bookingId (required)
   - userId (required)
   - eligibleForRefund (boolean)
   - refundAmount (if eligible)
   - cancellationReason (optional)
3. Handle response status values:
   - "PENDING_REFUND_APPROVAL" - Show refund pending message
   - "CANCELLED_NO_REFUND" - Show cancellation confirmed
   - "NO_PAYMENT_FOUND" - Show error message

### For Staff Interface

Staff needs new interface to:

1. View pending RefundTransaction items with status STAFF_REVIEW
2. Approve/Reject each refund request
3. See refund details: amount, original payment, customer info
