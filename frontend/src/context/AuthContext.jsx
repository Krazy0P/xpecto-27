import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Holds the session user. Role comes from GET /api/auth/me (never trusted from the client). */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const login = useCallback(async b => { const u = await api.login(b); setUser(u); return u; }, []);
  const signup = useCallback(async b => { const u = await api.signup(b); setUser(u); return u; }, []);
  const logout = useCallback(async () => { try { await api.logout(); } finally { setUser(null); } }, []);
  const value = useMemo(() => ({ user, loading, isAdmin: user?.role === 'admin', login, signup, logout }), [user, loading, login, signup, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
