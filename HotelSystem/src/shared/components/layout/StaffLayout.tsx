import React from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineOfficeBuilding,
  HiOutlineRefresh,
  HiOutlineSwitchHorizontal,
  HiOutlineViewGrid,
} from 'react-icons/hi';
import DashboardLayout from './DashboardLayout';
import StaffChatbot from '../../../features/ai-chatbot/components/StaffChatbot';
import { useAuth } from '../../../contexts/AuthContext';
import { shiftApi } from '../../../services/api';

type ShiftSchedule = {
  shiftId: number | null;
  workDate: string;
  status: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getMonday = (input: Date) => {
  const date = new Date(input);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

const StaffLayout: React.FC = () => {
  const { user } = useAuth();
  const [todaySchedule, setTodaySchedule] = React.useState<ShiftSchedule | null>(null);
  const [shiftLoading, setShiftLoading] = React.useState(true);

  const loadShiftStatus = React.useCallback(async () => {
    if (user?.role === 'ADMIN') {
      setTodaySchedule({ shiftId: 1, workDate: toLocalDate(new Date()), status: 'CHECKED_IN' });
      setShiftLoading(false);
      return;
    }

    try {
      setShiftLoading(true);
      const today = toLocalDate(new Date());
      const weekStart = toLocalDate(getMonday(new Date()));
      const response = await shiftApi.getMySchedule(weekStart);
      const schedules: ShiftSchedule[] = response.data || [];
      setTodaySchedule(schedules.find((schedule) => schedule.workDate === today && schedule.shiftId) || null);
    } catch {
      setTodaySchedule(null);
    } finally {
      setShiftLoading(false);
    }
  }, [user?.role]);

  React.useEffect(() => {
    loadShiftStatus();

    const handleShiftStatusChanged = () => {
      loadShiftStatus();
    };

    window.addEventListener('staff-shift-status-changed', handleShiftStatusChanged);
    return () => window.removeEventListener('staff-shift-status-changed', handleShiftStatusChanged);
  }, [loadShiftStatus]);

  const staffLocked = user?.role !== 'ADMIN' && (shiftLoading || todaySchedule?.status !== 'CHECKED_IN');
  const disabledReason = shiftLoading
    ? 'Đang kiểm tra trạng thái ca trực'
    : !todaySchedule
      ? 'Hôm nay bạn không có ca trực'
      : todaySchedule.status === 'COMPLETED'
        ? 'Ca hôm nay đã check-out'
        : 'Bạn cần check-in ca trước';

  const menuItems = [
    {
      title: 'Ca trực của tôi',
      path: '/staff/ca-truc',
      icon: <HiOutlineCalendar className="w-6 h-6" />,
    },
    {
      title: 'Theo dõi phòng',
      path: '/staff/rooms',
      icon: <HiOutlineOfficeBuilding className="w-6 h-6" />,
      disabled: staffLocked,
      disabledReason,
    },
    {
      title: 'Vận hành lưu trú',
      path: '/staff/check-in',
      icon: <HiOutlineViewGrid className="w-6 h-6" />,
      disabled: staffLocked,
      disabledReason,
    },
    {
      title: 'Đổi phòng',
      path: '/staff/room-change',
      icon: <HiOutlineSwitchHorizontal className="w-6 h-6" />,
      disabled: staffLocked,
      disabledReason,
    },
    {
      title: 'Xử lý hoàn tiền',
      path: '/staff/refunds',
      icon: <HiOutlineRefresh className="w-6 h-6" />,
      disabled: staffLocked,
      disabledReason,
    },
    {
      title: 'Xử lý hóa đơn',
      path: '/staff/invoices',
      icon: <HiOutlineClipboardList className="w-6 h-6" />,
      disabled: staffLocked,
      disabledReason,
    },
  ];

  return (
    <>
    <DashboardLayout
      portalLabel="STAFF PANEL"
      portalSubtitle="Vận hành khách sạn"
      menuItems={menuItems}
      accentColorClass="bg-sky-600"
      hoverAccentClass="hover:bg-sky-600"
    />
    <StaffChatbot variant="staff" />
    </>
  );
};

export default StaffLayout;
