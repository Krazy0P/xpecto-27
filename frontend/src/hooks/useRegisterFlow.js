import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

/** Register click: logged out -> /auth (remembering returnTo); logged in -> open the payment modal for `target`. */
export default function useRegisterFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);
  const start = useCallback((t, returnTo) => user ? setTarget(t) : navigate('/auth', { state: { from: returnTo } }), [user, navigate]);
  const close = useCallback(() => setTarget(null), []);
  return { target, start, close };
}
