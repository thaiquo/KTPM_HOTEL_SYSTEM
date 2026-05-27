import React from 'react';
import {
  HiOutlineClipboardList,
  HiOutlineOfficeBuilding,
  HiOutlineRefresh,
  HiOutlineSwitchHorizontal,
  HiOutlineViewGrid,
} from 'react-icons/hi';
import DashboardLayout from './DashboardLayout';
import StaffChatbot from '../../../features/ai-chatbot/components/StaffChatbot';

const StaffLayout: React.FC = () => {
  const menuItems = [
    {
      title: 'Theo dõi phòng',
      path: '/staff/rooms',
      icon: <HiOutlineOfficeBuilding className="w-6 h-6" />,
    },
    {
      title: 'Vận hành lưu trú',
      path: '/staff/check-in',
      icon: <HiOutlineViewGrid className="w-6 h-6" />,
    },
    {
      title: 'Đổi phòng',
      path: '/staff/room-change',
      icon: <HiOutlineSwitchHorizontal className="w-6 h-6" />,
    },
    {
      title: 'Xử lý hoàn tiền',
      path: '/staff/refunds',
      icon: <HiOutlineRefresh className="w-6 h-6" />,
    },
    {
      title: 'Xử lý hóa đơn',
      path: '/staff/invoices',
      icon: <HiOutlineClipboardList className="w-6 h-6" />,
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
