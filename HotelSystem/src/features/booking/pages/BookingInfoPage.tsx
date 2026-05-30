import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { bookingApi, paymentApi, userApi } from '../../../services/api';
import type { PaymentType } from '../../../services/api';
import Alert from '../../../shared/components/ui/Alert';
import { CHECK_IN_TIME_LABEL, CHECK_OUT_TIME_LABEL, calculateStayPricing } from '../../../shared/lib/bookingPricing';
import { normalizeDateInputValue } from '../../../shared/lib/date';
import { consumeClientRateLimit } from '../../../shared/lib/clientRateLimiter';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type RoomGuest = {
  fullName: string;
  phone: string;
  citizenId: string;
  dateOfBirth: string;
  gender: Gender;
  email?: string;
};
type RoomGuestForm = {
  useAccount: boolean;
  representative: RoomGuest;
  members: RoomGuest[];
};

type GuestFieldErrors = Partial<Record<keyof RoomGuest, string>>;
type RoomValidationErrors = {
  representative: GuestFieldErrors;
  members: GuestFieldErrors[];
  room?: string;
};

type BookingValidationState = {
  rooms: Record<string, RoomValidationErrors>;
  formError: string;
  isValid: boolean;
};

const PHONE_PATTERN = /^(?:0\d{9}|\+?84\d{9})$/;
const PASSPORT_PATTERN = /^[A-Za-z0-9-]{5,20}$/;

const emptyGuest = (): RoomGuest => ({
  fullName: '',
  phone: '',
  citizenId: '',
  dateOfBirth: '',
  gender: 'MALE',
  email: '',
});

const getAge = (dob: string) => {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;

const isValidPhone = (value: string) => PHONE_PATTERN.test(value.trim());

const isValidDocument = (value: string) => {
  const document = value.trim();
  if (!document) return false;
  if (/^\d+$/.test(document)) return document.length === 12;
  return PASSPORT_PATTERN.test(document);
};

const isValidDate = (value: string) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const validateBookingForm = (items: Array<{ id?: string; room: { maxCapacity?: number; roomType: { maxCapacity?: number } } }>, roomForms: Record<string, RoomGuestForm>): BookingValidationState => {
  const rooms: BookingValidationState['rooms'] = {};
  let formError = '';

  items.forEach((item) => {
    if (!item.id) return;
    const form = roomForms[item.id];
    if (!form) return;

    const representativeErrors: GuestFieldErrors = {};
    const memberErrors: GuestFieldErrors[] = [];
    const capacity = Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 1);
    const maxCompanions = Math.max(0, capacity - 1);

    const rep = form.representative;
    if (!rep.fullName.trim()) representativeErrors.fullName = 'Họ tên không được để trống.';
    if (!rep.phone.trim()) representativeErrors.phone = 'SĐT không được để trống.';
    else if (!isValidPhone(rep.phone)) representativeErrors.phone = 'SĐT không hợp lệ.';
    if (!rep.citizenId.trim()) representativeErrors.citizenId = 'CCCD/Passport không được để trống.';
    else if (!isValidDocument(rep.citizenId)) representativeErrors.citizenId = 'CCCD phải đúng 12 chữ số hoặc Passport hợp lệ.';
    if (!rep.dateOfBirth) representativeErrors.dateOfBirth = 'Ngày sinh là bắt buộc.';
    else if (!isValidDate(rep.dateOfBirth)) representativeErrors.dateOfBirth = 'Ngày sinh không hợp lệ.';
    else if (getAge(rep.dateOfBirth) < 18) representativeErrors.dateOfBirth = 'Người đại diện phải từ 18 tuổi trở lên.';

    if (form.members.length > maxCompanions) {
      rooms[item.id] = {
        representative: representativeErrors,
        members: form.members.map(() => ({})),
        room: `Phòng chỉ nhận tối đa ${capacity} khách gồm 1 người đại diện + ${maxCompanions} người đi cùng.`,
      };
      formError = formError || `Phòng ${item.room.roomType.maxCapacity ? 'đang vượt quá sức chứa.' : 'không hợp lệ.'}`;
      return;
    }

    form.members.forEach((member, index) => {
      const memberError: GuestFieldErrors = {};
      if (!member.fullName.trim()) memberError.fullName = 'Họ tên không được để trống.';
      if (member.phone.trim() && !isValidPhone(member.phone)) memberError.phone = 'SĐT không hợp lệ.';
      if (member.dateOfBirth && !isValidDate(member.dateOfBirth)) memberError.dateOfBirth = 'Ngày sinh không hợp lệ.';
      memberErrors[index] = memberError;
    });

    rooms[item.id] = { representative: representativeErrors, members: memberErrors };

    const hasRoomError = Boolean(representativeErrors.fullName || representativeErrors.phone || representativeErrors.citizenId || representativeErrors.dateOfBirth || rooms[item.id].room || memberErrors.some((error) => Object.values(error).some(Boolean)));
    if (hasRoomError && !formError) {
      formError = `Vui lòng kiểm tra lại thông tin phòng ${item.room.roomType.maxCapacity ? item.room.roomType.maxCapacity : ''}`.trim();
    }
  });

  const isValid = Object.values(rooms).every((roomError) => {
    const representativeValid = Object.keys(roomError.representative).length === 0;
    const membersValid = roomError.members.every((member) => Object.keys(member).length === 0);
    return representativeValid && membersValid && !roomError.room;
  });

  return { rooms, formError, isValid: isValid && !formError };
};

