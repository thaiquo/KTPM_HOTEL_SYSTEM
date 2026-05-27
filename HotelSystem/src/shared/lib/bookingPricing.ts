import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import type { Room } from '../../types';

export const CHECK_IN_TIME_LABEL = '14:00';
export const CHECK_OUT_TIME_LABEL = '12:00';
export const WEEKEND_PRICE_MULTIPLIER = 1.2;
export const HOLIDAY_PRICE_MULTIPLIER = 1.3;

type HolidayRange = {
  start: string;
  end: string;
  name: string;
};

export type StayNightBreakdown = {
  date: string;
  displayDate: string;
  price: number;
  isWeekend: boolean;
  holidayName?: string;
};

export type RoomStayPricing = {
  roomId: string;
  roomName: string;
  roomNumber: string;
  basePrice: number;
  viewBonus: number;
  bathtubBonus: number;
  nightlyBasePrice: number;
  nights: number;
  nightlyDetails: StayNightBreakdown[];
  totalBeforeHoliday: number;
  totalAfterHoliday: number;
};

export type StayPricingSummary = {
  stayDates: string[];
  nights: number;
  weekendNights: number;
  holidayNights: number;
  holidayNames: string[];
  isHolidayBooking: boolean;
  rooms: RoomStayPricing[];
  baseTotal: number;
  holidayMultiplier: number;
  holidayAdjustedTotal: number;
  discountPercent: number;
  finalTotal: number;
  depositPercent: number;
  depositAmount: number;
  ratePlan: 'FLEXIBLE' | 'NON_REFUNDABLE';
};

const VIEW_BONUS: Record<string, number> = {
  'River View': 150000,
  'Pool View': 150000,
  'Garden View': 50000,
  'City View': 0,
  'No View': 0,
};

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Tết Dương lịch' },
  { month: 4, day: 30, name: 'Giải phóng miền Nam' },
  { month: 5, day: 1, name: 'Quốc tế Lao động' },
  { month: 9, day: 2, name: 'Quốc khánh' },
];

const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');
const parseDateOnly = (value: string) => parseISO(value);

const isDateStringValid = (value: string) => {
  const date = parseDateOnly(value);
  return !Number.isNaN(date.getTime());
};

const getDatesInRange = (startDate: string, endDate: string): string[] => {
  if (!isDateStringValid(startDate) || !isDateStringValid(endDate)) return [];

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const nights = differenceInCalendarDays(end, start);
  if (nights <= 0) return [];

  return Array.from({ length: nights }, (_, index) => toISODate(addDays(start, index)));
};

const isWeekendDate = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const singleHoliday = (year: number, month: number, day: number, name: string): HolidayRange => {
  const date = new Date(year, month - 1, day);
  const isoDate = toISODate(date);
  return { start: isoDate, end: isoDate, name };
};

const getLunarMonth11 = (year: number, timeZone: number) => {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
};

const getLeapMonthOffset = (a11: number, timeZone: number) => {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
};

const getSunLongitude = (jdn: number, timeZone: number) => {
  const T = (jdn - 2451545.5 - timeZone / 24.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;

  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

  const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
    + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
    + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
};

const getNewMoonDay = (k: number, timeZone: number) => {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;

  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr)
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

  const deltaT = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;

  const jdNew = jd1 + C1 - deltaT;
  return Math.floor(jdNew + 0.5 + timeZone / 24.0);
};

const jdFromDate = (day: number, month: number, year: number) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
};

const jdToDate = (jd: number) => {
  let a;
  let b;
  let c;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
};

const convertLunarToSolar = (lunarDay: number, lunarMonth: number, lunarYear: number, isLeapMonth = false) => {
  const timeZone = 7;
  let a11: number;
  let b11: number;

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  let offset = lunarMonth - 11;
  if (offset < 0) {
    offset += 12;
  }

  if (b11 - a11 > 365) {
    const leapMonthOffset = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapMonthOffset - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (isLeapMonth && lunarMonth !== leapMonth) {
      throw new Error('Invalid leap month for lunar year');
    }
    if (isLeapMonth || offset >= leapMonthOffset) {
      offset += 1;
    }
  }

  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  const monthStart = getNewMoonDay(k + offset, timeZone);
  const jd = monthStart + lunarDay - 1;
  return jdToDate(jd);
};

const lunarToSolar = (lunarDay: number, lunarMonth: number, solarYear: number) => convertLunarToSolar(lunarDay, lunarMonth, solarYear, false);

