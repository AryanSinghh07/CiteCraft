import { Route, Routes } from 'react-router-dom';
import ProtectedRoute, { AdminRoute, GuestRoute } from '@/features/auth/components/ProtectedRoute';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Summary from '@/pages/Summary';
import Support from '@/pages/Support';
import SupportTicket from '@/pages/SupportTicket';
import AdminTickets from '@/pages/AdminTickets';
import NotFound from '@/pages/NotFound';

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Index />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Only when signed out */}
    <Route element={<GuestRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Route>

    {/* Only when signed in */}
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/support" element={<Support />} />
      <Route path="/support/:ticketId" element={<SupportTicket />} />

      {/* Support staff only */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/tickets" element={<AdminTickets />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
