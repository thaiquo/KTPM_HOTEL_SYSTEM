import React, { useState, useEffect } from 'react';
import {
    HiOutlineCalendar, HiOutlineClipboardCopy,
    HiOutlineSave, HiOutlineSparkles, HiOutlineEye, HiOutlineDownload,
    HiOutlineFilter, HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineXCircle,
    HiOutlineClock
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { shiftApi, employeeApi, type EmployeeBackend } from '../../../services/api';

interface Employee extends EmployeeBackend { }

interface Shift {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
}

interface ScheduleItem {
    employeeId: number;
    shiftId: number | null;
    workDate: string;
    note?: string;
}

interface ShiftScheduleResponse {
    id: number;
    employeeId: number;
    employeeName: string;
    shiftId: number | null;
    shiftName: string;
    workDate: string;
}

const ShiftSchedulePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'schedule' | 'dashboard' | 'history'>('schedule');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [weekStart, setWeekStart] = useState<string>(getMonday(new Date()).toISOString().split('T')[0]);
    const [schedules, setSchedules] = useState<Record<number, Record<string, number | null>>>({});
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [checkinHistory, setCheckinHistory] = useState<any[]>([]);

    // Hàm lấy thứ 2 của tuần
    function getMonday(date: Date): Date {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    // Lấy danh sách nhân viên và ca trực
    useEffect(() => {
        fetchEmployeesAndShifts();
    }, []);

    // Lấy lịch khi weekStart thay đổi
    useEffect(() => {
        if (activeTab === 'schedule') {
            fetchSchedules();
        }
    }, [weekStart, activeTab]);

    // Lấy dashboard khi tab thay đổi
    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchDashboard();
        }
    }, [activeTab]);

    // Lấy lịch sử check-in khi tab thay đổi
    useEffect(() => {
        if (activeTab === 'history') {
            fetchCheckinHistory();
        }
    }, [activeTab]);

    const fetchEmployeesAndShifts = async () => {
        try {
            setLoading(true);
            const [empRes, shiftsRes] = await Promise.all([
                employeeApi.getAll(),
                shiftApi.getAll(),
            ]);

            const empData = empRes.data || [];
            const shiftsData = shiftsRes.data || [];

            setEmployees(empData);
            setShifts(shiftsData);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu nhân viên và ca');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const response = await shiftApi.getScheduleByWeek(weekStart);
            const data: ShiftScheduleResponse[] = response.data || [];
            const scheduleMap: Record<number, Record<string, number | null>> = {};

            employees.forEach(emp => {
                scheduleMap[emp.id] = {};
                for (let i = 0; i < 7; i++) {
                    const date = new Date(weekStart);
                    date.setDate(date.getDate() + i);
                    const dateStr = date.toISOString().split('T')[0];
                    scheduleMap[emp.id][dateStr] = null;
                }
            });

            data.forEach(schedule => {
                // Tạo object cho employeeId nếu chưa tồn tại
                if (!scheduleMap[schedule.employeeId]) {
                    scheduleMap[schedule.employeeId] = {};
                }
                scheduleMap[schedule.employeeId][schedule.workDate] = schedule.shiftId;
            });

            setSchedules(scheduleMap);
        } catch (error) {
            toast.error('Lỗi khi tải lịch');
            console.error(error);
        }
    };

    const fetchDashboard = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await shiftApi.getDashboard(today);
            setDashboardData(response.data);
        } catch (error) {
            toast.error('Lỗi khi tải dashboard');
            console.error(error);
        }
    };

    const fetchCheckinHistory = async () => {
        try {
            const response = await shiftApi.getCheckinHistory?.();
            setCheckinHistory(response?.data || []);
        } catch (error) {
            toast.error('Lỗi khi tải lịch sử check-in');
            console.error(error);
        }
    };

    const saveSchedule = async () => {
        try {
            setLoading(true);
            const scheduleItems: ScheduleItem[] = [];

            for (const empId in schedules) {
                for (const date in schedules[empId]) {
                    scheduleItems.push({
                        employeeId: parseInt(empId),
                        workDate: date,
                        shiftId: schedules[empId][date],
                    });
                }
            }

            await shiftApi.saveSchedule({
                weekStart,
                schedules: scheduleItems,
            });

            toast.success('Lưu lịch thành công');
        } catch (error) {
            toast.error('Lỗi khi lưu lịch');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyPreviousWeek = async () => {
        try {
            setLoading(true);
            const prevWeek = new Date(weekStart);
            prevWeek.setDate(prevWeek.getDate() - 7);
            const prevWeekStart = prevWeek.toISOString().split('T')[0];

            await shiftApi.copyWeek({
                fromWeekStart: prevWeekStart,
                toWeekStart: weekStart,
            });

            toast.success('Copy lịch tuần trước thành công');
            fetchSchedules();
        } catch (error) {
            toast.error('Lỗi khi copy lịch');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getDatesForWeek = () => {
        const dates = [];
        const startDate = new Date(weekStart);
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    if (loading && employees.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Ca Trực</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý lịch làm việc, check-in/out và thống kê nhân viên.</p>
                </div>
            </div>

            {/* Tab Navigation - Clean Style */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 px-6 py-4 font-semibold text-center transition-all flex items-center justify-center gap-2 ${activeTab === 'schedule'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <HiOutlineCalendar className="w-5 h-5" />
                        <span>Phân lịch tuần</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 px-6 py-4 font-semibold text-center transition-all flex items-center justify-center gap-2 ${activeTab === 'dashboard'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <HiOutlineSparkles className="w-5 h-5" />
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-6 py-4 font-semibold text-center transition-all flex items-center justify-center gap-2 ${activeTab === 'history'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <HiOutlineEye className="w-5 h-5" />
                        <span>Lịch sử check-in</span>
                    </button>
                </div>
            </div>

            {/* Tab 1: Phân lịch tuần */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    {/* Controls */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="relative flex-1 max-w-xs">
                                <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={weekStart}
                                    onChange={(e) => setWeekStart(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <button
                                onClick={saveSchedule}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 font-semibold text-sm"
                            >
                                <HiOutlineSave className="w-5 h-5" />
                                {loading ? 'Đang lưu...' : 'Lưu lịch'}
                            </button>

                            <button
                                onClick={copyPreviousWeek}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
                            >
                                <HiOutlineClipboardCopy className="w-5 h-5" />
                                Copy tuần trước
                            </button>
                        </div>
                    </div>

                    {/* Bảng lịch */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-50">
                                    <tr>
                                        <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Nhân viên</th>
                                        {getDatesForWeek().map((date, idx) => (
                                            <th key={idx} className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">
                                                <div className="text-sm">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                                                <div className="text-xs">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-gray-50/30 transition-all">
                                            <td className="px-8 py-5 font-semibold text-gray-900">{emp.name}</td>
                                            {getDatesForWeek().map((date, idx) => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const shiftId = schedules[emp.id]?.[dateStr];
                                                return (
                                                    <td key={idx} className="px-6 py-5 text-center">
                                                        <select
                                                            value={shiftId || ''}
                                                            onChange={(e) => {
                                                                setSchedules(prev => ({
                                                                    ...prev,
                                                                    [emp.id]: {
                                                                        ...prev[emp.id],
                                                                        [dateStr]: e.target.value ? parseInt(e.target.value) : null,
                                                                    },
                                                                }));
                                                            }}
                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                                        >
                                                            <option value="">OFF</option>
                                                            {shifts.map(shift => (
                                                                <option key={shift.id} value={shift.id}>
                                                                    {shift.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Dashboard */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {dashboardData && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <HiOutlineClock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đang trực</p>
                                        <p className="text-2xl font-bold text-gray-900">{dashboardData.onShift}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <HiOutlineFilter className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chưa check-in</p>
                                        <p className="text-2xl font-bold text-gray-900">{dashboardData.notCheckedIn}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <HiOutlineXCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vắng mặt</p>
                                        <p className="text-2xl font-bold text-gray-900">{dashboardData.absent}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-gray-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <HiOutlineCheckCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ca trống</p>
                                        <p className="text-2xl font-bold text-gray-900">{dashboardData.emptyShift}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Detail Tables */}
                            {dashboardData.shifts && dashboardData.shifts.map((shift: any) => (
                                <div key={shift.shiftId} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-100">
                                        <h3 className="font-bold text-lg text-gray-900">
                                            {shift.shiftName} ({shift.startTime} - {shift.endTime})
                                        </h3>
                                    </div>

                                    {shift.employees.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50/50 border-b border-gray-50">
                                                    <tr>
                                                        <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Tên</th>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Trạng thái</th>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Giờ check-in</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {shift.employees.map((emp: any) => (
                                                        <tr key={emp.employeeId} className="hover:bg-gray-50/30 transition-all">
                                                            <td className="px-8 py-5 font-semibold text-gray-900">{emp.employeeName}</td>
                                                            <td className="px-6 py-5">
                                                                <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${emp.status === 'CHECKED_IN'
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : emp.status === 'ASSIGNED'
                                                                        ? 'bg-amber-100 text-amber-600'
                                                                        : 'bg-red-100 text-red-600'
                                                                    }`}>
                                                                    {emp.status === 'CHECKED_IN' ? 'Đã check-in' :
                                                                        emp.status === 'ASSIGNED' ? 'Chưa check-in' : 'Vắng'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 text-sm text-gray-700 font-mono">{emp.checkinTime || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="px-8 py-10 text-center text-sm text-gray-500">
                                            Không có nhân viên trong ca này
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Tab 3: Lịch sử check-in */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Filter Controls */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-4">
                        <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 font-semibold text-sm">
                            <HiOutlineFilter className="w-5 h-5" />
                            Lọc
                        </button>
                        <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 font-semibold text-sm">
                            <HiOutlineDownload className="w-5 h-5" />
                            Xuất Excel
                        </button>
                        <button
                            onClick={fetchCheckinHistory}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-all font-semibold text-sm"
                        >
                            <HiOutlineRefresh className="w-5 h-5" />
                            Tải lại
                        </button>
                    </div>

                    {/* Checkin History Table */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {checkinHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 border-b border-gray-50">
                                        <tr>
                                            <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Tên nhân viên</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Ca</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Ngày</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Giờ vào</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Giờ ra</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">Trạng thái</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Tổng giờ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {checkinHistory.map((record: any) => (
                                            <tr key={record.id} className="hover:bg-gray-50/30 transition-all">
                                                <td className="px-8 py-5 font-semibold text-gray-900">{record.employeeName}</td>
                                                <td className="px-6 py-5 text-sm text-gray-700">{record.shiftName}</td>
                                                <td className="px-6 py-5 text-sm text-gray-700 font-mono">{record.workDate}</td>
                                                <td className="px-6 py-5 text-sm text-gray-700 font-mono">{record.checkinTime || '-'}</td>
                                                <td className="px-6 py-5 text-sm text-gray-700 font-mono">{record.checkoutTime || '-'}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${record.checkinStatus === 'ON_TIME'
                                                        ? 'bg-green-100 text-green-600'
                                                        : record.checkinStatus === 'LATE'
                                                            ? 'bg-amber-100 text-amber-600'
                                                            : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {record.checkinStatus === 'ON_TIME' ? 'Đúng giờ' :
                                                            record.checkinStatus === 'LATE' ? 'Trễ' : 'Không hợp lệ'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-semibold text-gray-900">
                                                    {record.totalMinutes ? `${Math.floor(record.totalMinutes / 60)}h ${record.totalMinutes % 60}m` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-8 py-12 text-center">
                                <p className="text-sm text-gray-500">Không có dữ liệu check-in</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftSchedulePage;
