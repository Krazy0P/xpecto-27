import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';

const TIERS = ['Title', 'Gold', 'Silver', 'Partner'];

export default function Sponsors() {
  const { data, error, reload } = useAsync(api.getSponsors, []);
  const { isAdmin } = useAuth();
  return (
    <section className="page">
      <h1 className="page-title page-head">Sponsors</h1>
      {isAdmin && <Link to="/admin?tab=sponsors" className="edit-pencil static" aria-label="Edit sponsors">✎</Link>}
      {error ? <ErrorState message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid-cards" aria-busy="true">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}</div>
      ) : data.length === 0 ? <p>Sponsors will be announced soon.</p> : TIERS.map(t => {
        const list = data.filter(s => s.tier === t);
        return list.length > 0 && (
          <div key={t}>
            <h2 className={`sec-title tier-${t}`}>{t} {t === 'Partner' ? 's' : 'Sponsors'}</h2>
            <div className={`sponsor-grid tier-${t}`}>
              {list.map(s => (
                <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer noopener" className="tilt-card sponsor-card" aria-label={`${s.name} (opens website)`}>
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" /> : <span>{s.name}</span>}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