export default function BookingInfoPage() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, checkIn, checkOut, clearCart } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('DEPOSIT');
  const [paymentProvider, setPaymentProvider] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [ratePlan] = useState<'FLEXIBLE' | 'NON_REFUNDABLE'>('FLEXIBLE');
  const [notes, setNotes] = useState('');
  const [roomForms, setRoomForms] = useState<Record<string, RoomGuestForm>>({});

  const accountGuest = useMemo<RoomGuest>(() => ({
    fullName: user?.fullName || user?.name || '',
    phone: user?.phoneNumber || user?.phone || '',
    citizenId: '',
    dateOfBirth: normalizeDateInputValue(user?.dateOfBirth),
    gender: 'MALE',
    email: user?.email || '',
  }), [user]);

  useEffect(() => {
    setRoomForms((current) => {
      const next: Record<string, RoomGuestForm> = {};
      cartItems.forEach((item, index) => {
        next[item.id] = current[item.id] || {
          useAccount: index === 0,
          representative: index === 0 ? accountGuest : emptyGuest(),
          members: [],
        };
      });
      return next;
    });
  }, [cartItems, accountGuest]);

  useEffect(() => {
    if (!user?.dateOfBirth) {
      userApi.getMe().then((response) => {
        const profileDob = normalizeDateInputValue(response.data.dateOfBirth);
        if (!profileDob) return;
        setRoomForms((current) => {
          const next = { ...current };
          Object.keys(next).forEach((roomKey) => {
            if (next[roomKey].useAccount && !next[roomKey].representative.dateOfBirth) {
              next[roomKey] = { ...next[roomKey], representative: { ...next[roomKey].representative, dateOfBirth: profileDob } };
            }
          });
          return next;
        });
      }).catch(() => undefined);
    }
  }, [user?.dateOfBirth]);

  const orderSummary = useMemo(() => {
    if (!checkIn || !checkOut || cartItems.length === 0) return null;
    const summary = calculateStayPricing(cartItems.map((item) => item.room), checkIn, checkOut, ratePlan);
    if (!summary) return null;
    return {
      ...summary,
      items: summary.rooms.map((roomSummary, index) => ({
        ...cartItems[index],
        total: roomSummary.totalBeforeHoliday,
        nightlyDetails: roomSummary.nightlyDetails,
      })),
    };
  }, [cartItems, checkIn, checkOut, ratePlan]);

  const validationState = useMemo(
    () => validateBookingForm(orderSummary?.items || [], roomForms),
    [orderSummary, roomForms]
  );

  const payableAmount = useMemo(() => {
    if (!orderSummary) return 0;
    if (ratePlan === 'NON_REFUNDABLE' || paymentType === 'FULL') return orderSummary.finalTotal;
    return orderSummary.depositAmount;
  }, [orderSummary, ratePlan, paymentType]);

  const updateRepresentative = (roomKey: string, patch: Partial<RoomGuest>) => {
    setRoomForms((current) => ({
      ...current,
      [roomKey]: {
        ...current[roomKey],
        representative: { ...current[roomKey].representative, ...patch },
      },
    }));
  };

  const toggleUseAccount = (roomKey: string, checked: boolean) => {
    setRoomForms((current) => ({
      ...current,
      [roomKey]: {
        ...current[roomKey],
        useAccount: checked,
        representative: checked ? { ...accountGuest, citizenId: current[roomKey].representative.citizenId } : current[roomKey].representative,
      },
    }));
  };

  const addMember = (roomKey: string) => {
    setRoomForms((current) => ({
      ...current,
      [roomKey]: { ...current[roomKey], members: [...current[roomKey].members, emptyGuest()] },
    }));
  };

  const updateMember = (roomKey: string, index: number, patch: Partial<RoomGuest>) => {
    setRoomForms((current) => ({
      ...current,
      [roomKey]: {
        ...current[roomKey],
        members: current[roomKey].members.map((member, memberIndex) => memberIndex === index ? { ...member, ...patch } : member),
      },
    }));
  };

  const removeMember = (roomKey: string, index: number) => {
    setRoomForms((current) => ({
      ...current,
      [roomKey]: { ...current[roomKey], members: current[roomKey].members.filter((_, memberIndex) => memberIndex !== index) },
    }));
  };

  const validate = () => {
    if (!orderSummary || !checkIn || !checkOut) return 'Thiếu ngày nhận/trả phòng.';
    for (const item of orderSummary.items) {
      const form = roomForms[item.id];
      const rep = form?.representative;
      const capacity = Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 1);
      const guestCount = 1 + (form?.members.filter((member) => member.fullName.trim()).length || 0);
      if (!rep?.fullName.trim() || !rep.phone.trim() || !rep.citizenId.trim() || !rep.dateOfBirth) {
        return `Phòng ${item.room.roomNumber} cần đủ thông tin người đại diện.`;
      }
      if (getAge(rep.dateOfBirth) < 18) {
        return `Người đại diện phòng ${item.room.roomNumber} phải từ 18 tuổi trở lên.`;
      }
      if (guestCount > capacity) {
        return `Phòng ${item.room.roomNumber} vượt quá sức chứa ${capacity} khách.`;
      }
    }
    return '';
  };

  const handleCreateBooking = async () => {
    if (!orderSummary || !user || !checkIn || !checkOut) return;
    if (submitting) return;

    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    const roomKey = orderSummary.items.map((item) => item.room.id).join(',');
    const limit = consumeClientRateLimit(`booking-create:${user.id}:${checkIn}:${checkOut}:${roomKey}`, 8000);
    if (!limit.allowed) {
      setError(`Yêu cầu đặt phòng đang được xử lý. Vui lòng thử lại sau ${limit.retryAfterSeconds} giây.`);
      return;
    }

    setSubmitting(true);
    try {
      const totalRoomCapacity = cartItems.reduce((sum, item) => sum + Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 0), 0);
      const rooms = orderSummary.items.map((item) => {
        const form = roomForms[item.id];
        const rep = form.representative;
        return {
          roomId: Number(item.room.id),
          roomTypeId: Number(item.room.roomType.id),
          priceSnapshot: item.room.roomType.basePrice,
          guests: [
            {
              ...rep,
              roomId: Number(item.room.id),
              primary: true,
              checkInPerson: true,
              role: 'REPRESENTATIVE' as const,
              cccd: rep.citizenId,
            },
            ...form.members.filter((member) => member.fullName.trim()).map((member) => ({
              ...member,
              roomId: Number(item.room.id),
              primary: false,
              role: 'MEMBER' as const,
              cccd: member.citizenId,
            })),
          ],
        };
      });

      const firstRep = rooms[0].guests[0];
      const booking = await bookingApi.create({
        userId: Number(user.id),
        checkIn,
        checkOut,
        paymentType,
        ratePlan,
        source: 'WEB',
        notes,
        guestCount: rooms.reduce((sum, room) => sum + room.guests.length, 0),
        roomCapacitySnapshot: totalRoomCapacity,
        rooms,
        primaryGuest: firstRep,
        guests: rooms.flatMap((room) => room.guests),
      });

      const bookingTotal = Number((booking as any).totalPrice || (booking as any).finalTotal || orderSummary.finalTotal);
      const payment = paymentProvider === 'MOMO'
        ? await paymentApi.createMoMo({
          bookingId: Number(booking.id),
          userId: Number(user.id),
          totalAmount: bookingTotal,
          paymentType,
          requestType: 'payWithATM',
        })
        : await paymentApi.createVNPay({
          bookingId: Number(booking.id),
          userId: Number(user.id),
          totalAmount: bookingTotal,
          paymentType,
          locale: 'vn',
        });

      if (!payment.paymentUrl) throw new Error('Không nhận được liên kết thanh toán.');
      clearCart();
      window.location.href = payment.paymentUrl;
    } catch (e: any) {
      setError(e.userMessage || e.response?.data?.message || e.message || 'Đặt phòng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (cartItems.length === 0) return <Navigate to="/rooms" replace />;

  return (
    <div className="min-h-screen bg-[#f5f1e8] py-10">
      <div className="container-custom mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/booking/cart" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-stone-500 hover:text-stone-950">
            <ArrowLeft size={16} /> Quay lại giỏ hàng
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-700 shadow-sm">
            <ShieldCheck size={14} /> Thanh toán bảo mật
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,420px]">
          <div className="space-y-6">
            <div className="rounded-4xl bg-stone-950 p-8 text-white shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-300">Thông tin khách lưu trú</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Nhập khách theo từng phòng</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-stone-300">
                Booking là đơn tổng, nhưng mỗi phòng cần người đại diện và danh sách khách riêng để staff check-in/check-out theo phòng.
              </p>
            </div>

            {error && <Alert variant="error" className="rounded-2xl font-bold">{error}</Alert>}

            {orderSummary?.items.map((item) => {
              const form = roomForms[item.id];
              if (!form) return null;
              const capacity = Number(item.room.maxCapacity || item.room.roomType.maxCapacity || 1);
              const roomError = validationState.rooms[item.id];
              const canAddMember = form.members.length < Math.max(0, capacity - 1);
              return (
                <section key={item.id} className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#fffaf0] px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">Phòng {item.room.roomNumber} - {item.room.roomType.type}</div>
                      <div className="mt-1 text-sm font-bold text-stone-500">Sức chứa tối đa {capacity} khách · {formatCurrency(item.total)}</div>
                    </div>
                    <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-stone-700 shadow-sm">
                      <input type="checkbox" checked={form.useAccount} onChange={(event) => toggleUseAccount(item.id, event.target.checked)} />
                      Dùng thông tin tài khoản của tôi làm người đại diện phòng này
                    </label>
                  </div>

                  <div className="space-y-6 p-6">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                      Mỗi phòng cần ít nhất 1 người đại diện từ 18 tuổi trở lên và có CCCD hợp lệ.
                    </div>
                    {roomError?.room && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                        {roomError.room}
                      </div>
                    )}

                    <div>
                      <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-stone-500">
                        <UserRound size={18} /> Người đại diện
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <GuestInput label="Họ tên" value={form.representative.fullName} error={roomError?.representative.fullName} onChange={(value) => updateRepresentative(item.id, { fullName: value })} />
                        <GuestInput label="SĐT" value={form.representative.phone} error={roomError?.representative.phone} onChange={(value) => updateRepresentative(item.id, { phone: value })} />
                        <GuestInput label="CCCD/Passport" value={form.representative.citizenId} error={roomError?.representative.citizenId} onChange={(value) => updateRepresentative(item.id, { citizenId: value })} />
                        <GuestInput type="date" label="Ngày sinh" value={form.representative.dateOfBirth} error={roomError?.representative.dateOfBirth} onChange={(value) => updateRepresentative(item.id, { dateOfBirth: value })} />
                        <label className="space-y-2">
                          <span className="ml-1 text-xs font-black uppercase tracking-widest text-stone-400">Giới tính</span>
                          <select value={form.representative.gender} onChange={(event) => updateRepresentative(item.id, { gender: event.target.value as Gender })} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-amber-500">
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest text-stone-500">Người đi cùng</h2>
                        <button type="button" disabled={!canAddMember} onClick={() => addMember(item.id)} className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-xs font-black text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300">
                          <Plus size={14} /> Thêm khách
                        </button>
                      </div>
                      <div className="space-y-3">
                        {form.members.length === 0 && <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm font-bold text-stone-400">Chưa có khách đi cùng cho phòng này.</div>}
                        {form.members.map((member, memberIndex) => (
                          <div key={memberIndex} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="text-xs font-black uppercase text-stone-400">Khách đi cùng {memberIndex + 1}</div>
                              <button type="button" onClick={() => removeMember(item.id, memberIndex)} className="text-rose-600"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <GuestInput label="Họ tên" value={member.fullName} error={roomError?.members?.[memberIndex]?.fullName} onChange={(value) => updateMember(item.id, memberIndex, { fullName: value })} />
                              <GuestInput label="SĐT" value={member.phone} error={roomError?.members?.[memberIndex]?.phone} onChange={(value) => updateMember(item.id, memberIndex, { phone: value })} />
                              <GuestInput type="date" label="Ngày sinh" value={member.dateOfBirth} error={roomError?.members?.[memberIndex]?.dateOfBirth} onChange={(value) => updateMember(item.id, memberIndex, { dateOfBirth: value })} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            <section className="rounded-4xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-stone-500">Yêu cầu đặc biệt</h2>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Ví dụ: cần phòng gần nhau, check-in muộn..." className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-amber-500" />
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-4xl bg-white p-6 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-stone-400">Xác nhận đặt phòng</p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">Đơn đặt phòng</h2>
              <div className="mt-5 space-y-3 rounded-2xl bg-stone-50 p-4 text-sm font-bold text-stone-700">
                <div className="flex justify-between"><span>Người đặt</span><span>{user.fullName || user.name}</span></div>
                <div className="flex justify-between"><span>Số phòng</span><span>{cartItems.length}</span></div>
                <div className="flex justify-between"><span>Ngày nhận</span><span>{checkIn}</span></div>
                <div className="flex justify-between"><span>Ngày trả</span><span>{checkOut}</span></div>
                <div className="text-xs text-stone-400">Check-in {CHECK_IN_TIME_LABEL} · Check-out {CHECK_OUT_TIME_LABEL}</div>
              </div>

              <div className="mt-5 space-y-3">
                {orderSummary?.items.map((item) => {
                  const form = roomForms[item.id];
                  return (
                    <div key={item.id} className="rounded-2xl border border-stone-100 p-4">
                      <div className="font-black text-stone-950">Phòng {item.room.roomNumber} | {item.room.roomType.type}</div>
                      <div className="mt-1 text-xs font-bold text-stone-500">Đại diện: {form?.representative.fullName || 'Chưa nhập'} | {(form?.members.length || 0) + 1} khách</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 border-t border-stone-100 pt-5 text-sm font-bold">
                <div className="flex justify-between"><span>Tổng tiền</span><span>{formatCurrency(orderSummary?.finalTotal || 0)}</span></div>
                <div className="flex justify-between text-amber-700"><span>Tiền cọc</span><span>{formatCurrency(orderSummary?.depositAmount || 0)}</span></div>
                <div className="flex justify-between text-stone-500"><span>Còn lại</span><span>{formatCurrency(Math.max(0, (orderSummary?.finalTotal || 0) - payableAmount))}</span></div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentType('DEPOSIT')} className={`rounded-2xl border px-4 py-3 text-xs font-black ${paymentType === 'DEPOSIT' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-stone-200 text-stone-500'}`}>Thanh toán tiền cọc</button>
                <button onClick={() => setPaymentType('FULL')} className={`rounded-2xl border px-4 py-3 text-xs font-black ${paymentType === 'FULL' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-stone-200 text-stone-500'}`}>Thanh toán 100%</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentProvider('VNPAY')} className={`rounded-2xl border px-4 py-3 text-xs font-black ${paymentProvider === 'VNPAY' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-stone-200 text-stone-500'}`}>VNPAY</button>
                <button onClick={() => setPaymentProvider('MOMO')} className={`rounded-2xl border px-4 py-3 text-xs font-black ${paymentProvider === 'MOMO' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-stone-200 text-stone-500'}`}>MoMo</button>
              </div>

                <button onClick={handleCreateBooking} disabled={submitting || !validationState.isValid} className="mt-6 flex w-full items-center justify-center gap-3 rounded-3xl bg-stone-950 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-amber-600 disabled:opacity-50">
                {submitting ? 'Đang xử lý...' : 'Xác nhận & thanh toán'} <ArrowRight size={18} />
              </button>
                {!validationState.isValid && (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                    Vui lòng kiểm tra lại thông tin người đại diện, người đi cùng và sức chứa từng phòng trước khi đặt phòng.
                  </div>
                )}
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 text-sm font-bold text-stone-600 shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-black text-emerald-700"><CheckCircle2 size={18} /> Dữ liệu đúng mô hình mới</div>
              Khách được lưu theo từng phòng, staff sẽ check-in/check-out từng BookingRoom.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function GuestInput({ label, value, error, onChange, type = 'text' }: { label: string; value: string; error?: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-2">
      <span className="ml-1 text-xs font-black uppercase tracking-widest text-stone-400">{label}</span>
      <input type={type} value={value} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-2xl border bg-stone-50 px-4 py-3 text-sm font-bold outline-none focus:border-amber-500 ${error ? 'border-rose-300' : 'border-stone-200'}`} />
      {error && <div className="text-[11px] font-bold text-rose-600">{error}</div>}
    </label>
  );
}
