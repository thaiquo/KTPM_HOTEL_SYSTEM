import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import { roomApi, staffBookingApi, type RoomChangeResponse } from '../../../services/api';
import type { Booking, Room } from '../../../types';
import RoomManagementPage from './RoomManagementPage';

type BookingRow = Booking & { currentRooms?: Room[] };

const formatCurrency = (value: number) => `${Math.round(Number(value || 0)).toLocaleString('vi-VN')}đ`;

const StaffRoomChangePage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [fromRoomId, setFromRoomId] = useState('');
  const [toRoomId, setToRoomId] = useState('');
  const [oldRoomNextStatus, setOldRoomNextStatus] = useState<'CLEANING' | 'AVAILABLE'>('CLEANING');
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<RoomChangeResponse | null>(null);
  const [activeView, setActiveView] = useState<'CHANGE' | 'MANAGE'>('CHANGE');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checkedInBookings, allRooms] = await Promise.all([
        staffBookingApi.getCheckInList(),
        roomApi.getAll(),
      ]);
      const enriched = await Promise.all(checkedInBookings.map(async (booking) => {
        const roomIds = (booking.items || []).map((item) => item.roomId).filter(Boolean);
        const currentRooms = await Promise.all(roomIds.map((id) => roomApi.getById(String(id)).catch(() => null)));
        return { ...booking, currentRooms: currentRooms.filter(Boolean) as Room[] };
      }));

      setBookings(enriched);
      setRooms(allRooms);
      if (!bookingId && enriched[0]) {
        setBookingId(enriched[0].id);
        setFromRoomId(enriched[0].items?.[0]?.roomId || '');
      }
      if (!toRoomId) {
        setToRoomId(allRooms.find((room) => room.status === 'AVAILABLE')?.id || '');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu đổi phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === bookingId) || null,
    [bookingId, bookings]
  );

  const availableRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return rooms
      .filter((room) => room.status === 'AVAILABLE')
      .filter((room) => !fromRoomId || room.id !== fromRoomId)
      .filter((room) => {
        if (!keyword) return true;
        return [room.roomNumber, room.roomType?.type, room.floorNumber, room.viewType, room.roomType?.basePrice]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      });
  }, [fromRoomId, rooms, searchTerm]);

  const selectedNewRoom = availableRooms.find((room) => room.id === toRoomId) || null;
  const selectedOldRoom = selectedBooking?.currentRooms?.find((room) => room.id === fromRoomId) || null;

  const handleBookingChange = (value: string) => {
    const booking = bookings.find((item) => item.id === value);
    setBookingId(value);
    setFromRoomId(booking?.items?.[0]?.roomId || '');
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!bookingId || !fromRoomId || !toRoomId) {
      toast.error('Vui lòng chọn booking, phòng cũ và phòng mới');
      return;
    }
    try {
      setProcessing(true);
      const response = await staffBookingApi.changeRoom(bookingId, {
        fromRoomId,
        toRoomId,
        oldRoomNextStatus,
        reason: 'Khách yêu cầu đổi phòng trong thời gian lưu trú',
      });
      setResult(response);
      toast.success('Đổi phòng thành công');
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Đổi phòng thất bại');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đổi phòng</h1>
        <p className="mt-1 text-sm text-gray-500">Chọn booking đang lưu trú, chỉ định phòng AVAILABLE mới và tính chênh lệch theo số đêm còn lại.</p>
      </div>

      <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveView('CHANGE')}
          className={`rounded-xl px-4 py-2 text-sm font-black ${activeView === 'CHANGE' ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Đổi phòng
        </button>
        <button
          type="button"
          onClick={() => setActiveView('MANAGE')}
          className={`rounded-xl px-4 py-2 text-sm font-black ${activeView === 'MANAGE' ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Quản lý phòng
        </button>
      </div>

      {activeView === 'MANAGE' ? (
        <RoomManagementPage />
      ) : (

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Booking đang lưu trú</span>
              <select value={bookingId} onChange={(event) => handleBookingChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
                <option value="">Chọn booking</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>#{booking.id} · {booking.checkIn} - {booking.checkOut}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Phòng hiện tại</span>
              <select value={fromRoomId} onChange={(event) => { setFromRoomId(event.target.value); setResult(null); }} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
                {(selectedBooking?.items || []).map((item) => {
                  const room = selectedBooking?.currentRooms?.find((current) => current.id === item.roomId);
                  return <option key={item.roomId} value={item.roomId}>Phòng {room?.roomNumber || item.roomId} · {formatCurrency(item.priceSnapshot)}</option>;
                })}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Trạng thái phòng cũ sau đổi</span>
              <select value={oldRoomNextStatus} onChange={(event) => setOldRoomNextStatus(event.target.value as 'CLEANING' | 'AVAILABLE')} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold">
                <option value="CLEANING">CLEANING</option>
                <option value="AVAILABLE">AVAILABLE</option>
              </select>
            </label>

            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
              <div className="font-black text-gray-900">Tóm tắt</div>
              <div className="mt-2 space-y-1 text-gray-600">
                <div>Phòng cũ: <span className="font-bold text-gray-900">{selectedOldRoom?.roomNumber || fromRoomId || '-'}</span></div>
                <div>Phòng mới: <span className="font-bold text-gray-900">{selectedNewRoom?.roomNumber || toRoomId || '-'}</span></div>
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={processing || loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 hover:bg-sky-700 disabled:opacity-60">
              <HiOutlineSwitchHorizontal className="h-5 w-5" />
              {processing ? 'Đang xử lý...' : 'Xác nhận đổi phòng'}
            </button>

            {result && (
              <div className={`rounded-2xl border p-4 text-sm ${result.paymentAction === 'COLLECT' ? 'border-rose-200 bg-rose-50 text-rose-800' : result.paymentAction === 'REFUND' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                <div className="font-black">Kết quả đổi phòng</div>
                <div className="mt-2">Còn lại: <b>{result.remainingNights}</b> đêm</div>
                <div>Chênh lệch/đêm: <b>{formatCurrency(result.priceDifferencePerNight)}</b></div>
                <div>Tổng chênh lệch: <b>{formatCurrency(Math.abs(result.totalDifference))}</b></div>
                <div>Hành động: <b>{result.paymentAction === 'COLLECT' ? 'Thu thêm' : result.paymentAction === 'REFUND' ? 'Hoàn tiền' : 'Không phát sinh'}</b></div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="relative max-w-md">
              <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm phòng, loại phòng, tầng, view..." className="w-full rounded-2xl border border-gray-200 py-3 pl-11 pr-4 text-sm font-medium" />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-gray-500">Đang tải dữ liệu...</div>
          ) : availableRooms.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-gray-500">Không có phòng AVAILABLE phù hợp.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              {availableRooms.map((room) => (
                <button key={room.id} type="button" onClick={() => { setToRoomId(room.id); setResult(null); }} className={`rounded-2xl border p-4 text-left transition-all ${toRoomId === room.id ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-gray-100 bg-white hover:border-sky-200 hover:bg-sky-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-gray-900">Phòng {room.roomNumber}</div>
                      <div className="mt-1 text-xs font-bold text-gray-500">{room.roomType?.type || 'Room'} · Tầng {room.floorNumber}</div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">AVAILABLE</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-gray-50 p-2"><div className="font-bold text-gray-400">Giá/đêm</div><div className="font-black text-gray-900">{formatCurrency(room.roomType?.basePrice || 0)}</div></div>
                    <div className="rounded-xl bg-gray-50 p-2"><div className="font-bold text-gray-400">Sức chứa</div><div className="font-black text-gray-900">{room.maxCapacity} khách</div></div>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-gray-500">{room.viewType || 'City View'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default StaffRoomChangePage;
