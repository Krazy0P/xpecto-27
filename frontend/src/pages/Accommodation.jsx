import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import AccommodationModal from '../components/AccommodationModal';
import StatusBadge from '../components/StatusBadge';
import ErrorState from '../components/ErrorState';
import { fmtDate, fmtMoney, istDayCount } from '../utils';

const load = () => Promise.all([
  api.getAccommodationInfo().catch(() => ({ pricePerDay: 300, maxDays: 7 })),
  api.getFest().catch(() => null),
  api.getEvents(),
]).then(([info, fest, events]) => {
  const span = fest?.startDate && fest?.endDate ? istDayCount(fest.startDate, fest.endDate) : 0;
  return { ...info, festDays: span, events };
});

export default function Accommodation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const info = useAsync(load, []);
  const mine = useAsync(() => user ? api.myAccommodationRegistrations() : Promise.resolve([]), [user]);
  const [open, setOpen] = useState(false);

  const book = () => user ? setOpen(true) : navigate('/auth', { state: { from: '/accommodation' } });
  const d = info.data;
  const maxDays = d ? Math.max(1, Math.min(d.maxDays, d.festDays || d.maxDays)) : 1;
  const active = (mine.data || []).some(r => r.status !== 'rejected');

  return (
    <section className="page stay-reg">
      <h1 className="page-title page-head">Accommodation</h1>
      <div className="stay-hero">
        <p>Coming to XPECTO'27 from outside? Book a stay on campus. Tell us how many days you'll be here and which events you're in, pay, and submit your transaction ID. We'll verify and confirm.</p>
      </div>

      {info.error ? <ErrorState message={info.error.message} onRetry={info.reload} /> : !d ? <div className="skeleton" style={{ height: 120 }} aria-busy="true" /> : (
        <>
          <div className="stay-facts">
            <div className="stay-fact"><b>{fmtMoney(d.pricePerDay)}</b><span>per person, per day</span></div>
            <div className="stay-fact"><b>{maxDays}</b><span>max days per booking</span></div>
            <div className="stay-fact"><b>UPI · NEFT · Cheque</b><span>pay any way you like</span></div>
          </div>
          <p className="stay-cta">
            <button className="btn-slash" onClick={book} disabled={active}>{active ? 'Booking already submitted' : 'Register for accommodation'}</button>
          </p>
          {open && <AccommodationModal maxDays={maxDays} pricePerDay={d.pricePerDay} events={d.events} onClose={() => setOpen(false)} onSuccess={mine.reload} />}
        </>
      )}

      <h2 className="sec-title">My accommodation</h2>
      {!user ? <p>Please <Link to="/auth" state={{ from: '/accommodation' }}>log in</Link> to see your booking.</p> : mine.error ? <ErrorState message={mine.error.message} onRetry={mine.reload} />
        : !mine.data ? <div className="skeleton" style={{ height: 90 }} /> : mine.data.length === 0 ? <p className="muted">No accommodation booked yet.</p> : (
          <ul className="reg-list">
            {mine.data.map(r => (
              <li key={r.id} className="reg-row">
                <div>
                  <h3>{r.targetName || 'Accommodation'}</h3>
                  <p className="muted">{fmtDate(r.createdAt)} · {fmtMoney(r.amount)} · Txn {r.transactionId}</p>
                  {r.competitionNames.length > 0 && <p className="muted">Events: {r.competitionNames.join(', ')}</p>}
                  {r.status === 'rejected' && r.rejectionReason && <p className="muted">Reason: {r.rejectionReason}</p>}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