export const getVietnamHolidayRanges = (year: number): HolidayRange[] => {
  const holidays: HolidayRange[] = FIXED_HOLIDAYS.map((holiday) => singleHoliday(year, holiday.month, holiday.day, holiday.name));

  const tetDay = lunarToSolar(1, 1, year);
  holidays.push({
    start: toISODate(addDays(tetDay, -3)),
    end: toISODate(addDays(tetDay, 4)),
    name: 'Tết Nguyên Đán',
  });

  const hungKing = lunarToSolar(10, 3, year);
  holidays.push({
    start: toISODate(hungKing),
    end: toISODate(hungKing),
    name: 'Giỗ Tổ Hùng Vương',
  });

  return holidays;
};

export const getHolidayNameForDate = (date: string) => {
  if (!isDateStringValid(date)) return null;

  const parsed = parseDateOnly(date);
  const year = parsed.getFullYear();
  const ranges = [
    ...getVietnamHolidayRanges(year - 1),
    ...getVietnamHolidayRanges(year),
    ...getVietnamHolidayRanges(year + 1),
  ];

  for (const range of ranges) {
    if (date >= range.start && date <= range.end) {
      return range.name;
    }
  }

  return null;
};

export const isHolidayDate = (date: string) => Boolean(getHolidayNameForDate(date));

export const getStayDates = (checkIn: string, checkOut: string) => getDatesInRange(checkIn, checkOut);

export const calculateRoomNightlyBasePrice = (room: Room) => {
  const basePrice = room.roomType?.basePrice ?? 0;
  const viewBonus = VIEW_BONUS[room.viewType] ?? 0;
  const bathtubBonus = room.hasBathtub ? 50000 : 0;
  return {
    basePrice,
    viewBonus,
    bathtubBonus,
    nightlyBasePrice: basePrice + viewBonus + bathtubBonus,
  };
};

export const calculateStayPricing = (rooms: Room[], checkIn: string, checkOut: string, ratePlan: 'FLEXIBLE' | 'NON_REFUNDABLE' = 'FLEXIBLE'): StayPricingSummary | null => {
  const stayDates = getStayDates(checkIn, checkOut);
  if (stayDates.length === 0 || rooms.length === 0) return null;

  const holidayNames = new Set<string>();
  const roomDetails: RoomStayPricing[] = rooms.map((room) => {
    const priceParts = calculateRoomNightlyBasePrice(room);
    const nightlyDetails = stayDates.map((date) => {
      const parsed = parseDateOnly(date);
      const holidayName = getHolidayNameForDate(date) || undefined;
      if (holidayName) {
        holidayNames.add(holidayName);
      }

      return {
        date,
        displayDate: format(parsed, 'dd/MM/yyyy'),
        price: priceParts.nightlyBasePrice * (isWeekendDate(parsed) ? WEEKEND_PRICE_MULTIPLIER : 1),
        isWeekend: isWeekendDate(parsed),
        holidayName,
      };
    });

    const totalBeforeHoliday = nightlyDetails.reduce((sum, night) => sum + night.price, 0);

    return {
      roomId: String(room.id),
      roomName: room.roomType?.type ? `Phòng ${room.roomNumber} - ${room.roomType.type}` : `Phòng ${room.roomNumber}`,
      roomNumber: room.roomNumber,
      ...priceParts,
      nights: stayDates.length,
      nightlyDetails,
      totalBeforeHoliday,
      totalAfterHoliday: totalBeforeHoliday,
    };
  });

  const baseTotal = roomDetails.reduce((sum, room) => sum + room.totalBeforeHoliday, 0);
  const isHolidayBooking = stayDates.some((date) => isHolidayDate(date));
  const holidayMultiplier = isHolidayBooking ? HOLIDAY_PRICE_MULTIPLIER : 1;
  const holidayAdjustedTotal = baseTotal * holidayMultiplier;
  const discountPercent = ratePlan === 'NON_REFUNDABLE' ? 10 : 0;
  const finalTotal = holidayAdjustedTotal * (1 - discountPercent / 100);
  const depositPercent = ratePlan === 'NON_REFUNDABLE' ? 100 : 50;
  const depositAmount = finalTotal * (depositPercent / 100);

  return {
    stayDates,
    nights: stayDates.length,
    weekendNights: stayDates.filter((date) => isWeekendDate(parseDateOnly(date))).length,
    holidayNights: stayDates.filter((date) => isHolidayDate(date)).length,
    holidayNames: Array.from(holidayNames),
    isHolidayBooking,
    rooms: roomDetails,
    baseTotal,
    holidayMultiplier,
    holidayAdjustedTotal,
    discountPercent,
    finalTotal,
    depositPercent,
    depositAmount,
    ratePlan,
  };
};

export const getStaySummaryText = (summary: StayPricingSummary | null) => {
  if (!summary) return '';

  const parts = [
    `Check-in ${CHECK_IN_TIME_LABEL}`,
    `check-out ${CHECK_OUT_TIME_LABEL}`,
    'cuối tuần +20%',
  ];

  if (summary.isHolidayBooking) {
    parts.push('lễ/tết +30%');
  }

  return parts.join(' · ');
};