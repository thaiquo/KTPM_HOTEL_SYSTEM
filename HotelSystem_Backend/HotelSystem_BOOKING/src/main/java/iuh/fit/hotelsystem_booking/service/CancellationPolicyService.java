package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.CancellationPolicyResult;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;

@Service
public class CancellationPolicyService {

    private static final EnumSet<BookingStatus> NOT_CANCELABLE_STATUSES = EnumSet.of(
            BookingStatus.CHECKED_IN,
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.NO_SHOW
    );

    public CancellationPolicyResult calculateCancellationPolicy(Booking booking, LocalDateTime cancelTime) {
        if (booking == null) {
            throw new IllegalArgumentException("booking must not be null");
        }
        if (cancelTime == null) {
            throw new IllegalArgumentException("cancelTime must not be null");
        }

        CancellationPolicyResult result = new CancellationPolicyResult();
        result.setPaidAmount(valueOrZero(booking.getPaidAmount()));

        if (booking.getStatus() != null && NOT_CANCELABLE_STATUSES.contains(booking.getStatus())) {
            result.setCanCancel(false);
            result.setPolicyType(resolvePolicyType(booking));
            result.setRefundStatus("NO_REFUND");
            result.setReason("Booking is " + booking.getStatus() + " and cannot be cancelled");
            return result;
        }

        LocalDateTime checkInDateTime = LocalDateTime.of(
                booking.getCheckIn(),
                LocalTime.of(BookingConstants.CHECK_IN_HOUR, 0));
        boolean noShow = !cancelTime.isBefore(checkInDateTime);

        if (booking.isNonRefundable()) {
            result.setCanCancel(false);
            result.setPolicyType("NON_REFUNDABLE");
            result.setCancelType(noShow ? "NO_SHOW" : "NOT_ALLOWED");
            result.setCancellationFee(result.getPaidAmount());
            result.setRefundAmount(0.0);
            result.setRefundStatus("NO_REFUND");
            result.setReason("Non-refundable booking cannot be cancelled");
            return result;
        }

        result.setCanCancel(true);
        boolean holiday = booking.isHoliday();
        int freeCancelHours = holiday
                ? BookingConstants.HOLIDAY_FREE_CANCEL_HOURS
                : BookingConstants.NORMAL_FREE_CANCEL_HOURS;
        result.setPolicyType(holiday ? "HOLIDAY" : "NORMAL");

        long hoursUntilCheckIn = ChronoUnit.HOURS.between(cancelTime, checkInDateTime);
        if (noShow) {
            result.setCancelType("NO_SHOW");
            applyPenaltyPolicy(booking, result, true);
        } else if (hoursUntilCheckIn >= freeCancelHours) {
            result.setCancelType("FREE_CANCEL");
            result.setCancellationFee(0.0);
            result.setRefundAmount(result.getPaidAmount());
            result.setRefundStatus(result.getRefundAmount() > 0 ? "REFUND_REQUIRED" : "NO_REFUND");
            result.setReason("Free cancellation before " + freeCancelHours + " hours");
        } else {
            result.setCancelType("LATE_CANCEL");
            applyPenaltyPolicy(booking, result, false);
        }

        return result;
    }

    private void applyPenaltyPolicy(Booking booking, CancellationPolicyResult result, boolean noShow) {
        String paymentType = resolvePaymentType(booking);
        double fee;

        if (noShow && BookingConstants.PAYMENT_TYPE_FULL.equals(paymentType)) {
            fee = valueOrZero(booking.getFinalTotal());
            if (fee == 0.0) {
                fee = result.getPaidAmount();
            }
            result.setReason("No-show for FULL payment: no refund");
        } else if (BookingConstants.PAYMENT_TYPE_DEPOSIT.equals(paymentType)) {
            fee = valueOrZero(booking.getDepositAmount());
            result.setReason((noShow ? "No-show" : "Late cancel") + " for DEPOSIT: lose deposit");
        } else {
            fee = oneNightAmount(booking);
            result.setReason(noShow ? "No-show: charge one night" : "Late cancel: charge one night");
        }

        if (!BookingConstants.PAYMENT_TYPE_HOTEL.equals(paymentType)) {
            fee = Math.min(fee, result.getPaidAmount());
            result.setCancellationFee(fee);
            result.setRefundAmount(Math.max(0.0, result.getPaidAmount() - fee));
            result.setRefundStatus(result.getRefundAmount() > 0 ? "REFUND_REQUIRED" : "NO_REFUND");
        } else {
            result.setCancellationFee(fee);
            result.setRefundAmount(0.0);
            result.setRefundStatus(fee > 0 ? "HOTEL_CHARGE" : "NO_REFUND");
        }
    }

    private double oneNightAmount(Booking booking) {
        double multiplier = booking.getPriceMultiplier() != null ? booking.getPriceMultiplier() : 1.0;
        if (booking.getPricePerNight() != null) {
            return booking.getPricePerNight() * multiplier;
        }
        if (booking.getFinalTotal() != null && booking.getNights() != null && booking.getNights() > 0) {
            return booking.getFinalTotal() / booking.getNights();
        }
        if (booking.getBaseTotal() != null && booking.getNights() != null && booking.getNights() > 0) {
            return booking.getBaseTotal() / booking.getNights() * multiplier;
        }
        return 0.0;
    }

    private String resolvePaymentType(Booking booking) {
        return booking.getPaymentType() != null ? booking.getPaymentType() : BookingConstants.PAYMENT_TYPE_FULL;
    }

    private String resolvePolicyType(Booking booking) {
        if (booking.isNonRefundable()) {
            return "NON_REFUNDABLE";
        }
        return booking.isHoliday() ? "HOLIDAY" : "NORMAL";
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }
}
