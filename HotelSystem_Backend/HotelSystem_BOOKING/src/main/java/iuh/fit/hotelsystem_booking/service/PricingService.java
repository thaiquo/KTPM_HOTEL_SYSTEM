package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.PricingResult;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
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

    public PricingResult calculatePrice(LocalDate checkIn, LocalDate checkOut, double basePricePerNight) {
        return calculatePrice(checkIn, checkOut, basePricePerNight, RatePlan.FLEXIBLE);
    }

    public PricingResult calculatePrice(LocalDate checkIn, LocalDate checkOut, double basePricePerNight, RatePlan ratePlan) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("checkIn/checkOut must not be null");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("checkOut must be after checkIn");
        }

        int nights = (int) ChronoUnit.DAYS.between(checkIn, checkOut);
        boolean isHoliday = holidayService.isBookingOverlapHoliday(checkIn, checkOut);
        RatePlanService.RatePlanRule ratePlanRule = ratePlanService.getRule(ratePlan);
        
        PricingResult result = new PricingResult();
        result.setNights(nights);
        result.setHolidayBooking(isHoliday);
        result.setPricePerNight(basePricePerNight); // Base price reference

        // Determine base rules
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

        // Calculate total price by iterating through each night
        double totalBasePrice = 0;
        for (int i = 0; i < nights; i++) {
            LocalDate current = checkIn.plusDays(i);
            double dailyPrice = basePricePerNight;
            
            // Weekend surcharge logic (Saturday, Sunday)
            DayOfWeek day = current.getDayOfWeek();
            if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
                dailyPrice *= BookingConstants.WEEKEND_PRICE_MULTIPLIER;
            }
            
            totalBasePrice += dailyPrice;
        }

        double holidayAdjustedTotal = totalBasePrice * result.getPriceMultiplier();
        double finalTotal = holidayAdjustedTotal * (1 - result.getDiscountPercent() / 100.0);
        double depositAmount = finalTotal * result.getDepositPercent() / 100.0;

        result.setBaseTotal(totalBasePrice);
        result.setFinalTotal(finalTotal);
        result.setDepositAmount(depositAmount);

        return result;
    }
}
