import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useAuth } from '../hooks/useAuth';

/** Renders child routes only for signed-in users; otherwise redirects to /login. */
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
};

/** For /login and /signup: signed-in users go straight to the dashboard. */
export const GuestRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
