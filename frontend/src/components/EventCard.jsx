import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtMoney, dayMon } from '../utils';

/** Tall framed card: arched top, art, title, Explore/Register, prize bar. Same data + callbacks as before. */
export default function EventCard({ event: e, onRegister }) {
  const { isAdmin } = useAuth();
  const { d, m } = dayMon(e.startTime);
  return (
    <article className="fcard tilt-card">
      <div className="fcard-in">
        {isAdmin && <Link to={`/admin?tab=events&id=${e.id}`} className="edit-pencil" aria-label={`Edit ${e.name}`}>✎</Link>}
        <Link to={`/events/${e.id}`} className="fcard-art" tabIndex={-1} aria-hidden="true">
          <div className="img-wrap">
            {e.imageUrl ? <img src={e.imageUrl} alt="" loading="lazy" decoding="async" className="card-img" /> : <div className="card-img ph" lang="ja">競</div>}
            <span className="date-badge"><b>{d}</b>{m}</span>
          </div>
        </Link>
        <div className="fcard-body">
          <h3><Link to={`/events/${e.id}`}>{e.name}</Link></h3>
          <p className="chip">{e.category}</p>
          <p className="meta">◷ {fmtTime(e.startTime)}–{fmtTime(e.endTime)}</p>
          <p className="meta">⌖ {e.venue}</p>
          <p className="meta">Fee <b>{fmtMoney(e.registrationFee)}</b></p>
        </div>
        <div className="fcard-actions">
          <Link to={`/events/${e.id}`} className="ghost-btn"><span>Explore</span></Link>
          <button className="ghost-btn solid" disabled={!e.registrationOpen} onClick={() => onRegister(e)}><span>{e.registrationOpen ? 'Register' : 'Closed'}</span></button>
        </div>
        <div className="fcard-prize"><span>Prize pool</span><b>{fmtMoney(e.prizePool)}</b></div>
      </div>
    </article>
  );
}
