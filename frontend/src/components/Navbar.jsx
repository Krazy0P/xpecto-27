import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  ['/', 'About', '概要'], ['/events', 'Events', '競技'], ['/mess', 'MessRegistrations', '食堂'],
  ['/sponsors', 'Sponsors', '協賛'], ['/workshops', 'WorkShops', '講習'], ['/team', 'Team', '隊'],
];
const SignIn = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
);

/** Floating HUD header: logo left, bevelled link plate centre, auth right. Below 1180px the plate becomes a slide-in drawer. */
export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);
  useEffect(() => { const h = e => e.key === 'Escape' && (setOpen(false), setMenu(false)); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const cls = ({ isActive }) => `hud-link ${isActive ? 'active' : ''}`;
  return (
    <header className="hud">
      <Link to="/" className="hud-logo glitch" data-text="XPECTO">XPECTO</Link>
      <nav className={`hud-plate ${open ? 'open' : ''}`} aria-label="Main">
        <ul>
          {LINKS.map(([to, label, jp]) => <li key={to}><NavLink to={to} end={to === '/'} className={cls}>{label}<small lang="ja">{jp}</small></NavLink></li>)}
          {isAdmin && <li><NavLink to="/admin" className={cls}>Admin<small lang="ja">管理</small></NavLink></li>}
        </ul>
      </nav>
      <div className="hud-right">
        {!user ? <NavLink to="/auth" className="hud-btn"><SignIn />SignUp / Login</NavLink> : (
          <div className="profile">
            <button className="hud-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}>{user.name}</button>
            {menu && (
              <div className="profile-menu" role="menu">
                <Link to="/profile" role="menuitem">My Profile</Link>
                <button role="menuitem" onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        )}
        <button className="hud-burger" aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(o => !o)}><span /><span /><span /></button>
      </div>
      {open && <button className="hud-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </header>
  );
}
