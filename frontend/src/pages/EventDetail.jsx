import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import ErrorState from '../components/ErrorState';
import useRegisterFlow from '../hooks/useRegisterFlow';
import { fmtDate, fmtTime, fmtMoney } from '../utils';

const Block = ({ className = '', children }) => <section className={`dsec ${className}`}>{children}</section>;

export default function EventDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, loading, isAdmin } = useAuth();
  const [e, setE] = useState(null);
  const [error, setError] = useState(null);
  const flow = useRegisterFlow();

  const load = useCallback(() => { setError(null); setE(null); api.getEvent(id).then(setE).catch(x => setError(x.code === 'NOT_FOUND' ? 'This event does not exist.' : x.message)); }, [id]);
  useEffect(load, [load]);

  const { start } = flow;
  const open = useCallback(ev => start({ id: ev.id, name: ev.name, amount: ev.registrationFee, teamSize: ev.teamSize }, `/events/${ev.id}?register=1`), [start]);
  // Returning from login with ?register=1 reopens the payment modal automatically
  useEffect(() => {
    if (e && !loading && user && params.get('register')) { setParams({}, { replace: true }); if (e.registrationOpen) open(e); }
  }, [e, loading, user, params, setParams, open]);

  if (error) return <section className="page"><ErrorState message={error} onRetry={load} /></section>;
  if (!e) return <section className="page" aria-busy="true"><div className="skeleton" style={{ height: 300 }} /></section>;

  return (
    <section className="page detail">
      <Link to="/events">← All events</Link>
      <Block className="detail-head">
        {isAdmin && <Link to={`/admin?tab=events&id=${e.id}`} className="edit-pencil" aria-label="Edit event">✎</Link>}
        {e.imageUrl ? <img src={e.imageUrl} alt={e.name} className="detail-img" /> : <div className="detail-img ph st-card-ph"><span>XP'27</span></div>}
        <div>
          <h1 className="page-title">{e.name}</h1>
          <p className="chip">{e.category}</p>
          <p>{fmtDate(e.startTime)} · {fmtTime(e.startTime)}–{fmtTime(e.endTime)}</p>
          <p>{e.venue}</p>
          <p>Team size {e.teamSize.min === e.teamSize.max ? e.teamSize.min : `${e.teamSize.min}–${e.teamSize.max}`} · Fee <b>{fmtMoney(e.registrationFee)}</b></p>
          <button className="btn-slash" disabled={!e.registrationOpen} onClick={() => open(e)}>{e.registrationOpen ? 'Register' : 'Registration closed'}</button>
        </div>
      </Block>
      <Block className="mt"><h2>About</h2><p>{e.description}</p></Block>
      <Block className="mt"><h2>Rules</h2><p style={{ whiteSpace: 'pre-line' }}>{e.rules}</p></Block>
      <Block className="mt">
        <h2>Prizes · {fmtMoney(e.prizePool)}</h2>
        <ul className="prizes">{e.prizeBreakdown.map((p, i) => <li key={`${p.position}-${i}`}><b>{p.position}</b> {fmtMoney(p.amount)}</li>)}</ul>
      </Block>
      <Block className="mt"><h2>Contact</h2><p>{[e.contact.name, e.contact.phone].filter(Boolean).join(' · ')}</p></Block>
      {flow.target && <PaymentModal kind="event" target={flow.target} onClose={flow.close} />}
    </section>
  );
}
