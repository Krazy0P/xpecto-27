import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';
import GlitchText from '../components/GlitchText';

/**
 * Sponsors page — Broken Space-Time Multiverse Theme
 * - Title, Gold, and Diamond sponsors have static, dedicated positions in dimensional rift frames.
 * - Partner sponsors flow in one by one on scroll with a prominent [ SPONSOR ] tag.
 */
export default function Sponsors() {
  const { data, error, reload } = useAsync(api.getSponsors, []);
  const { isAdmin } = useAuth();
  const flowRef = useRef(null);

  // IntersectionObserver to reveal flowing sponsors on scroll
  useEffect(() => {
    if (!flowRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    const cards = flowRef.current.querySelectorAll('.st-sponsor-flow-card');
    cards.forEach((card, idx) => {
      card.style.transitionDelay = `${(idx % 6) * 0.08}s`;
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, [data]);

  if (error) {
    return (
      <section className="page st-page-enter">
        <ErrorState message={error.message} onRetry={reload} />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page st-page-enter st-sponsors">
        <h1 className="st-page-title"><GlitchText text="SPONSORS" tag="span" /></h1>
        <div className="grid-cards" aria-busy="true">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      </section>
    );
  }

  const validSponsors = (data || []).filter(s => s.logoUrl && typeof s.logoUrl === 'string' && s.logoUrl.trim().length > 0);
  const title = validSponsors.filter(s => s.tier === 'Title');
  const gold = validSponsors.filter(s => s.tier === 'Gold');
  const diamond = validSponsors.filter(s => s.tier === 'Diamond');
  const silver = validSponsors.filter(s => s.tier === 'Silver');
  const partners = validSponsors.filter(s => s.tier === 'Partner');

  return (
    <section className="page st-page-enter st-sponsors">
      {isAdmin && (
        <Link to="/admin?tab=sponsors" className="edit-pencil static" aria-label="Edit sponsors">
          ✎
        </Link>
      )}

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="st-page-title">
          <GlitchText text="SPONSORS & PARTNERS" tag="span" />
        </h1>
        <p style={{
          fontFamily: 'Courier New, monospace',
          color: '#00ff88',
          letterSpacing: '0.25em',
          fontSize: '0.9rem',
          marginTop: '-1rem'
        }}>
          [ INTERDIMENSIONAL ALLIANCE MATRIX ]
        </p>
      </div>

      {/* 1. TITLE SPONSOR (STATIC DEDICATED PORTAL) */}
      {title.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label title">
            ✦ TITLE SPONSOR ✦
          </div>
          {title.map(s => (
            <a
              key={s.id}
              href={s.websiteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="st-sponsor-title-card"
            >
              <div className="st-sponsor-tag">[ TITLE SPONSOR ]</div>
              <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
      )}

      {/* 2. GOLD SPONSORS (STATIC DEDICATED ROW) */}
      {gold.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label gold">
            ◆ GOLD SPONSORS ◆
          </div>
          <div className="st-sponsor-gold-grid">
            {gold.map(s => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="st-sponsor-gold-card"
              >
                <div className="st-sponsor-tag gold">[ GOLD SPONSOR ]</div>
                <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 3. DIAMOND SPONSORS (STATIC DEDICATED ROW) */}
      {diamond.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label diamond">
            ❖ DIAMOND SPONSORS ❖
          </div>
          <div className="st-sponsor-diamond-grid">
            {diamond.map(s => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="st-sponsor-diamond-card"
              >
                <div className="st-sponsor-tag diamond">[ DIAMOND SPONSOR ]</div>
                <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 4. SILVER SPONSORS (STATIC ROW) */}
      {silver.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label silver">
            ◇ SILVER SPONSORS ◇
          </div>
          <div className="st-sponsor-silver-grid">
            {silver.map(s => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="st-sponsor-silver-card"
              >
                <div className="st-sponsor-tag silver">[ SILVER SPONSOR ]</div>
                <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 5. PARTNERS (FLOWING ONE BY ONE ON SCROLL WITH SPONSOR TAG) */}
      {partners.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label partner">
            ● FLOWING PARTNER NETWORK ●
          </div>
          <div className="st-sponsor-flow" ref={flowRef}>
            {partners.map(s => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="st-sponsor-flow-card"
              >
                <span className="st-sponsor-tag partner">[ SPONSOR ]</span>
                <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
