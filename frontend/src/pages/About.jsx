import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import DOMPurify from 'dompurify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Countdown from '../components/Countdown';
import CountUp from '../components/CountUp';
import GlitchText from '../components/GlitchText';
import ErrorState from '../components/ErrorState';
import { fmtMoney, groupSponsors, istDayCount } from '../utils';

// Simple outline icons for the highlight list
const PATHS = {
  robot: 'M7 7h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM12 7V4M9 12.5h.01M15 12.5h.01M9 16h6M2 12v3M22 12v3',
  flag: 'M5 22V3M5 4h14l-3 4.5L19 13H5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);
const iconFor = e => {
  const t = `${e.name} ${e.category}`.toLowerCase();
  return /race|speed/.test(t) ? 'flag' : /robo/.test(t) ? 'robot' : /code|soft|hack|program|\bai\b/.test(t) ? 'code' : 'star';
};

export default function About() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const flowRef = useRef(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    Promise.all([api.getFest(), api.getEvents(), api.getWorkshops(), api.getSponsors()])
      .then(([fest, events, workshops, sponsors]) => setData({ fest, events, workshops, sponsors }))
      .catch(e => setError(e.message));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!flowRef.current || !data) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });

    const cards = flowRef.current.querySelectorAll('.st-sponsor-flow-card');
    cards.forEach((c, idx) => {
      c.style.transitionDelay = `${(idx % 6) * 0.07}s`;
      obs.observe(c);
    });

    return () => obs.disconnect();
  }, [data]);

  if (error) {
    return (
      <section className="page st-page-enter">
        <ErrorState message={error} onRetry={load} />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page st-page-enter" aria-busy="true">
        <div className="skeleton" style={{ height: 320 }} />
        <div className="skeleton" style={{ height: 90, marginTop: 16 }} />
        <div className="skeleton" style={{ height: 160, marginTop: 16 }} />
      </section>
    );
  }

  const { fest, events, workshops, sponsors } = data;
  const days = istDayCount(fest.startDate, fest.endDate);
  const ticker = [...events.map(e => e.name), ...workshops.map(w => w.title)];
  const stats = [
    { n: events.length, l: 'Events' },
    { n: workshops.length, l: 'Workshops' },
    { n: events.reduce((s, e) => s + (e.prizePool || 0), 0), l: 'In prizes', prefix: '₹' },
    { n: days, l: 'Days' }
  ];

  const grouped = groupSponsors(sponsors);
  const validSponsors = grouped.all;
  const titleSponsors = grouped.title;
  const goldSponsors = grouped.gold;
  const diamondSponsors = grouped.diamond;
  const partnerSponsors = [...grouped.silver, ...grouped.partner];

  return (
    <section className="page about st-page-enter">
      {/* Hero — Matches the last snapshot of the 3D Multiverse Intro */}
      <header className="st-hero">
        {isAdmin && <Link to="/admin?tab=fest" className="edit-pencil" aria-label="Edit fest info">✎</Link>}

        {/* Main Title - Matches Intro Arrival */}
        <h1 className="st-hero-title">
          <GlitchText text={fest.name || "XPECTO'27"} tag="span" />
        </h1>

        {/* Subtitle with wide tracking */}
        <p className="st-hero-sub">{fest.tagline || 'TECHFEST OF IIT MANDI'}</p>

        {/* High-Tech Telemetry HUD Coordinates */}
        <div className="st-hero-badge">
          <span>[ REALITY RECONSTRUCTED // 20–22 FEB 2027 · IIT MANDI ]</span>
        </div>

        {/* Cyber Neon Countdown Timer */}
        <div className="st-countdown-wrapper">
          <Countdown to={fest.startDate} />
        </div>

        {/* Sleek Sci-Fi Button */}
        <Link to="/events" className="st-btn-cyber">
          <span>ENTER PORTAL // BROWSE EVENTS</span>
        </Link>

        {/* Sleek Scroll Indicator */}
        <a href="#fest-stats" className="st-scroll-cue" aria-label="Scroll down to explore">
          <span>SCROLL TO DIVE IN</span>
          <i />
        </a>
      </header>

      {/* Cyber Ticker */}
      {ticker.length > 0 && (
        <div className="ticker st-ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* About Description */}
      <section className="about-split st-about-split">
        <h2 className="st-section-heading">
          <GlitchText text="ABOUT THE FEST" tag="span" />
        </h2>
        <div className="about-text st-about-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fest.aboutHtml || '') }} />
      </section>

      {/* Event Highlights */}
      <div style={{ marginTop: '3.5rem' }}>
        <h2 className="st-section-heading">
          <GlitchText text="KEY HIGHLIGHTS" tag="span" />
        </h2>
        {events.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.6 }}>No events announced yet. Check back soon.</p>
        ) : (
          <div className="hl-list st-hl-list">
            {events.slice(0, 3).map(e => (
              <Link key={e.id} to={`/events/${e.id}`} className="hl-item tilt-card st-card">
                <span className="hl-icon"><Icon name={iconFor(e)} /></span>
                <span className="hl-head">
                  <h3>{e.name}</h3>
                  <span className="hl-cat">{e.category}</span>
                </span>
                <span className="hl-prize">
                  <Icon name="trophy" />
                  <em>Prize pool</em>
                  <b>{fmtMoney(e.prizePool)}</b>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats Counter */}
      <div className="stats st-stats" id="fest-stats">
        {stats.map(s => (
          <div key={s.l} className="stat st-stat-card">
            <b><CountUp to={s.n} prefix={s.prefix} /></b>
            <span>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Tiered Sponsors with Portal Frames & Flowing Partners (Logos Only) */}
      {validSponsors.length > 0 && (
        <div style={{ marginTop: '5rem', marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 className="st-section-heading">
              <GlitchText text="SPONSORS & PARTNERS" tag="span" />
            </h2>
            <p style={{ fontFamily: 'var(--st-mono)', color: 'var(--st-green)', fontSize: '0.82rem', letterSpacing: '0.2em' }}>
              [ INTERDIMENSIONAL ALLIANCE MATRIX ]
            </p>
          </div>

          {/* Title Sponsor - Static Dedicated Portal */}
          {titleSponsors.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div className="st-sponsor-tier-label title">✦ TITLE SPONSOR ✦</div>
              {titleSponsors.map(s => (
                <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="st-sponsor-title-card">
                  <div className="st-sponsor-tag">[ TITLE SPONSOR ]</div>
                  <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
                </a>
              ))}
            </div>
          )}

          {/* Gold Sponsors - Static Dedicated Cards */}
          {goldSponsors.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div className="st-sponsor-tier-label gold">◆ GOLD SPONSORS ◆</div>
              <div className="st-sponsor-gold-grid">
                {goldSponsors.map(s => (
                  <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="st-sponsor-gold-card">
                    <div className="st-sponsor-tag gold">[ GOLD SPONSOR ]</div>
                    <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Diamond Sponsors - Static Dedicated Cards */}
          {diamondSponsors.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div className="st-sponsor-tier-label diamond">❖ DIAMOND SPONSORS ❖</div>
              <div className="st-sponsor-diamond-grid">
                {diamondSponsors.map(s => (
                  <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="st-sponsor-diamond-card">
                    <div className="st-sponsor-tag diamond">[ DIAMOND SPONSOR ]</div>
                    <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Flowing Partners - Flows in one by one on scroll with [SPONSOR] tag */}
          {partnerSponsors.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <div className="st-sponsor-tier-label partner">● FLOWING PARTNER NETWORK ●</div>
              <div className="st-sponsor-flow" ref={flowRef}>
                {partnerSponsors.map(s => (
                  <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="st-sponsor-flow-card">
                    <span className="st-sponsor-tag partner">[ SPONSOR ]</span>
                    <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Line */}
      <div className="contact-line st-contact-line">
        <h3 style={{ fontFamily: 'var(--st-font-display)', color: 'var(--st-cyan)' }}>COMMUNICATION FREQUENCY</h3>
        <p style={{ fontFamily: 'var(--st-mono)', color: 'var(--st-green)', marginTop: '0.4rem' }}>
          <a href={`mailto:${fest.contactEmail}`}>{fest.contactEmail}</a> · {fest.contactPhone}
        </p>
      </div>
    </section>
  );
}
