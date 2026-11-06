import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';

export const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
export const setPath = (o, p, v) => { const c = structuredClone(o); const ks = p.split('.'); let t = c; ks.slice(0, -1).forEach(k => { t = t[k] ??= {}; }); t[ks.at(-1)] = v; return c; };
// ISO (IST offset) <-> <input type="datetime-local">
export const toLocalInput = iso => { const t = iso ? new Date(iso).getTime() : NaN; return Number.isNaN(t) ? '' : new Date(t + 19800000).toISOString().slice(0, 16); };
export const fromLocalInput = v => v ? `${v}:00+05:30` : '';
export const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Graceful 401/403 handling. The backend is the real gatekeeper. */
export function useAdminError() {
  const nav = useNavigate();
  return useCallback(e => {
    if (e.code === 'UNAUTHENTICATED') { toast.error('Session expired. Please log in again.'); nav('/auth', { state: { from: '/admin' } }); }
    else if (e.code === 'FORBIDDEN') { toast.error('You do not have admin access.'); nav('/'); }
    else toast.error(e.message || 'Request failed');
  }, [nav]);
}
