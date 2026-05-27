import React from 'react';
import { HiOutlineUserGroup, HiOutlineOfficeBuilding } from 'react-icons/hi';
import DashboardLayout from './DashboardLayout';
import StaffChatbot from '../../../features/ai-chatbot/components/StaffChatbot';

const AdminLayout: React.FC = () => {
  const menuItems = [
    {
      title: 'Quản lý Nhân viên',
      path: '/admin/nhan-vien',
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
    <>
    <DashboardLayout
      portalLabel="ADMIN PANEL"
      portalSubtitle="Quản trị hệ thống"
      menuItems={menuItems}
      accentColorClass="bg-indigo-600"
      hoverAccentClass="hover:bg-indigo-600"
    />
    <StaffChatbot variant="admin" />
    </>
  );
};

export default AdminLayout;
