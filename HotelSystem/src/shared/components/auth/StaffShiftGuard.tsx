import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from '../ui/Spinner';
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

const StaffShiftGuard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => toLocalDate(new Date()), []);
  const weekStart = useMemo(() => toLocalDate(getMonday(new Date())), []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setLoading(false);
      return;
    }

    const loadSchedule = async () => {
      try {
        setLoading(true);
        const response = await shiftApi.getMySchedule(weekStart);
        setSchedules(response.data || []);
      } catch {
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [user?.role, weekStart]);

  if (user?.role === 'ADMIN') {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-10 w-10 text-sky-600" />
      </div>
    );
  }

  const checkedInToday = schedules.some(
    (schedule) => schedule.workDate === today && schedule.shiftId && schedule.status === 'CHECKED_IN'
  );

  if (!checkedInToday) {
    return <Navigate to="/staff/ca-truc" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default StaffShiftGuard;
