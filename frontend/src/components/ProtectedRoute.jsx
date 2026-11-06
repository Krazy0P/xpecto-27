import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

/** Sends logged-out users to /auth and remembers where they came from. */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/auth" replace state={{ from: loc.pathname + loc.search }} />;
}
