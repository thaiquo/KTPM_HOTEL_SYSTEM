package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.PricingResult;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class PricingService {

    private final HolidayService holidayService;
    private final RatePlanService ratePlanService;

    public PricingService(HolidayService holidayService, RatePlanService ratePlanService) {
        this.holidayService = holidayService;
        this.ratePlanService = ratePlanService;
    }

    /**
     * Tính toán chi tiết giá phòng dựa trên ngày check-in, check-out và giá cơ bản.
     */
    public PricingResult calculatePrice(LocalDate checkIn, LocalDate checkOut, double pricePerNight) {
        return calculatePrice(checkIn, checkOut, pricePerNight, RatePlan.FLEXIBLE);
    }

    public PricingResult calculatePrice(LocalDate checkIn, LocalDate checkOut, double pricePerNight, RatePlan ratePlan) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("checkIn/checkOut must not be null");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("checkOut must be after checkIn");
        }
        if (pricePerNight <= 0) {
            throw new IllegalArgumentException("pricePerNight must be greater than 0");
        }

        int nights = (int) ChronoUnit.DAYS.between(checkIn, checkOut);
        
        boolean isHoliday = holidayService.isBookingOverlapHoliday(checkIn, checkOut);
        RatePlanService.RatePlanRule ratePlanRule = ratePlanService.getRule(ratePlan);
        
        PricingResult result = new PricingResult();
        result.setNights(nights);
        result.setHolidayBooking(isHoliday);
        result.setPricePerNight(pricePerNight);

        if (isHoliday) {
            result.setAppliedRule("HOLIDAY");
            result.setMinStayNights(BookingConstants.HOLIDAY_MIN_STAY_NIGHTS);
            result.setPriceMultiplier(BookingConstants.HOLIDAY_PRICE_MULTIPLIER);
            result.setFreeCancelBeforeHours(ratePlanRule.refundable()
                    ? Math.max(ratePlanRule.freeCancelBeforeHours(), BookingConstants.HOLIDAY_FREE_CANCEL_HOURS)
                    : ratePlanRule.freeCancelBeforeHours());
        } else {
            result.setAppliedRule("NORMAL");
            result.setMinStayNights(BookingConstants.NORMAL_MIN_STAY_NIGHTS);
            result.setPriceMultiplier(BookingConstants.NORMAL_PRICE_MULTIPLIER);
            result.setFreeCancelBeforeHours(ratePlanRule.freeCancelBeforeHours());
        }
        result.setDepositPercent(ratePlanRule.depositPercent());
        result.setRatePlan(ratePlanRule.ratePlan().name());
        result.setDiscountPercent(ratePlanRule.discountPercent());
        result.setRefundable(ratePlanRule.refundable());
        result.setPaymentType(ratePlanRule.paymentType());
        result.setAllowModification(ratePlanRule.allowModification());

        if (nights < result.getMinStayNights()) {
            throw new IllegalArgumentException(
                    "Minimum stay is " + result.getMinStayNights() + " night(s) for " + result.getAppliedRule() + " booking");
        }
        if (nights > BookingConstants.MAX_STAY_NIGHTS) {
            throw new IllegalArgumentException("Maximum stay is " + BookingConstants.MAX_STAY_NIGHTS + " nights");
        }

        double baseTotal = nights * pricePerNight;
        double holidayAdjustedTotal = baseTotal * result.getPriceMultiplier();
        double finalTotal = holidayAdjustedTotal * (1 - result.getDiscountPercent() / 100.0);
        double depositAmount = finalTotal * result.getDepositPercent() / 100.0;

        result.setBaseTotal(baseTotal);
        result.setFinalTotal(finalTotal);
        result.setDepositAmount(depositAmount);

        return result;
    }
}
