// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './shared/components/layout/MainLayout';
import AdminLayout from './shared/components/layout/AdminLayout';
import StaffLayout from './shared/components/layout/StaffLayout';
import HomePage from './features/room/pages/HomePage';
import RoomsPage from './features/room/pages/RoomsPage';
import RoomDetailPage from './features/room/pages/RoomDetailPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import BookingInfoPage from './features/booking/pages/BookingInfoPage';
import MyBookingsPage from './features/booking/pages/MyBookingsPage';
import BookingCartPage from './features/booking/pages/BookingCartPage';
// import các page khác khi cần...

import ProtectedRoute from './shared/components/auth/ProtectedRoute';
import RoomManagementPage from './features/dashboard/pages/RoomManagementPage';
import InvoiceManagementPage from './features/dashboard/pages/InvoiceManagementPage';
import EmployeeManagementPage from './features/dashboard/pages/EmployeeManagementPage';
import RoomTypeManagementPage from './features/dashboard/pages/RoomTypeManagementPage';

import { CartProvider } from './contexts/CartContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
          {/* Public & Customer Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            <Route path="/booking/cart" element={<BookingCartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/booking" element={<BookingInfoPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
            </Route>
          </Route>

          {/* Admin Dashboard Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/nhan-vien" element={<EmployeeManagementPage />} />
              <Route path="/admin/room-types" element={<RoomTypeManagementPage />} />
              <Route path="/admin/rooms" element={<RoomManagementPage />} />
              <Route path="/admin/invoices" element={<Navigate to="/admin/nhan-vien" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/nhan-vien" replace />} />
            </Route>
          </Route>

          {/* Staff Dashboard Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/rooms" element={<RoomManagementPage />} />
              <Route path="/staff/invoices" element={<InvoiceManagementPage />} />
              <Route path="/staff" element={<Navigate to="/staff/rooms" replace />} />
            </Route>
          </Route>
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;