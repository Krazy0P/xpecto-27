import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtMoney, dayMon } from '../utils';

/** Open workshop row (date, details, fee + Register) sitting directly on the scene, no box. Same data/callbacks as before. */
export default function WorkshopCard({ workshop: w, onRegister }) {
  const { isAdmin } = useAuth();
  const soldOut = w.seatsLeft <= 0;
  const filled = w.seatsTotal ? 1 - w.seatsLeft / w.seatsTotal : 1;
  const { d, m } = dayMon(w.startTime);
  return (
    <article className="wrow tilt-card">
      {isAdmin && <Link to={`/admin?tab=workshops&id=${w.id}`} className="edit-pencil" aria-label={`Edit ${w.title}`}>✎</Link>}
      <div className="wdate" aria-hidden="true"><b>{d}</b>{m}</div>
      <div className="wmain">
        {w.imageUrl && <img src={w.imageUrl} alt={w.title} loading="lazy" decoding="async" className="wthumb" />}
        <h3>{w.title}</h3>
        <p>{w.description}</p>
        <p className="meta">Speaker: <b>{w.speaker}</b></p>
        <p className="meta">◷ {fmtTime(w.startTime)}–{fmtTime(w.endTime)} · ⌖ {w.venue}</p>
        <div className={`seats ${filled > 0.75 ? 'hot' : ''}`} role="img" aria-label={`${w.seatsLeft} of ${w.seatsTotal} seats left`}><i style={{ '--w': filled }} /></div>
        <p className="meta"><span className={soldOut ? 'low' : ''}>{soldOut ? 'Sold out' : `${w.seatsLeft} of ${w.seatsTotal} seats left`}</span></p>
      </div>
      <div className="wside">
        <p className="wfee"><em>Fee</em><b>{fmtMoney(w.fee)}</b></p>
        <button className="ghost-btn solid" disabled={soldOut} onClick={() => onRegister(w)}><span>{soldOut ? 'Full' : 'Register'}</span></button>
      </div>
    </article>
  );
}
