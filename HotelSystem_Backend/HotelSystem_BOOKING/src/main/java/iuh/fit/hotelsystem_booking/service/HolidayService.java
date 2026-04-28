package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;

/**
 * Kiểm tra ngày lễ Việt Nam.
 * Hỗ trợ cả ngày lễ dương lịch (cố định) và âm lịch (Tết, Giỗ Tổ).
 *
 * <p>Không lưu vào DB — generate khi cần, tự cache 90 ngày theo yêu cầu.
 * Nếu window 90 ngày vượt năm → tự động generate thêm năm sau.</p>
 */
@Service
public class HolidayService {

    // ============================================================
    // PUBLIC API
    // ============================================================

    /**
     * Kiểm tra booking [checkIn, checkOut) có đụng ít nhất 1 ngày lễ không.
     * checkOut không tính (khách đã rời khỏi phòng lúc 12h).
     */
    public boolean isBookingOverlapHoliday(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("checkIn/checkOut must not be null");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("checkOut must be after checkIn");
        }

        LocalDate bookingEnd = checkOut.minusDays(1);

        List<HolidayRange> holidays = new ArrayList<>();
        for (int year = checkIn.getYear(); year <= bookingEnd.getYear(); year++) {
            holidays.addAll(generateVietnamHolidays(year));
        }
        // booking range: [checkIn, checkOut - 1 day]
        for (HolidayRange h : holidays) {
            if (!bookingEnd.isBefore(h.start()) && !checkIn.isAfter(h.end())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lấy tất cả ngày lễ trong window today → today + 90 ngày.
     * Tự động bổ sung năm sau nếu window vượt năm.
     */
    public List<HolidayRange> getHolidaysWithin90Days(LocalDate today) {
        if (today == null) {
            throw new IllegalArgumentException("today must not be null");
        }

        LocalDate maxDate = today.plusDays(BookingConstants.MAX_ADVANCE_BOOKING_DAYS);
        List<HolidayRange> candidates = new ArrayList<>();
        for (int year = today.getYear(); year <= maxDate.getYear(); year++) {
            candidates.addAll(generateVietnamHolidays(year));
        }

        List<HolidayRange> result = new ArrayList<>();
        for (HolidayRange h : candidates) {
            if (!h.end().isBefore(today) && !h.start().isAfter(maxDate)) {
                result.add(h);
            }
        }
        return result;
    }

    /**
     * Generate tất cả ngày lễ Việt Nam trong 1 năm dương lịch.
     */
    public List<HolidayRange> generateVietnamHolidays(int year) {
        List<HolidayRange> holidays = new ArrayList<>();

        // ── Ngày lễ dương lịch cố định ──────────────────────────
        // 1. Tết Dương lịch 01/01
        holidays.add(single(year, Month.JANUARY, 1, "Tết Dương lịch"));

        // 2. Giải phóng miền Nam 30/04
        holidays.add(single(year, Month.APRIL, 30, "Giải phóng miền Nam"));

        // 3. Quốc tế Lao động 01/05
        holidays.add(single(year, Month.MAY, 1, "Quốc tế Lao động"));

        // 4. Quốc khánh 02/09
        holidays.add(single(year, Month.SEPTEMBER, 2, "Quốc khánh"));

        // ── Ngày lễ âm lịch — convert sang dương lịch ───────────
        // 5. Tết Nguyên Đán: 28 Tết → mùng 5 (= lunar 1/1 +/- ngày)
        LocalDate tetDay = lunarToSolar(1, 1, year);   // Mùng 1 Tết
        LocalDate tetStart = tetDay.minusDays(3);       // 28 Tết (= mùng 1 - 3)
        LocalDate tetEnd   = tetDay.plusDays(4);        // Mung 5 (= mung 1 + 4)
        holidays.add(new HolidayRange(tetStart, tetEnd, "Tết Nguyên Đán"));

        // 6. Giỗ Tổ Hùng Vương: 10/03 âm lịch
        LocalDate hungKing = lunarToSolar(10, 3, year);
        holidays.add(new HolidayRange(hungKing, hungKing, "Giỗ Tổ Hùng Vương"));

        return holidays;
    }

    // ============================================================
    // CONVERT ÂM LỊCH → DƯƠNG LỊCH (Thuật toán Hồ Ngọc Đức)
    // ============================================================

    /**
     * Convert ngày âm lịch (day/month/year) sang dương lịch.
     * Sử dụng thuật toán Hồ Ngọc Đức — thuần Java, không cần lib ngoài.
     *
     * @param lunarDay   Ngày âm lịch (1–30)
     * @param lunarMonth Tháng âm lịch (1–12)
     * @param solarYear  Năm dương lịch cần tính
     * @return Ngày dương lịch tương ứng
     */
    public LocalDate lunarToSolar(int lunarDay, int lunarMonth, int solarYear) {
        return convertLunarToSolar(lunarDay, lunarMonth, solarYear, false);
    }

    // ============================================================
    // Lunar conversion helpers (UTC+7)
    // ============================================================

    private static final double VN_TIME_ZONE = 7.0;

    private LocalDate convertLunarToSolar(int lunarDay, int lunarMonth, int lunarYear, boolean isLeapMonth) {
        // Lunar year is anchored by lunar month 11.
        // For lunar months 1–10, month 11 belongs to the previous lunar year.
        int a11;
        int b11;
        if (lunarMonth < 11) {
            a11 = getLunarMonth11(lunarYear - 1, VN_TIME_ZONE);
            b11 = getLunarMonth11(lunarYear, VN_TIME_ZONE);
        } else {
            a11 = getLunarMonth11(lunarYear, VN_TIME_ZONE);
            b11 = getLunarMonth11(lunarYear + 1, VN_TIME_ZONE);
        }

        int offset = lunarMonth - 11;
        if (offset < 0) {
            offset += 12;
        }

        if (b11 - a11 > 365) {
            int leapMonthOffset = getLeapMonthOffset(a11, VN_TIME_ZONE);
            int leapMonth = leapMonthOffset - 2;
            if (leapMonth < 0) {
                leapMonth += 12;
            }
            if (isLeapMonth && lunarMonth != leapMonth) {
                throw new IllegalArgumentException("Invalid leap month for lunar year");
            }
            if (isLeapMonth || offset >= leapMonthOffset) {
                offset += 1;
            }
        }

        int k = (int) Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        int monthStart = getNewMoonDay(k + offset, VN_TIME_ZONE);
        int jd = monthStart + lunarDay - 1;
        return jdToDate(jd);
    }

    private int getLunarMonth11(int year, double timeZone) {
        int off = jdFromDate(31, 12, year) - 2415021;
        int k = (int) Math.floor(off / 29.530588853);
        int nm = getNewMoonDay(k, timeZone);
        int sunLong = getSunLongitude(nm, timeZone);
        if (sunLong >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    private int getLeapMonthOffset(int a11, double timeZone) {
        int k = (int) Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        int last = 0;
        int i = 1;
        int arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        do {
            last = arc;
            i++;
            arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        } while (arc != last && i < 14);
        return i - 1;
    }

    private int getSunLongitude(int jdn, double timeZone) {
        double T = (jdn - 2451545.5 - timeZone / 24.0) / 36525;
        double T2 = T * T;
        double dr = Math.PI / 180;

        double M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
        double L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

        double DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
                + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
                + 0.000290 * Math.sin(dr * 3 * M);
        double L = L0 + DL;
        L = L * dr;
        L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
        return (int) Math.floor(L / Math.PI * 6);
    }

    private int getNewMoonDay(int k, double timeZone) {
        double T = k / 1236.85;
        double T2 = T * T;
        double T3 = T2 * T;
        double dr = Math.PI / 180;

        double jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

        double M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        double Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        double F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

        double C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr)
                + 0.0021 * Math.sin(2 * M * dr)
                - 0.4068 * Math.sin(Mpr * dr)
                + 0.0161 * Math.sin(2 * Mpr * dr)
                - 0.0004 * Math.sin(3 * Mpr * dr)
                + 0.0104 * Math.sin(2 * F * dr)
                - 0.0051 * Math.sin((M + Mpr) * dr)
                - 0.0074 * Math.sin((M - Mpr) * dr)
                + 0.0004 * Math.sin((2 * F + M) * dr)
                - 0.0004 * Math.sin((2 * F - M) * dr)
                - 0.0006 * Math.sin((2 * F + Mpr) * dr)
                + 0.0010 * Math.sin((2 * F - Mpr) * dr)
                + 0.0005 * Math.sin((M + 2 * Mpr) * dr);

        double deltaT;
        if (T < -11) {
            deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
        } else {
            deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
        }

        double jdNew = jd1 + C1 - deltaT;
        return (int) Math.floor(jdNew + 0.5 + timeZone / 24.0);
    }

    private int jdFromDate(int dd, int mm, int yy) {
        int a = (14 - mm) / 12;
        int y = yy + 4800 - a;
        int m = mm + 12 * a - 3;
        int jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
        if (jd < 2299161) {
            jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - 32083;
        }
        return jd;
    }

    private LocalDate jdToDate(int jd) {
        int a, b, c;
        if (jd > 2299160) {
            a = jd + 32044;
            b = (4 * a + 3) / 146097;
            c = a - (b * 146097) / 4;
        } else {
            b = 0;
            c = jd + 32082;
        }
        int d = (4 * c + 3) / 1461;
        int e = c - (1461 * d) / 4;
        int m = (5 * e + 2) / 153;
        int day = e - (153 * m + 2) / 5 + 1;
        int month = m + 3 - 12 * (m / 10);
        int year = b * 100 + d - 4800 + m / 10;
        return LocalDate.of(year, month, day);
    }

    // ============================================================
    // HELPER
    // ============================================================

    private HolidayRange single(int year, Month month, int day, String name) {
        LocalDate date = LocalDate.of(year, month, day);
        return new HolidayRange(date, date, name);
    }

    // ============================================================
    // Inner record
    // ============================================================

    /** Đại diện 1 khoảng ngày lễ [start, end] (cả 2 đầu inclusive). */
    public record HolidayRange(LocalDate start, LocalDate end, String name) {}
}
