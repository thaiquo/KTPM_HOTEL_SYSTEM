import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  CalendarSearch,
  CreditCard,
  MessageCircle,
  Minus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { addDays, format, nextSaturday } from 'date-fns';

import { useAuth } from '../../../contexts/AuthContext';
import { roomApi, staffInvoiceApi, bookingApi, refundApi, type PaymentRecord, type RefundRecord } from '../../../services/api';
import { chatbotApi, type ChatAction as BackendChatAction, type ChatContextMessage } from '../services/chatbotApi';
import { policyQuestions } from '../../hotel-policy/policyData';

type ChatRole = 'assistant' | 'user';

type ChatAction = {
  label: string;
  to: string;
};

type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  action?: ChatAction;
  source?: 'local' | 'ai';
};

type IntentResult = {
  text: string;
  action?: ChatAction;
  source: 'local' | 'ai';
};

type ChatReplyRule = {
  test: (normalizedMessage: string) => boolean;
  reply: IntentResult;
};

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Xin chào, mình có thể hỗ trợ tìm phòng, xem đặt phòng, thanh toán hoặc trả lời nhanh các câu hỏi thường gặp.',
  },
];

const quickPrompts = [
  { label: 'Tìm phòng 2 khách', icon: CalendarSearch, prompt: 'Tôi muốn tìm phòng cho 2 khách' },
  { label: 'Đặt phòng của tôi', icon: Bell, prompt: 'Tôi muốn xem booking của tôi' },
  { label: 'Thanh toán', icon: CreditCard, prompt: 'Tôi có booking nào chưa thanh toán không?' },
  { label: 'Quy định khách sạn', icon: MessageCircle, prompt: 'Quy định check-in check-out và hủy phòng là gì?' },
];

