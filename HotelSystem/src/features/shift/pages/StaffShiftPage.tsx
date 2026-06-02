import React, { useEffect, useMemo, useState } from 'react';
import {
    HiOutlineCalendar,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineLogin,
    HiOutlineLogout,
    HiOutlineRefresh,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { shiftApi } from '../../../services/api';

interface StaffShiftSchedule {
    id: number;
    employeeId: number;
    employeeName: string;
    shiftId: number | null;
    shiftName: string;
    workDate: string;
    weekStart: string;
    status: 'ASSIGNED' | 'CHECKED_IN' | 'COMPLETED' | 'ABSENT' | 'REPLACED' | string;
}

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toLocalDateTime = (date: Date) =>
    `${toLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const getMonday = (input: Date) => {
    const date = new Date(input);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
};

const statusLabel = (status: string) => {
    switch (status) {
        case 'ASSIGNED':
            return 'Đã phân ca';
        case 'CHECKED_IN':
            return 'Đang trong ca';
        case 'COMPLETED':
            return 'Đã hoàn tất';
        case 'ABSENT':
            return 'Vắng mặt';
        case 'REPLACED':
            return 'Ca thay thế';
        default:
            return status;
    }
};

const statusClass = (status: string) => {
    switch (status) {
        case 'CHECKED_IN':
            return 'bg-emerald-100 text-emerald-700';
        case 'COMPLETED':
            return 'bg-slate-100 text-slate-600';
        case 'ABSENT':
            return 'bg-rose-100 text-rose-700';
        case 'REPLACED':
            return 'bg-sky-100 text-sky-700';
        default:
            return 'bg-amber-100 text-amber-700';
    }
};

const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
    });

const shiftErrorMessage = (error: any, fallback: string) => {
    const message = String(error?.userMessage || error?.response?.data?.message || '');
    const normalized = message.toLowerCase();
    if (normalized.includes('chua duoc phan cong') || normalized.includes('chưa được phân công')) {
        return 'Bạn chưa được phân công ca hiện tại';
    }
    return message || fallback;
};

const StaffShiftPage: React.FC = () => {
    const [weekStart, setWeekStart] = useState(toLocalDate(getMonday(new Date())));
    const [schedules, setSchedules] = useState<StaffShiftSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const today = toLocalDate(new Date());

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const response = await shiftApi.getMySchedule(weekStart);
            setSchedules(response.data || []);
            window.dispatchEvent(new Event('staff-shift-status-changed'));
        } catch (error: any) {
            toast.error(shiftErrorMessage(error, 'Không thể tải lịch ca trực'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [weekStart]);

    const todayShift = useMemo(
        () => schedules.find((schedule) => schedule.workDate === today && schedule.shiftId),
        [schedules, today]
    );

    const upcomingShift = useMemo(
        () => schedules
            .filter((schedule) => schedule.shiftId && schedule.workDate >= today && schedule.status !== 'COMPLETED')
            .sort((a, b) => a.workDate.localeCompare(b.workDate))[0],
        [schedules, today]
    );

    const handleCheckin = async (schedule: StaffShiftSchedule) => {
        try {
            setProcessingId(schedule.id);
            await shiftApi.checkin({
                scheduleId: schedule.id,
                checkinTime: toLocalDateTime(new Date()),
            });
            toast.success('Check-in ca thành công');
            await fetchSchedule();
        } catch (error: any) {
            toast.error(shiftErrorMessage(error, 'Bạn chưa được phân công ca hiện tại'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleCheckout = async (schedule: StaffShiftSchedule) => {
        try {
            setProcessingId(schedule.id);
            await shiftApi.checkout({
                scheduleId: schedule.id,
                checkoutTime: toLocalDateTime(new Date()),
            });
            toast.success('Check-out ca thành công');
            await fetchSchedule();
        } catch (error: any) {
            toast.error(shiftErrorMessage(error, 'Không thể check-out ca'));
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ca trực của tôi</h1>
                    <p className="text-sm text-gray-500 mt-1">Xem lịch tuần, ca hôm nay và thực hiện check-in/check-out ca trực.</p>
                </div>
                <button
                    onClick={fetchSchedule}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                    <HiOutlineRefresh className="h-5 w-5" />
                    Tải lại
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <section className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                            <HiOutlineClock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Hôm nay</p>
                            <h2 className="text-lg font-bold text-gray-900">{formatDate(today)}</h2>
                        </div>
                    </div>

                    {todayShift ? (
                        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
                            <div>
                                <div className="text-2xl font-black text-gray-900">{todayShift.shiftName}</div>
                                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(todayShift.status)}`}>
                                    {statusLabel(todayShift.status)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleCheckin(todayShift)}
                                    disabled={processingId === todayShift.id || todayShift.status !== 'ASSIGNED'}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                >
                                    <HiOutlineLogin className="h-5 w-5" />
                                    Check-in ca
                                </button>
                                <button
                                    onClick={() => handleCheckout(todayShift)}
                                    disabled={processingId === todayShift.id || todayShift.status !== 'CHECKED_IN'}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                                >
                                    <HiOutlineLogout className="h-5 w-5" />
                                    Check-out ca
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm font-semibold text-gray-500">
                            Hôm nay bạn chưa được phân công ca hiện tại
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <HiOutlineCheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Ca sắp tới</p>
                            <h2 className="text-lg font-bold text-gray-900">{upcomingShift?.shiftName || 'Chưa có ca'}</h2>
                        </div>
                    </div>
                    {upcomingShift && (
                        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-600">
                            {formatDate(upcomingShift.workDate)}
                            <div className="mt-2 text-xs text-gray-400">{statusLabel(upcomingShift.status)}</div>
                        </div>
                    )}
                </section>
            </div>

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <HiOutlineCalendar className="h-5 w-5 text-sky-600" />
                        <h2 className="font-bold text-gray-900">Lịch tuần này</h2>
                    </div>
                    <input
                        type="date"
                        value={weekStart}
                        onChange={(event) => setWeekStart(event.target.value)}
                        className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-semibold outline-none focus:border-sky-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400">Ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400">Ca</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-gray-400">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {schedules.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-sm font-semibold text-gray-500">
                                        Chưa có lịch trong tuần này
                                    </td>
                                </tr>
                            ) : schedules.map((schedule) => (
                                <tr key={schedule.id} className={schedule.workDate === today ? 'bg-sky-50/50' : ''}>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatDate(schedule.workDate)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{schedule.shiftId ? schedule.shiftName : 'OFF'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(schedule.status)}`}>
                                            {schedule.shiftId ? statusLabel(schedule.status) : 'Nghỉ'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default StaffShiftPage;
