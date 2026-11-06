import { NavLink } from 'react-router';

// Stroke icons (24x24). Same routes as the navbar; shown only on wide screens, like a game HUD dock.
const ITEMS = [
  ['/', 'Home', 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10'],
  ['/events', 'Events', 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2zM3 10h18M8 2v4M16 2v4'],
  ['/workshops', 'Workshops', 'M3 4h18v12H3zM8 21h8M12 16v5'],
  ['/mess', 'Mess', 'M6 2v7a3 3 0 0 0 6 0V2M9 2v20M18 2c-2 2-3 5-3 8h3v12'],
  ['/team', 'Team', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'],
];

export default function SideDock() {
  return (
    <aside className="dock" aria-label="Quick navigation">
      {ITEMS.map(([to, label, d]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
