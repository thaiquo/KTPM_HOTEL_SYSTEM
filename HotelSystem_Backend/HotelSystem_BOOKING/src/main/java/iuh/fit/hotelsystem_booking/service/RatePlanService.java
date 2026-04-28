package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.springframework.stereotype.Service;

@Service
public class RatePlanService {

    public RatePlanRule getRule(RatePlan ratePlan) {
        RatePlan resolved = ratePlan != null ? ratePlan : RatePlan.FLEXIBLE;
        if (resolved == RatePlan.NON_REFUNDABLE) {
            return new RatePlanRule(
                    RatePlan.NON_REFUNDABLE,
                    BookingConstants.PAYMENT_TYPE_FULL,
                    BookingConstants.NON_REFUNDABLE_DEPOSIT_PERCENT,
                    BookingConstants.NON_REFUNDABLE_DISCOUNT_PERCENT,
                    BookingConstants.NON_REFUNDABLE_REFUNDABLE,
                    BookingConstants.NON_REFUNDABLE_FREE_CANCEL_HOURS,
                    "NO_REFUND",
                    BookingConstants.NON_REFUNDABLE_ALLOW_MODIFICATION
            );
        }
        return new RatePlanRule(
                RatePlan.FLEXIBLE,
                BookingConstants.PAYMENT_TYPE_DEPOSIT,
                BookingConstants.FLEXIBLE_DEPOSIT_PERCENT,
                BookingConstants.FLEXIBLE_DISCOUNT_PERCENT,
                BookingConstants.FLEXIBLE_REFUNDABLE,
                BookingConstants.FLEXIBLE_FREE_CANCEL_HOURS,
                "LOSE_DEPOSIT",
                BookingConstants.FLEXIBLE_ALLOW_MODIFICATION
        );
    }

    public record RatePlanRule(RatePlan ratePlan,
                               String paymentType,
                               int depositPercent,
                               int discountPercent,
                               boolean refundable,
                               int freeCancelBeforeHours,
                               String lateCancelPolicy,
                               boolean allowModification) {
    }
}
