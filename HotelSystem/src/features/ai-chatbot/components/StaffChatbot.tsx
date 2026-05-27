import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Building2,
  CalendarDays,
  CreditCard,
  DollarSign,
  Minus,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { roomApi, staffBookingApi, staffInvoiceApi, staffRefundApi, type PaymentRecord, type RefundRecord } from '../../../services/api';
import { chatbotApi, type ChatAction as BackendChatAction, type ChatContextMessage } from '../services/chatbotApi';

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

type PortalVariant = 'staff' | 'admin';

type StaffChatbotProps = {
  variant?: PortalVariant;
};

type PortalCopy = {
  title: string;
  subtitle: string;
  openLabel: string;
  assistantHint: string;
  placeholder: string;
  starter: string;
  quickPrompts: Array<{ label: string; icon: typeof Bot; prompt: string }>;
};

const getPortalCopy = (variant: PortalVariant): PortalCopy => {
  const isAdmin = variant === 'admin';

  return {
    title: isAdmin ? 'Trợ lý quản trị' : 'Trợ lý vận hành',
    subtitle: isAdmin ? 'Quản lý nhân sự, phòng và dữ liệu hệ thống' : 'DB trước, AI sau',
    openLabel: isAdmin ? 'Mở trợ lý quản trị' : 'Mở trợ lý nhân viên',
    assistantHint: isAdmin ? 'Hỏi về nhân viên, loại phòng, phòng và báo cáo' : 'Hỏi về check-in, checkout, hoàn tiền và hóa đơn',
    placeholder: isAdmin ? 'Hỏi về nhân viên, loại phòng, phòng...' : 'Hỏi về check-in, checkout, hoàn tiền...',
    starter: isAdmin
      ? 'Xin chào, mình có thể hỗ trợ quản lý nhân viên, loại phòng, phòng và dữ liệu vận hành trong hệ thống.'
      : 'Xin chào, mình có thể hỗ trợ nhân viên tra cứu check-in, checkout, hóa đơn, hoàn tiền và thông tin phòng từ dữ liệu hệ thống.',
    quickPrompts: isAdmin
      ? [
          { label: 'Quản lý nhân viên', icon: Users, prompt: 'Mở trang quản lý nhân viên' },
          { label: 'Quản lý loại phòng', icon: Building2, prompt: 'Mở trang quản lý loại phòng' },
          { label: 'Quản lý phòng', icon: CalendarDays, prompt: 'Mở trang quản lý phòng' },
          { label: 'Hóa đơn cao nhất', icon: DollarSign, prompt: 'Hóa đơn nào nhiều tiền nhất?' },
        ]
      : [
          { label: 'Check-in hôm nay', icon: CalendarDays, prompt: 'Hôm nay có bao nhiêu check-in?' },
          { label: 'Checkout hôm nay', icon: Users, prompt: 'Hôm nay có bao nhiêu checkout?' },
          { label: 'Hoàn tiền mới', icon: CreditCard, prompt: 'Đơn hoàn tiền gần nhất là gì?' },
          { label: 'Hóa đơn cao nhất', icon: DollarSign, prompt: 'Hóa đơn nào nhiều tiền nhất?' },
        ],
  };
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

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

const toContextMessages = (messages: ChatMessage[]): ChatContextMessage[] =>
  messages.slice(-6).map((message) => ({
    role: message.role,
    text: message.text,
  }));

const wantsCurrentDate = (normalizedMessage: string) =>
  /(hom nay la thu may|thu may|hom nay la ngay may|ngay may|hom nay la ngay nao|hom nay la thu nao)/.test(normalizedMessage);

const wantsTodayCheckin = (normalizedMessage: string) =>
  /(hom nay|today).*(check.?in|nhan phong|check in).*(bao nhieu|so luong|may booking|may don)|check.?in|nhan phong.*(hom nay|today)/.test(normalizedMessage);

const wantsTodayCheckout = (normalizedMessage: string) =>
  /(hom nay|today).*(check.?out|checkout|tra phong).*(bao nhieu|so luong|may booking|may don)|check.?out|checkout|tra phong.*(hom nay|today)/.test(normalizedMessage);

const wantsTodayRoomHighlight = (normalizedMessage: string) =>
  /(phong|room).*(hom nay|today).*(trong|sang|booked|occupied|check out)|hom nay.*(phong|room).*(trong|sang|booked|occupied|check out)/.test(normalizedMessage);

const wantsMostExpensiveRoom = (normalizedMessage: string) =>
  /(phong|room).*(mac nhat|dat nhat|gia cao nhat|cao nhat)|(mac nhat|dat nhat|gia cao nhat|cao nhat).*(phong|room)/.test(normalizedMessage);

const wantsCheapestRoom = (normalizedMessage: string) =>
  /(phong|room).*(re nhat|gia thap nhat|thap nhat)|(re nhat|gia thap nhat|thap nhat).*(phong|room)/.test(normalizedMessage);

const wantsFamilyRoom = (normalizedMessage: string) =>
  /(phong|room).*(gia dinh|family)|(gia dinh|family).*(phong|room)/.test(normalizedMessage);

const wantsInvoiceMostExpensive = (normalizedMessage: string) =>
  /(hoa don|invoice).*(mac nhat|dat nhat|gia cao nhat|cao nhat)|(mac nhat|dat nhat|gia cao nhat|cao nhat).*(hoa don|invoice)/.test(normalizedMessage);

const wantsRefundStatus = (normalizedMessage: string) =>
  /(hoan tien|refund|yeu cau hoan tien|don hoan tien)/.test(normalizedMessage);

const wantsBookingCount = (normalizedMessage: string) =>
  /(bao nhieu lan|so lan|da bao nhieu lan|thuê phong|thue phong|dat phong)/.test(normalizedMessage);

const getPortalSpecificReply = (normalizedMessage: string, variant: PortalVariant): IntentResult | null => {
  if (variant !== 'admin') {
    return null;
  }

  if (/(nhan vien|employee|staff|nguoi dung)/.test(normalizedMessage)) {
    return {
      text: 'Mình sẽ mở trang quản lý nhân viên cho bạn.',
      action: { label: 'Quản lý nhân viên', to: '/admin/nhan-vien' },
      source: 'local',
    };
  }

  if (/(loai phong|room type|roomtype|hang phong)/.test(normalizedMessage)) {
    return {
      text: 'Mình sẽ mở trang quản lý loại phòng cho bạn.',
      action: { label: 'Quản lý loại phòng', to: '/admin/room-types' },
      source: 'local',
    };
  }

  if (/(quan ly phong|danh sach phong|phong|room)/.test(normalizedMessage)) {
    return {
      text: 'Mình sẽ mở trang quản lý phòng cho bạn.',
      action: { label: 'Quản lý phòng', to: '/admin/rooms' },
      source: 'local',
    };
  }

  return null;
};

const getCurrentDateReply = (): IntentResult => {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long' }).format(now);
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);

  return { text: `Hôm nay là ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ngày ${date}.`, source: 'local' };
};

