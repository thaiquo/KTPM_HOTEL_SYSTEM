import React from 'react';
import { HiOutlineOfficeBuilding, HiOutlineClipboardList } from 'react-icons/hi';
import DashboardLayout from './DashboardLayout';

const StaffLayout: React.FC = () => {
  const menuItems = [
    {
      title: 'Theo dõi Phòng',
      path: '/staff/rooms',
      icon: <HiOutlineOfficeBuilding className="w-6 h-6" />,
    },
    {
      title: 'Xử lý Hóa đơn',
      path: '/staff/invoices',
      icon: <HiOutlineClipboardList className="w-6 h-6" />,
    },
  ];

  return (
    <DashboardLayout
      portalLabel="STAFF PANEL"
      portalSubtitle="Vận hành khách sạn"
      menuItems={menuItems}
      accentColorClass="bg-sky-600"
      hoverAccentClass="hover:bg-sky-600"
    />
  );
};

export default StaffLayout;