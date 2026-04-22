// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './shared/components/layout/MainLayout';
import HomePage from './features/room/pages/HomePage';
import RoomsPage from './features/room/pages/RoomsPage';
import RoomDetailPage from './features/room/pages/RoomDetailPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import BookingInfoPage from './features/booking/pages/BookingInfoPage';
import MyBookingsPage from './features/booking/pages/MyBookingsPage';
// import các page khác khi cần...

import ProtectedRoute from './shared/components/auth/ProtectedRoute';
import DashboardLayout from './shared/components/layout/DashboardLayout';
import RoomManagementPage from './features/dashboard/pages/RoomManagementPage';
import InvoiceManagementPage from './features/dashboard/pages/InvoiceManagementPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Customer Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/booking" element={<BookingInfoPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
            </Route>
          </Route>

          {/* Admin & Staff Dashboard Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/rooms" element={<RoomManagementPage />} />
              <Route path="/admin/invoices" element={<InvoiceManagementPage />} />
              {/* Thêm redirect mặc định cho /admin */}
              <Route path="/admin" element={<Navigate to="/admin/rooms" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;