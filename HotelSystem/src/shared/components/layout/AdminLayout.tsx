import React from 'react';
import { HiOutlineUserGroup, HiOutlineOfficeBuilding, HiOutlineClock } from 'react-icons/hi';
import DashboardLayout from './DashboardLayout';

const AdminLayout: React.FC = () => {
  const menuItems = [
    {
      title: 'Quản lý Nhân viên',
      path: '/admin/nhan-vien',
      icon: <HiOutlineUserGroup className="w-6 h-6" />,
    },
    {
      title: 'Quản lý Ca Trực',
      path: '/admin/ca-truc',
      icon: <HiOutlineClock className="w-6 h-6" />,
    },
    {
      title: 'Quản lý Khách hàng',
      path: '/admin/khach-hang',
      icon: <HiOutlineUserGroup className="w-6 h-6" />,
    },
    {
      title: 'Quản lý Loại phòng',
      path: '/admin/room-types',
      icon: <HiOutlineOfficeBuilding className="w-6 h-6" />,
    },
    {
      title: 'Quản lý Phòng',
      path: '/admin/rooms',
      icon: <HiOutlineOfficeBuilding className="w-6 h-6" />,
    },
  ];

  return (
    <DashboardLayout
      portalLabel="ADMIN PANEL"
      portalSubtitle="Quản trị hệ thống"
      menuItems={menuItems}
      accentColorClass="bg-indigo-600"
      hoverAccentClass="hover:bg-indigo-600"
    />
  );
};

export default AdminLayout;