import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute, { AdminRoute, GuestRoute } from '@/features/auth/components/ProtectedRoute';
import LoadingScreen from '@/components/common/LoadingScreen';
import Index from '@/pages/Index';

// Every page except the landing page is loaded on demand, keeping the first download small.
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));
const Summary = lazy(() => import('@/pages/Summary'));
const Support = lazy(() => import('@/pages/Support'));
const SupportTicket = lazy(() => import('@/pages/SupportTicket'));
const AdminTickets = lazy(() => import('@/pages/AdminTickets'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const CV = lazy(() => import('@/pages/CV'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Summarize = lazy(() => import('@/pages/Summarize'));
const ReadingList = lazy(() => import('@/pages/ReadingList'));
const Cite = lazy(() => import('@/pages/Cite'));
const AssistantWidget = lazy(() => import('@/features/assistant/components/AssistantWidget'));

/** Scrolls to the top on navigation (but keeps #anchor jumps working). */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);
  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        {/* Keyed on the path so each page plays the enter animation. */}
        <div key={location.pathname} className="animate-page-in motion-reduce:animate-none">
          <Routes location={location}>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/u/:slug" element={<PublicProfile />} />
            <Route path="/cite" element={<Cite />} />

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
              <Route path="/cv" element={<CV />} />
              <Route path="/summarize" element={<Summarize />} />
              <Route path="/reading-list" element={<ReadingList />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/:ticketId" element={<SupportTicket />} />

              {/* Support staff only */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/tickets" element={<AdminTickets />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>

      {/* AI assistant: available on every page once signed in */}
      {user && (
        <Suspense fallback={null}>
          <AssistantWidget />
        </Suspense>
      )}
    </>
  );
};

export default AppRoutes;