const faqRules: ChatReplyRule[] = [
  {
    test: (normalizedMessage) => policyQuestions.some((keyword) => normalizedMessage.includes(keyword)),
    reply: {
      text: 'Mình sẽ mở trang quy định khách sạn để bạn xem đầy đủ chính sách check-in, check-out, hủy phòng và hoàn tiền.',
      action: { label: 'Xem quy định khách sạn', to: '/hotel-policy' },
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(gio (nhan|check.?in)|thoi gian (nhan|check.?in)|luc may gio (nhan|check.?in)|quy dinh nhan phong|nhan phong luc may gio|gio giac nhan phong)/.test(normalizedMessage),
    reply: {
      text: 'Giờ nhận phòng tiêu chuẩn là từ 14:00. Nhận trước 07:00 tính phụ thu 100% giá 1 đêm, từ 07:00 đến trước 12:00 tính 50%, còn từ 12:00 đến trước 14:00 được miễn phí nếu phòng sẵn sàng.',
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(gio (tra|check.?out)|thoi gian (tra|check.?out)|luc may gio (tra|check.?out)|quy dinh tra phong|tra phong luc may gio|gio giac tra phong)/.test(normalizedMessage),
    reply: {
      text: 'Giờ trả phòng tiêu chuẩn là trước 12:00. Trễ dưới 30 phút được miễn phí, từ 12:00 đến trước 14:00 phụ thu 20% giá 1 đêm, từ 14:00 đến 18:00 phụ thu 50% và sau 18:00 phụ thu 100%.',
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(huy phong|huy dat phong|cancel|huy booking|huy book)/.test(normalizedMessage),
    reply: {
      text: 'Ngày thường được hủy miễn phí trước 24 giờ, Lễ/Tết trước 72 giờ. Gói không hoàn tiền thì không được hủy để hoàn tiền.',
      action: { label: 'Xem quy định khách sạn', to: '/hotel-policy' },
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(hoan tien|refund|tra lai tien|tien hoan)/.test(normalizedMessage),
    reply: {
      text: 'Hoàn tiền do hủy booking được xử lý theo hàng đợi nội bộ, SLA tiêu chuẩn là 48 giờ. Nếu checkout sớm, refund được tính theo số đêm chưa dùng và có thể hoàn 80% phần đêm dư sau khi trừ tối thiểu 2 đêm.',
      action: { label: 'Xem quy định khách sạn', to: '/hotel-policy' },
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(wifi|internet)/.test(normalizedMessage),
    reply: {
      text: 'Khách sạn có Wi-Fi miễn phí cho khách lưu trú.',
      source: 'local',
    },
  },
  {
    test: (normalizedMessage) => /(ho boi|pool|be boi)/.test(normalizedMessage),
    reply: {
      text: 'Khách sạn có hồ bơi ngoài trời. Bạn có thể hỏi thêm lễ tân khi nhận phòng để biết khung giờ hoạt động.',
      source: 'local',
    },
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const toContextMessages = (messages: ChatMessage[]): ChatContextMessage[] =>
  messages.slice(-6).map((message) => ({
    role: message.role,
    text: message.text,
  }));

const formatMoney = (value: number) => `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateText = (value?: string) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const formatDateTimeText = (value?: string) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getVietnamTodayText = () => {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
  }).format(now);
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);

  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    date,
  };
};

const isManagementRole = (role?: string | null) => role === 'ADMIN' || role === 'STAFF';

const wantsMostExpensiveRoom = (normalizedMessage: string) =>
  /(phong|room).*(mac nhat|dat nhat|gia cao nhat|cao nhat)|(mac nhat|dat nhat|gia cao nhat|cao nhat).*(phong|room)/.test(normalizedMessage) &&
  !/(toi|cua toi|cua minh|tui|minh)/.test(normalizedMessage);

const wantsCheapestRoom = (normalizedMessage: string) =>
  /(phong|room).*(re nhat|gia thap nhat|thap nhat)|(re nhat|gia thap nhat|thap nhat).*(phong|room)/.test(normalizedMessage);

const wantsMostExpensiveInvoice = (normalizedMessage: string) =>
  /(hoa don|invoice).*(mac nhat|dat nhat|gia cao nhat|cao nhat)|(mac nhat|dat nhat|gia cao nhat|cao nhat).*(hoa don|invoice)/.test(normalizedMessage);

const wantsMyMostExpensiveBooking = (normalizedMessage: string) =>
  /(dat|booking|don|phong|hoa don|invoice).*(mac nhat|dat nhat|gia cao nhat|nhieu tien nhat|lon nhat|cao nhat)/.test(normalizedMessage) &&
  /(toi|cua toi|cua minh|tui|minh)/.test(normalizedMessage);

const wantsMyLeastExpensiveBooking = (normalizedMessage: string) =>
  /(dat|booking|don|phong).*(it tien nhat|re nhat|thap nhat|nho nhat|least).*|(it tien nhat|re nhat|thap nhat|nho nhat|least).*(dat|booking|don|phong)/.test(normalizedMessage) &&
  /(toi|cua toi|cua minh|tui|minh)/.test(normalizedMessage);

const wantsMyFirstBooking = (normalizedMessage: string) =>
  /(dau tien|dau).*(dat|booking|don|phong)/.test(normalizedMessage) &&
  /(toi|cua toi|cua minh|tui|minh)/.test(normalizedMessage);

const wantsMyTodayCheckin = (normalizedMessage: string) =>
  /(hom nay|today).*(check.?in|nhan phong|sap nhan phong|co dat|co phong)|(check.?in|nhan phong|sap nhan phong).*(hom nay|today)/.test(normalizedMessage);

const wantsMyRecentRefund = (normalizedMessage: string) =>
  /((don|yeu cau|phieu)?\s*hoan tien|refund).*(gan nhat|gan day|bao nhieu|nhieu nhat|luc nao|khi nao)|(gan nhat|gan day|khi nao|luc nao).*((don|yeu cau|phieu)?\s*hoan tien|refund)/.test(normalizedMessage);

const wantsRecentBooking = (normalizedMessage: string) =>
  /(gan nhat|moi nhat|vua dat|dat gan day|lan cuoi cung|cuoi cung|dat lan cuoi|last)/.test(normalizedMessage) &&
  /(phong|booking|dat phong|don dat|dat)/.test(normalizedMessage) &&
  !/(mac nhat|dat nhat|gia cao nhat|nhieu tien nhat|lon nhat|cao nhat)/.test(normalizedMessage);

const wantsMyBookingCount = (normalizedMessage: string) =>
  /(bao nhieu lan|so lan|m may lan|da bao nhieu lan|thue phong|dat phong)/.test(normalizedMessage) &&
  /(toi|cua toi|cua minh|tui|minh)/.test(normalizedMessage);

const wantsFamilyRoom = (normalizedMessage: string) =>
  /(phong|room).*(gia dinh|family)|(gia dinh|family).*(phong|room)/.test(normalizedMessage);

const wantsHolidayPricing = (normalizedMessage: string) =>
  /(ngay le|le tet|tet|holiday).*(gia|tien|bao nhieu|phu thu)|(gia|tien|bao nhieu|phu thu).*(ngay le|le tet|tet|holiday)/.test(normalizedMessage);

const wantsCurrentDate = (normalizedMessage: string) =>
  /(hom nay la thu may|thu may|hom nay la ngay may|ngay may|hom nay la ngay nao|hom nay la thu nao)/.test(normalizedMessage);

const getCurrentDateReply = (): IntentResult => {
  const today = getVietnamTodayText();

  return {
    text: `Hôm nay là ${today.weekday}, ngày ${today.date}.`,
    source: 'local',
  };
};

const getRefundStatusReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem lịch sử hoàn tiền của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const refunds = await refundApi.getByUser(userId);
    if (!refunds.length) {
      return {
        text: 'Hiện tại bạn chưa có hóa đơn hoặc yêu cầu hoàn tiền nào.',
        action: { label: 'Xem đặt phòng của tôi', to: '/my-bookings' },
        source: 'local',
      };
    }

    const latestRefund = refunds[0];
    return {
      text: `Bạn có ${refunds.length} giao dịch hoàn tiền. Yêu cầu gần nhất là mã #${latestRefund.id}, số tiền ${formatMoney(latestRefund.refundAmount || latestRefund.amount || 0)}.`,
      action: { label: 'Xem lịch sử hoàn tiền', to: '/profile?tab=refunds' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMostExpensiveRoomReply = async (message: string): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    if (!rooms.length) return null;

    const topRoom = [...rooms].sort((left, right) => Number(right.price || 0) - Number(left.price || 0))[0];
    if (!topRoom) return null;

    const normalized = normalize(message);
    const params = new URLSearchParams();
    if (normalized.includes('ngay mai')) {
      const tomorrow = addDays(new Date(), 1);
      params.set('checkIn', format(tomorrow, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(tomorrow, 1), 'yyyy-MM-dd'));
    } else if (normalized.includes('hom nay')) {
      const today = new Date();
      params.set('checkIn', format(today, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(today, 1), 'yyyy-MM-dd'));
    } else if (normalized.includes('cuoi tuan')) {
      const saturday = nextSaturday(new Date());
      params.set('checkIn', format(saturday, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(saturday, 1), 'yyyy-MM-dd'));
    }
    const query = params.toString();
    const toUrl = query ? `/rooms/${topRoom.id}?${query}` : `/rooms/${topRoom.id}`;

    return {
      text: `Phòng đắt nhất hiện tại là ${topRoom.name} với giá ${formatMoney(Number(topRoom.price || 0))} mỗi đêm.`,
      action: { label: 'Xem chi tiết phòng', to: toUrl },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getCheapestRoomReply = async (message: string): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    if (!rooms.length) return null;

    const topRoom = [...rooms].sort((left, right) => Number(left.price || 0) - Number(right.price || 0))[0];
    if (!topRoom) return null;

    const normalized = normalize(message);
    const params = new URLSearchParams();
    if (normalized.includes('ngay mai')) {
      const tomorrow = addDays(new Date(), 1);
      params.set('checkIn', format(tomorrow, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(tomorrow, 1), 'yyyy-MM-dd'));
    } else if (normalized.includes('hom nay')) {
      const today = new Date();
      params.set('checkIn', format(today, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(today, 1), 'yyyy-MM-dd'));
    } else if (normalized.includes('cuoi tuan')) {
      const saturday = nextSaturday(new Date());
      params.set('checkIn', format(saturday, 'yyyy-MM-dd'));
      params.set('checkOut', format(addDays(saturday, 1), 'yyyy-MM-dd'));
    }
    const query = params.toString();
    const toUrl = query ? `/rooms/${topRoom.id}?${query}` : `/rooms/${topRoom.id}`;

    return {
      text: `Phòng rẻ nhất hiện tại là ${topRoom.name} với giá ${formatMoney(Number(topRoom.price || 0))} mỗi đêm.`,
      action: { label: 'Xem chi tiết phòng', to: toUrl },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getFamilyRoomReply = async (): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    const familyRooms = rooms
      .filter((room) => {
        const searchable = normalize(`${room.name} ${room.type} ${room.description} ${room.bedType}`);
        return room.maxGuests >= 4 || /(gia dinh|family)/.test(searchable);
      })
      .sort((left, right) => Number(left.price || 0) - Number(right.price || 0));

    if (!familyRooms.length) {
      return {
        text: 'Hiện tại mình chưa thấy phòng nào được gắn rõ cho gia đình trong danh sách phòng. Bạn có thể mở trang phòng để xem toàn bộ lựa chọn.',
        action: { label: 'Xem phòng', to: '/rooms' },
        source: 'local',
      };
    }

    const topRoom = familyRooms[0];
    return {
      text: `Mình có ${familyRooms.length} phòng phù hợp cho gia đình. Gợi ý dễ đặt nhất là ${topRoom.name}, phù hợp tối đa ${topRoom.maxGuests} khách, giá ${formatMoney(Number(topRoom.price || 0))} mỗi đêm.`,
      action: { label: 'Xem phòng gia đình', to: '/rooms?maxGuests=4' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getHolidayPricingReply = async (): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    if (!rooms.length) return null;

    const sorted = [...rooms].sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
    const cheapest = sorted[0];
    const mostExpensive = sorted[sorted.length - 1];
    const multiplier = 1.3;

    return {
      text: `Dịp lễ/Tết, hệ thống đang tính giá x${multiplier}. Ví dụ phòng rẻ nhất hiện tại là ${cheapest.name} từ ${formatMoney(Number(cheapest.price || 0))} thành khoảng ${formatMoney(Number(cheapest.price || 0) * multiplier)} mỗi đêm; phòng đắt nhất là ${mostExpensive.name} từ ${formatMoney(Number(mostExpensive.price || 0))} thành khoảng ${formatMoney(Number(mostExpensive.price || 0) * multiplier)} mỗi đêm.`,
      action: { label: 'Xem phòng', to: '/rooms' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyBookingCountReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem số lần đặt phòng của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có lượt đặt phòng nào trong hệ thống.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const activeCount = list.filter((booking) => booking.status !== 'cancelled').length;
    return {
      text: `Bạn đã đặt phòng ${list.length} lần trong hệ thống. Trong đó có ${activeCount} đơn còn hiệu lực hoặc đã hoàn tất.`,
      action: { label: 'Xem đặt phòng của tôi', to: '/my-bookings' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMostExpensiveInvoiceReply = async (canViewInvoices: boolean, isAuthenticated: boolean): Promise<IntentResult | null> => {
  if (!canViewInvoices) {
    if (isAuthenticated) {
      return {
        text: 'Tài khoản khách hàng không có quyền xem thông tin hóa đơn của hệ thống. Bạn có thể xem các đặt phòng cá nhân của mình tại trang Đặt phòng.',
        action: { label: 'Xem đặt phòng', to: '/my-bookings' },
        source: 'local',
      };
    }
    return {
      text: 'Mục hóa đơn chi tiết chỉ dành cho nhân viên hoặc quản trị viên. Vui lòng đăng nhập với tài khoản phù hợp để xem.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const invoices = await staffInvoiceApi.getAll();
    if (!invoices.length) return null;

    const topInvoice = [...invoices].sort((left, right) => Number(right.amount || right.totalAmount || 0) - Number(left.amount || left.totalAmount || 0))[0] as PaymentRecord | undefined;
    if (!topInvoice) return null;

    const amount = Number(topInvoice.amount || topInvoice.totalAmount || 0);
    return {
      text: `Hóa đơn cao nhất hiện tại là INV-${topInvoice.id} với số tiền ${formatMoney(amount)}.`,
      action: { label: 'Xem chi tiết hóa đơn', to: `/staff/invoices?invoiceId=${topInvoice.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getRecentBookingReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem các đặt phòng cá nhân của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có lịch sử đặt phòng nào trong hệ thống.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const sorted = [...list].sort((left, right) => {
      const dateDiff = new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(right.id) - Number(left.id);
    });
    const latest = sorted[0];
    if (!latest) return null;

    let roomName = `Phòng ${latest.roomId}`;
    try {
      const r = await roomApi.getById(latest.roomId);
      if (r) roomName = r.name;
    } catch {
      void 0;
    }

    return {
      text: `Đặt phòng gần đây nhất của bạn là đơn đặt phòng mã #${latest.id} (${roomName}), tạo ngày ${formatDateText(latest.createdAt)} và nhận phòng ngày ${formatDateText(latest.checkIn)}. Mình sẽ mở chi tiết đặt phòng này cho bạn nhé.`,
      action: { label: 'Xem chi tiết đặt phòng', to: `/my-bookings?bookingId=${latest.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyMostExpensiveBookingReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem các đặt phòng của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có lịch sử đặt phòng nào trong hệ thống.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const sorted = [...list].sort((left, right) => Number(right.totalPrice || 0) - Number(left.totalPrice || 0));
    const highest = sorted[0];
    if (!highest) return null;

    let roomName = `Phòng ${highest.roomId}`;
    try {
      const r = await roomApi.getById(highest.roomId);
      if (r) roomName = r.name;
    } catch {
      void 0;
    }

    return {
      text: `Đơn đặt phòng đắt nhất của bạn là mã #${highest.id} (${roomName}), tạo ngày ${formatDateText(highest.createdAt)} và có tổng tiền là ${formatMoney(highest.totalPrice || 0)}. Mình sẽ mở chi tiết đơn này cho bạn nhé.`,
      action: { label: 'Xem chi tiết đặt phòng', to: `/my-bookings?bookingId=${highest.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyLeastExpensiveBookingReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem các đặt phòng của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có lịch sử đặt phòng nào trong hệ thống.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const sorted = [...list].sort((left, right) => Number(left.totalPrice || 0) - Number(right.totalPrice || 0));
    const lowest = sorted[0];
    if (!lowest) return null;

    let roomName = `Phòng ${lowest.roomId}`;
    try {
      const r = await roomApi.getById(lowest.roomId);
      if (r) roomName = r.name;
    } catch {
      void 0;
    }

    return {
      text: `Đơn đặt phòng ít tiền nhất của bạn là mã #${lowest.id} (${roomName}), tạo ngày ${formatDateText(lowest.createdAt)} và có tổng tiền là ${formatMoney(lowest.totalPrice || 0)}.`,
      action: { label: 'Xem chi tiết đặt phòng', to: `/my-bookings?bookingId=${lowest.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyFirstBookingReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem các đặt phòng của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có lịch sử đặt phòng nào trong hệ thống.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const sorted = [...list].sort((left, right) => {
      const dateDiff = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(left.id) - Number(right.id);
    });
    const first = sorted[0];
    if (!first) return null;

    let roomName = `Phòng ${first.roomId}`;
    try {
      const r = await roomApi.getById(first.roomId);
      if (r) roomName = r.name;
    } catch {
      void 0;
    }

    return {
      text: `Đơn đặt phòng đầu tiên của bạn là mã #${first.id} (${roomName}), đặt ngày ${formatDateText(first.createdAt) || format(new Date(first.createdAt || Date.now()), 'dd/MM/yyyy')}. Mình sẽ mở chi tiết đơn này cho bạn nhé.`,
      action: { label: 'Xem chi tiết đặt phòng', to: `/my-bookings?bookingId=${first.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyTodayCheckinReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem lịch trình nhận phòng của mình.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await bookingApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Hôm nay bạn không có phòng nào cần check-in.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayBookings = list.filter((booking) => booking.checkIn === todayStr && booking.status !== 'cancelled');

    if (todayBookings.length === 0) {
      return {
        text: 'Hôm nay bạn không có phòng nào cần check-in.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const firstBooking = todayBookings[0];
    let roomName = `Phòng ${firstBooking.roomId}`;
    try {
      const r = await roomApi.getById(firstBooking.roomId);
      if (r) roomName = r.name;
    } catch {
      void 0;
    }

    return {
      text: `Hôm nay bạn có phòng ${roomName} (Mã #${firstBooking.id}) cần check-in. Mình mở trang phòng đã đặt để bạn xem nhé.`,
      action: { label: 'Xem chi tiết đặt phòng', to: `/my-bookings?bookingId=${firstBooking.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMyRecentRefundReply = async (isAuthenticated: boolean, userId?: string | null): Promise<IntentResult | null> => {
  if (!isAuthenticated || !userId) {
    return {
      text: 'Bạn cần đăng nhập trước để xem thông tin hoàn tiền.',
      action: { label: 'Đăng nhập', to: '/login' },
      source: 'local',
    };
  }

  try {
    const list = await refundApi.getByUser(userId);
    if (!list.length) {
      return {
        text: 'Bạn chưa có yêu cầu hoàn tiền nào.',
        action: { label: 'Tìm phòng ngay', to: '/rooms' },
        source: 'local',
      };
    }

    const latestRefund = list[0] as RefundRecord | undefined;
    if (!latestRefund) return null;

    let roomName = `Đơn đặt phòng #${latestRefund.bookingId}`;
    try {
      const booking = await bookingApi.getById(latestRefund.bookingId);
      try {
        const r = await roomApi.getById(booking.roomId);
        if (r) roomName = r.name;
      } catch {
        void 0;
      }
    } catch {
      void 0;
    }

    return {
      text: `Yêu cầu hoàn tiền gần nhất của bạn là mã #${latestRefund.id} cho ${roomName}, tạo lúc ${formatDateTimeText(latestRefund.createdAt)}. Số tiền hoàn lại là ${formatMoney(latestRefund.refundAmount || latestRefund.amount || 0)}, phí hủy là ${formatMoney(latestRefund.cancellationFee || 0)}.`,
      action: { label: 'Xem lịch sử hoàn tiền', to: '/profile?tab=refunds' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getFaqReply = (message: string): IntentResult | null => {
  const normalized = normalize(message);
  const matchedRule = faqRules.find((rule) => rule.test(normalized));
  return matchedRule ? matchedRule.reply : null;
};

const buildRoomSearchUrl = (message: string) => {
  const normalized = normalize(message);
  const guestMatch = normalized.match(/(\d+)\s*(khach|nguoi|adult|guest)/);
  const guests = guestMatch ? Number(guestMatch[1]) : undefined;
  const params = new URLSearchParams();

  if (guests && Number.isFinite(guests)) {
    params.set('guests', String(guests));
    params.set('rooms', guests > 4 ? '2' : '1');
  }

  if (normalized.includes('ngay mai')) {
    const tomorrow = addDays(new Date(), 1);
    params.set('checkIn', format(tomorrow, 'yyyy-MM-dd'));
    params.set('checkOut', format(addDays(tomorrow, 1), 'yyyy-MM-dd'));
  } else if (normalized.includes('hom nay')) {
    const today = new Date();
    params.set('checkIn', format(today, 'yyyy-MM-dd'));
    params.set('checkOut', format(addDays(today, 1), 'yyyy-MM-dd'));
  } else if (normalized.includes('cuoi tuan')) {
    const saturday = nextSaturday(new Date());
    params.set('checkIn', format(saturday, 'yyyy-MM-dd'));
    params.set('checkOut', format(addDays(saturday, 1), 'yyyy-MM-dd'));
  }

  const query = params.toString();
  return query ? `/rooms?${query}` : '/rooms';
};

const getLocalFallbackReply = (message: string, isAuthenticated: boolean): IntentResult | null => {
  const normalized = normalize(message);

  if (/(thanh toan|payment|chua tra|chua thanh toan|hoa don)/.test(normalized)) {
    return {
      text: isAuthenticated
        ? 'Mình sẽ đưa bạn đến trang đặt phòng để kiểm tra trạng thái thanh toán và hóa đơn.'
        : 'Bạn cần đăng nhập trước để xem trạng thái thanh toán của các đặt phòng.',
      action: { label: isAuthenticated ? 'Xem thanh toán' : 'Đăng nhập', to: isAuthenticated ? '/my-bookings' : '/login' },
      source: 'local',
    };
  }

  if (/(booking|dat phong cua toi|lich su|sap checkin|sap nhan phong)/.test(normalized)) {
    return {
      text: isAuthenticated
        ? 'Mình sẽ mở danh sách đặt phòng để bạn theo dõi lịch trình, trạng thái và chi tiết hoàn tiền nếu có.'
        : 'Bạn cần đăng nhập để xem danh sách đặt phòng cá nhân.',
      action: { label: isAuthenticated ? 'Xem đặt phòng' : 'Đăng nhập', to: isAuthenticated ? '/my-bookings' : '/login' },
      source: 'local',
    };
  }

  if (/(thong bao|notification|hoan tien|refund)/.test(normalized)) {
    return {
      text: isAuthenticated
        ? 'Thông báo mới nhất đang nằm trong menu tài khoản và trang hồ sơ. Mình mở trang hồ sơ cho bạn nhé.'
        : 'Bạn cần đăng nhập để xem thông báo và trạng thái hoàn tiền.',
      action: { label: isAuthenticated ? 'Xem hồ sơ' : 'Đăng nhập', to: isAuthenticated ? '/profile' : '/login' },
      source: 'local',
    };
  }

  if (policyQuestions.some((keyword) => normalized.includes(keyword))) {
    return {
      text: 'Mình sẽ mở trang quy định khách sạn để bạn xem đầy đủ chính sách check-in, check-out, hủy phòng và hoàn tiền.',
      action: { label: 'Xem quy định khách sạn', to: '/hotel-policy' },
      source: 'local',
    };
  }

  if (/(tim phong|dat phong|book phong|phong trong|con phong|phong doi|phong don|phong suite|phong deluxe|phong standard|phong gia dinh|phong vip)/.test(normalized)) {
    return {
      text: 'Mình đã hiểu là bạn muốn tìm phòng. Mình sẽ mở trang phòng với các thông tin có thể suy ra từ câu chat.',
      action: { label: 'Tìm phòng', to: buildRoomSearchUrl(message) },
      source: 'local',
    };
  }

  return null;
};

const resolveAssistantReply = async (
  message: string,
  isAuthenticated: boolean,
  role: string | null | undefined,
  context: ChatContextMessage[],
  userId?: string | null
): Promise<IntentResult> => {
  const normalized = normalize(message);

  if (wantsCurrentDate(normalized)) {
    return getCurrentDateReply();
  }

  if (wantsMostExpensiveRoom(normalized)) {
    const roomReply = await getMostExpensiveRoomReply(message);
    if (roomReply) return roomReply;
  }

  if (wantsCheapestRoom(normalized)) {
    const roomReply = await getCheapestRoomReply(message);
    if (roomReply) return roomReply;
  }

  if (wantsMyMostExpensiveBooking(normalized)) {
    const bookingReply = await getMyMostExpensiveBookingReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (wantsMyLeastExpensiveBooking(normalized)) {
    const bookingReply = await getMyLeastExpensiveBookingReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (wantsMyFirstBooking(normalized)) {
    const bookingReply = await getMyFirstBookingReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (wantsMyTodayCheckin(normalized)) {
    const bookingReply = await getMyTodayCheckinReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (wantsMyRecentRefund(normalized)) {
    const bookingReply = await getMyRecentRefundReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (/(hoan tien|refund|hoa don hoan tien|co hoa don hoan tien|co hoan tien)/.test(normalized)) {
    const refundReply = await getRefundStatusReply(isAuthenticated, userId);
    if (refundReply) return refundReply;
  }

  if (wantsMyBookingCount(normalized)) {
    const bookingReply = await getMyBookingCountReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  if (wantsFamilyRoom(normalized)) {
    const roomReply = await getFamilyRoomReply();
    if (roomReply) return roomReply;
  }

  if (wantsHolidayPricing(normalized)) {
    const roomReply = await getHolidayPricingReply();
    if (roomReply) return roomReply;
  }

  if (wantsMostExpensiveInvoice(normalized)) {
    const invoiceReply = await getMostExpensiveInvoiceReply(isManagementRole(role), isAuthenticated);
    if (invoiceReply) return invoiceReply;
  }

  if (wantsRecentBooking(normalized)) {
    const bookingReply = await getRecentBookingReply(isAuthenticated, userId);
    if (bookingReply) return bookingReply;
  }

  const faqReply = getFaqReply(message);
  if (faqReply) {
    return faqReply;
  }

  try {
    const backendReply = await chatbotApi.ask({
      message,
      isAuthenticated,
      context,
    });

    if (backendReply.message.trim()) {
      return {
        text: backendReply.message.trim(),
        action: backendReply.action as BackendChatAction | undefined,
        source: backendReply.source === 'gemini' ? 'ai' : 'local',
      };
    }
  } catch {
    // Fallback handled below.
  }

  const fallbackReply = getLocalFallbackReply(message, isAuthenticated);
  if (fallbackReply) {
    return fallbackReply;
  }

  return {
    text: 'Mình có thể hỗ trợ nhanh các việc như tìm phòng, xem đặt phòng, kiểm tra thanh toán, thông báo, giờ check-in/check-out, Wi-Fi và hồ bơi.',
    source: 'local',
  };
};

let nextMessageId = starterMessages.length + 1;

export default function CustomerChatbot() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const authRef = useRef({ isAuthenticated, user, loading });
  useEffect(() => {
    authRef.current = { isAuthenticated, user, loading };
  }, [isAuthenticated, user, loading]);

  const waitForAuth = () => {
    if (!authRef.current.loading) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!authRef.current.loading) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };

  const latestAssistantAction = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.action)?.action,
    [messages]
  );

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, minimized, open]);

  const pushExchange = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setMessages((current) => [
      ...current,
      { id: nextMessageId++, role: 'user', text: trimmed },
    ]);
    setInput('');
    setIsSending(true);

    const context = toContextMessages([...messages, { id: nextMessageId, role: 'user', text: trimmed }]);

    try {
      await waitForAuth();
      const currentAuth = authRef.current;
      const reply = await resolveAssistantReply(
        trimmed,
        currentAuth.isAuthenticated,
        currentAuth.user?.role,
        context,
        currentAuth.user?.id
      );
      setMessages((current) => [
        ...current,
        { id: nextMessageId++, role: 'assistant', text: reply.text, action: reply.action, source: reply.source },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void pushExchange(input);
  };

  const handleAction = (action: ChatAction) => {
    navigate(action.to);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMinimized(false);
          window.setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#111] text-[#d4af37] shadow-2xl shadow-black/25 ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#1b1b1b] sm:h-16 sm:w-16"
        aria-label="Mở trợ lý đặt phòng"
      >
        <MessageCircle size={26} />
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[390px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl shadow-black/25 sm:bottom-6 sm:right-6">
      <header className="flex items-center justify-between bg-[#111] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-[#111]">
            <Bot size={19} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold">Trợ lý khách sạn</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-white/60">
                  <Sparkles size={12} /> FAQ trước, AI sau
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
            aria-label={minimized ? 'Mở rộng chat' : 'Thu gọn chat'}
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
            aria-label="Đóng chat"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          <div className="max-h-[430px] space-y-3 overflow-y-auto bg-[#f7f7f7] px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    message.role === 'user'
                      ? 'max-w-[82%] rounded-lg bg-[#111] px-4 py-3 text-sm font-semibold leading-relaxed text-white'
                      : 'max-w-[86%] rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-[#222] shadow-sm'
                  }
                >
                  {message.text}
                  {message.action && (
                    <button
                      type="button"
                      onClick={() => handleAction(message.action as ChatAction)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[#d4af37] px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-[#111] transition hover:brightness-105"
                    >
                      {message.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-xs font-bold text-[#666] shadow-sm">
                  Mình đang phân tích yêu cầu...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-black/10 bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => void pushExchange(item.prompt)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#333] transition hover:border-[#d4af37] hover:text-[#111]"
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhập yêu cầu của bạn..."
                className="min-w-0 flex-1 rounded-md border border-black/10 bg-[#fafafa] px-3 py-3 text-sm font-semibold text-[#111] outline-none transition placeholder:text-[#777] focus:border-[#d4af37]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#111] text-[#d4af37] transition hover:bg-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <Send size={18} />
              </button>
            </form>

            {latestAssistantAction && (
              <button
                type="button"
                onClick={() => handleAction(latestAssistantAction)}
                className="mt-2 w-full rounded-md border border-[#d4af37]/40 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-[#6f580e] transition hover:bg-[#d4af37]/10"
              >
                Mở lại: {latestAssistantAction.label}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
