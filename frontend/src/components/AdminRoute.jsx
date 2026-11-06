import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/** UI guard only. The backend enforces admin rights (401/403). */
export default function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return <ProtectedRoute>{isAdmin ? children : <Navigate to="/" replace />}</ProtectedRoute>;
}