const getTodayCheckinReply = async (): Promise<IntentResult | null> => {
  try {
    const [stats, list] = await Promise.all([
      staffBookingApi.getTodayStats(),
      staffBookingApi.getTodayCheckInList(),
    ]);

    const first = list[0];
    if (!first) {
      return {
        text: `Hôm nay có ${stats.totalCheckInToday} booking check-in. Hiện chưa có khách nào trong danh sách cần xử lý ngay.`,
        action: { label: 'Mở check-in', to: '/staff/check-in' },
        source: 'local',
      };
    }

    return {
      text: `Hôm nay có ${stats.totalCheckInToday} booking check-in. Booking đầu tiên đang chờ xử lý là #${first.id} (phòng ${first.roomId}) nhận phòng ngày ${formatDateText(first.checkIn)}.`,
      action: { label: 'Mở check-in', to: '/staff/check-in' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getTodayCheckoutReply = async (): Promise<IntentResult | null> => {
  try {
    const [stats, list] = await Promise.all([
      staffBookingApi.getTodayStats(),
      staffBookingApi.getTodayCheckoutList(),
    ]);

    const first = list[0];
    if (!first) {
      return {
        text: `Hôm nay có ${stats.totalCheckOutToday} booking checkout. Danh sách hiện đang trống hoặc đã được xử lý hết.`,
        action: { label: 'Mở checkout', to: '/staff/checkout' },
        source: 'local',
      };
    }

    return {
      text: `Hôm nay có ${stats.totalCheckOutToday} booking checkout. Booking đầu tiên là #${first.id} (phòng ${first.roomId}), ngày trả phòng ${formatDateText(first.checkOut)}.`,
      action: { label: 'Mở checkout', to: '/staff/checkout' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getTodayRoomHighlightReply = async (): Promise<IntentResult | null> => {
  try {
    const highlight = await staffBookingApi.getTodayRoomHighlight();
    return {
      text: `Hôm nay có ${highlight.bookedRooms.length} phòng đã đặt, ${highlight.occupiedRooms.length} phòng đang ở và ${highlight.checkOutRooms.length} phòng cần checkout.`,
      action: { label: 'Mở phòng', to: '/staff/rooms' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMostExpensiveRoomReply = async (): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    if (!rooms.length) return null;
    const topRoom = [...rooms].sort((left, right) => Number(right.price || 0) - Number(left.price || 0))[0];
    return {
      text: `Phòng đắt nhất hiện tại là ${topRoom.name} với giá ${formatMoney(Number(topRoom.price || 0))} mỗi đêm và sức chứa tối đa ${topRoom.maxGuests} khách.`,
      action: { label: 'Mở phòng', to: '/staff/rooms' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getCheapestRoomReply = async (): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    if (!rooms.length) return null;
    const topRoom = [...rooms].sort((left, right) => Number(left.price || 0) - Number(right.price || 0))[0];
    return {
      text: `Phòng rẻ nhất hiện tại là ${topRoom.name} với giá ${formatMoney(Number(topRoom.price || 0))} mỗi đêm và sức chứa tối đa ${topRoom.maxGuests} khách.`,
      action: { label: 'Mở phòng', to: '/staff/rooms' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getFamilyRoomReply = async (): Promise<IntentResult | null> => {
  try {
    const rooms = await roomApi.getAll();
    const familyRooms = rooms.filter((room) => room.maxGuests >= 4 || /(gia dinh|family)/.test(normalize(`${room.name} ${room.description} ${room.type}`)));
    if (!familyRooms.length) {
      return {
        text: 'Hiện tại chưa thấy phòng nào được gắn rõ cho gia đình trong dữ liệu phòng.',
        action: { label: 'Mở phòng', to: '/staff/rooms' },
        source: 'local',
      };
    }

    const topRoom = familyRooms.sort((left, right) => Number(left.price || 0) - Number(right.price || 0))[0];
    return {
      text: `Có ${familyRooms.length} phòng phù hợp cho gia đình. Gợi ý dễ bán nhất là ${topRoom.name}, tối đa ${topRoom.maxGuests} khách, giá ${formatMoney(Number(topRoom.price || 0))}.`,
      action: { label: 'Mở phòng', to: '/staff/rooms' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getMostExpensiveInvoiceReply = async (): Promise<IntentResult | null> => {
  try {
    const invoices = await staffInvoiceApi.getAll();
    if (!invoices.length) return null;
    const topInvoice = [...invoices].sort((left, right) => Number(right.amount || right.totalAmount || 0) - Number(left.amount || left.totalAmount || 0))[0] as PaymentRecord | undefined;
    const amount = Number(topInvoice?.amount || topInvoice?.totalAmount || 0);
    return {
      text: `Hóa đơn cao nhất hiện tại là INV-${topInvoice?.id} với số tiền ${formatMoney(amount)}.`,
      action: { label: 'Xem hóa đơn', to: `/staff/invoices?invoiceId=${topInvoice?.id}` },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getRefundStatusReply = async (): Promise<IntentResult | null> => {
  try {
    const refunds = await staffRefundApi.getAll();
    if (!refunds.length) {
      return {
        text: 'Hiện chưa có yêu cầu hoàn tiền nào trong hệ thống.',
        action: { label: 'Mở hoàn tiền', to: '/staff/refunds' },
        source: 'local',
      };
    }

    const latest = refunds[0] as RefundRecord;
    return {
      text: `Yêu cầu hoàn tiền gần nhất là #${latest.id} cho booking #${latest.bookingId}, tạo lúc ${formatDateTimeText(latest.createdAt)} với số tiền ${formatMoney(latest.refundAmount || latest.amount || 0)}.`,
      action: { label: 'Mở hoàn tiền', to: '/staff/refunds?tab=WORK' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getBookingCountReply = async (): Promise<IntentResult | null> => {
  try {
    const list = await staffBookingApi.getCheckInList();
    return {
      text: `Hiện có ${list.length} booking nằm trong danh sách vận hành cần theo dõi.`,
      action: { label: 'Mở check-in', to: '/staff/check-in' },
      source: 'local',
    };
  } catch {
    return null;
  }
};

const getGeneralAIReply = async (message: string, context: ChatContextMessage[]): Promise<IntentResult | null> => {
  try {
    const reply = await chatbotApi.ask({
      message,
      isAuthenticated: true,
      context,
    });

    if (!reply.message.trim()) return null;

    return {
      text: reply.message.trim(),
      action: reply.action as BackendChatAction | undefined,
      source: reply.source === 'gemini' ? 'ai' : 'local',
    };
  } catch {
    return null;
  }
};

const StaffChatbot = ({ variant = 'staff' }: StaffChatbotProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveVariant: PortalVariant = variant === 'admin' || user?.role === 'ADMIN' ? 'admin' : 'staff';
  const portalCopy = getPortalCopy(effectiveVariant);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: portalCopy.starter,
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const latestAssistantAction = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.action)?.action,
    [messages]
  );

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, minimized, open]);

  const resolveReply = async (message: string): Promise<IntentResult> => {
    const normalized = normalize(message);

    const portalReply = getPortalSpecificReply(normalized, effectiveVariant);
    if (portalReply) return portalReply;

    if (wantsCurrentDate(normalized)) return getCurrentDateReply();
    if (wantsTodayCheckin(normalized)) return (await getTodayCheckinReply()) || { text: 'Mình chưa lấy được danh sách check-in hôm nay.', source: 'local' };
    if (wantsTodayCheckout(normalized)) return (await getTodayCheckoutReply()) || { text: 'Mình chưa lấy được danh sách checkout hôm nay.', source: 'local' };
    if (wantsTodayRoomHighlight(normalized)) return (await getTodayRoomHighlightReply()) || { text: 'Mình chưa lấy được highlight phòng hôm nay.', source: 'local' };
    if (wantsMostExpensiveRoom(normalized)) return (await getMostExpensiveRoomReply()) || { text: 'Mình chưa lấy được phòng đắt nhất.', source: 'local' };
    if (wantsCheapestRoom(normalized)) return (await getCheapestRoomReply()) || { text: 'Mình chưa lấy được phòng rẻ nhất.', source: 'local' };
    if (wantsFamilyRoom(normalized)) return (await getFamilyRoomReply()) || { text: 'Mình chưa thấy phòng gia đình trong dữ liệu.', source: 'local' };
    if (wantsInvoiceMostExpensive(normalized)) return (await getMostExpensiveInvoiceReply()) || { text: 'Mình chưa lấy được hóa đơn cao nhất.', source: 'local' };
    if (wantsRefundStatus(normalized)) return (await getRefundStatusReply()) || { text: 'Mình chưa lấy được yêu cầu hoàn tiền gần nhất.', source: 'local' };
    if (wantsBookingCount(normalized)) return (await getBookingCountReply()) || { text: 'Mình chưa lấy được số booking hiện tại.', source: 'local' };

    const aiReply = await getGeneralAIReply(message, toContextMessages(messages));
    if (aiReply) return aiReply;

    return {
      text: 'Mình chưa hiểu rõ yêu cầu này. Bạn có thể hỏi mình về check-in, checkout, hoàn tiền, hóa đơn hoặc phòng.',
      source: 'local',
    };
  };

  const pushExchange = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      const reply = await resolveReply(trimmed);
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: reply.text, action: reply.action, source: reply.source }]);
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
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-2xl shadow-sky-500/25 ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-sky-700 sm:h-16 sm:w-16"
        aria-label={portalCopy.openLabel}
      >
        <Bot size={26} />
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-sky-500/15 sm:bottom-6 sm:right-6">
      <header className="flex items-center justify-between bg-sky-700 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sky-700">
            <Building2 size={19} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold">{portalCopy.title}</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-white/75">
              <Sparkles size={12} /> {portalCopy.assistantHint}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label={minimized ? 'Mở rộng chat' : 'Thu gọn chat'}
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Đóng chat"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          <div className="max-h-[430px] space-y-3 overflow-y-auto bg-[#f8fbff] px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    message.role === 'user'
                      ? 'max-w-[82%] rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold leading-relaxed text-white'
                      : 'max-w-[88%] rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700 shadow-sm'
                  }
                >
                  {message.text}
                  {message.action && (
                    <button
                      type="button"
                      onClick={() => handleAction(message.action as ChatAction)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-sky-700"
                    >
                      {message.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-xs font-bold text-slate-500 shadow-sm">
                  Mình đang tra dữ liệu vận hành...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-sky-100 bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {portalCopy.quickPrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => void pushExchange(item.prompt)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
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
                placeholder={portalCopy.placeholder}
                className="min-w-0 flex-1 rounded-xl border border-sky-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <Send size={18} />
              </button>
            </form>

            {latestAssistantAction && (
              <button
                type="button"
                onClick={() => handleAction(latestAssistantAction)}
                className="mt-2 w-full rounded-xl border border-sky-200 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-sky-700 transition hover:bg-sky-50"
              >
                Mở lại: {latestAssistantAction.label}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default StaffChatbot;