import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Countdown from '../components/Countdown';
import CountUp from '../components/CountUp';
import GlitchText from '../components/GlitchText';
import ErrorState from '../components/ErrorState';
import { fmtDate, fmtMoney } from '../utils';

// Simple outline icons for the highlight list (picked from the event name / category)
const PATHS = {
  robot: 'M7 7h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM12 7V4M9 12.5h.01M15 12.5h.01M9 16h6M2 12v3M22 12v3',
  flag: 'M5 22V3M5 4h14l-3 4.5L19 13H5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};
const Icon = ({ name }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>;
const iconFor = e => { const t = `${e.name} ${e.category}`.toLowerCase(); return /race|speed/.test(t) ? 'flag' : /robo/.test(t) ? 'robot' : /code|soft|hack|program|\bai\b/.test(t) ? 'code' : 'star'; };

export default function About() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null); setData(null);
    Promise.all([api.getFest(), api.getEvents(), api.getWorkshops(), api.getSponsors()])
      .then(([fest, events, workshops, sponsors]) => setData({ fest, events, workshops, sponsors }))
      .catch(e => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <section className="page"><ErrorState message={error} onRetry={load} /></section>;
  if (!data) return (
    <section className="page" aria-busy="true">
      <div className="skeleton" style={{ height: 220 }} /><div className="skeleton" style={{ height: 90, marginTop: 16 }} /><div className="skeleton" style={{ height: 160, marginTop: 16 }} />
    </section>
  );

  const { fest, events, workshops, sponsors } = data;
  const days = Math.max(1, Math.round((new Date(fest.endDate) - new Date(fest.startDate)) / 864e5));
  const ticker = [...events.map(e => e.name), ...workshops.map(w => w.title)];
  const stats = [{ n: events.length, l: 'Events' }, { n: workshops.length, l: 'Workshops' }, { n: events.reduce((s, e) => s + (e.prizePool || 0), 0), l: 'In prizes', prefix: '₹' }, { n: days, l: 'Days' }];

  return (
    <section className="page about">
      {/* Hero sits directly on the cinematic background (no box) */}
      <header className="hero-cin">
        {isAdmin && <Link to="/admin?tab=fest" className="edit-pencil" aria-label="Edit fest info">✎</Link>}
        {fest.heroImageUrl && <img src={fest.heroImageUrl} alt={`${fest.name} hero`} className="hero-img" loading="lazy" decoding="async" />}
        <GlitchText as="h1" className="hero-title">{fest.name}</GlitchText>
        <p className="hero-tag">{fest.tagline}</p>
        <p className="hero-meta">{fmtDate(fest.startDate)} – {fmtDate(fest.endDate)} · {fest.venue}</p>
        <Countdown to={fest.startDate} />
        <Link to="/events" className="btn-slash">Browse events</Link>
        <a href="#fest-stats" className="scroll-cue" aria-label="Scroll down"><span>Scroll</span><i /></a>
      </header>

      {ticker.length > 0 && (
        <div className="ticker" aria-hidden="true"><div className="ticker-track">{[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => <span key={i}>{t}</span>)}</div></div>
      )}

      <h2 className="sec-title">Highlights</h2>
      {events.length === 0 ? <p>No events announced yet. Check back soon.</p> : (
        <div className="hl-list">
          {events.slice(0, 3).map(e => (
            <Link key={e.id} to={`/events/${e.id}`} className="hl-item tilt-card">
              <span className="hl-icon"><Icon name={iconFor(e)} /></span>
              <span className="hl-head"><h3>{e.name}</h3><span className="hl-cat">{e.category}</span></span>
              <span className="hl-prize"><Icon name="trophy" /><em>Prize pool</em><b>{fmtMoney(e.prizePool)}</b></span>
            </Link>
          ))}
        </div>
      )}

      <div className="stats" id="fest-stats">
        {stats.map(s => <div key={s.l} className="stat"><b><CountUp to={s.n} prefix={s.prefix} /></b><span>{s.l}</span></div>)}
      </div>

      <section className="about-split">
        <h2 className="about-h">About</h2>
        {/* Admin-authored HTML, always sanitized */}
        <div className="about-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fest.aboutHtml || '') }} />
      </section>

      {sponsors.length > 0 && (
        <>
          <h2 className="sec-title">Sponsors</h2>
          <div className="sponsor-strip">
            {sponsors.map(s => (
              <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="sponsor-chip">
                {s.logoUrl ? <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" /> : s.name}
              </a>
            ))}
          </div>
        </>
      )}

      <div className="contact-line">
        <h2>Contact</h2>
        <p><a href={`mailto:${fest.contactEmail}`}>{fest.contactEmail}</a> · {fest.contactPhone}</p>
      </div>
    </section>
  );
}
