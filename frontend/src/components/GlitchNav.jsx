import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import GlitchText from './GlitchText';
import { useAuth } from '../context/AuthContext';

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEF';
const SCRAMBLE_DURATION = 300;

const NAV_LINKS = [
  { path: '/', label: 'About' },
  { path: '/events', label: 'Events' },
  { path: '/workshops', label: 'Workshops' },
  { path: '/accommodation', label: 'Accommodation' },
  { path: '/sponsors', label: 'Sponsors' },
  { path: '/team', label: 'Team' },
  { path: '/campus-ambassador', label: 'Campus Ambassador' },
];

/**
 * Individual nav link with inline character scramble effect on hover.
 */
function GlitchNavLink({ to, label, onClick, end = false }) {
  const [displayText, setDisplayText] = useState(label);
  const intervalRef = useRef(null);

  const clearScramble = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleMouseEnter = () => {
    clearScramble();
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= SCRAMBLE_DURATION) {
        clearScramble();
        setDisplayText(label);
      } else {
        const progress = elapsed / SCRAMBLE_DURATION;
        const scrambled = label
          .split('')
          .map((ch, index) => {
            if (ch === ' ') return ' ';
            // Progressively reveal resolved characters from left to right
            if (index / label.length < progress) {
              return label[index];
            }
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join('');
        setDisplayText(scrambled);
      }
    }, 35);
  };

  const handleMouseLeave = () => {
    clearScramble();
    setDisplayText(label);
  };

  useEffect(() => {
    return () => clearScramble();
  }, [clearScramble]);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={({ isActive }) => `st-nav-link ${isActive ? 'active' : ''}`}
    >
      {displayText}
    </NavLink>
  );
}

/**
 * GlitchNav — Broken Space-Time theme glassmorphism navbar.
 * Features:
 * - GlitchText logo ('XPECTO\'27') linking to '/'
 * - Desktop links with inline 300ms character scramble hover effect
 * - Cyan underline glow on active route
 * - Mobile slide-in drawer with hamburger toggle
 */
export default function GlitchNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  // Top-right slot: "Login" when signed out, "My Profile" when signed in. Logout lives at the bottom of the profile page.
  const links = [...NAV_LINKS, ...(isAdmin ? [{ path: '/admin', label: 'Admin' }] : []), user ? { path: '/profile', label: 'My Profile' } : { path: '/auth', label: 'Login' }];

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      <header className="st-nav">
        {/* Left: Brand Logo */}
        <Link to="/" className="st-nav-logo" onClick={closeMobile} aria-label="XPECTO'27 Home">
          <GlitchText text="XPECTO'27" tag="span">
            XPECTO'27
          </GlitchText>
        </Link>

        {/* Right: Desktop Navigation Links */}
        <ul className="st-nav-links">
          {links.map(({ path, label }) => (
            <li key={path}>
              <GlitchNavLink to={path} label={label} end={path === '/'} />
            </li>
          ))}
        </ul>

        {/* Mobile: Hamburger toggle */}
        <button
          type="button"
          className={`st-hamburger ${mobileOpen ? 'open' : ''}`}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="st-mobile-nav"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Mobile Drawer */}
      <nav
        id="st-mobile-nav"
        className={`st-mobile-menu ${mobileOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation"
      >
        {links.map(({ path, label }) => (
          <GlitchNavLink
            key={`mobile-${path}`}
            to={path}
            label={label}
            end={path === '/'}
            onClick={closeMobile}
          />
        ))}
      </nav>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={closeMobile}
          style={{
            position: 'fixed',
            inset: 0,
            top: '60px',
            background: 'rgba(5, 5, 16, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 98,
          }}
        />
      )}
    </>
  );
}
