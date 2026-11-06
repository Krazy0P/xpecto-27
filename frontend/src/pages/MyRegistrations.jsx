import { Link } from 'react-router';
import api from '../api';
import useAsync from '../hooks/useAsync';
import StatusBadge from '../components/StatusBadge';
import MessList from '../components/MessList';
import ErrorState from '../components/ErrorState';
import { fmtDate, fmtMoney } from '../utils';

function RegGroup({ title, items }) {
  if (!items.length) return null;
  return (
    <>
      <h2 className="sec-title">{title}</h2>
      <ul className="reg-list">
        {items.map(r => (
          <li key={r.id} className="reg-row">
            <div><h3>{r.targetName}</h3><p className="muted">{fmtDate(r.createdAt)} · {fmtMoney(r.amount)} · Txn {r.transactionId}{r.teamName && ` · Team ${r.teamName}`}</p></div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </>
  );
}

export default function MyRegistrations() {
  const { data, error, reload } = useAsync(() => Promise.all([api.myRegistrations(), api.myMessRegistrations()]), []);
  if (error) return <section className="page"><ErrorState message={error.message} onRetry={reload} /></section>;
  if (!data) return <section className="page" aria-busy="true"><div className="skeleton" style={{ height: 90 }} /><div className="skeleton" style={{ height: 90, marginTop: 12 }} /></section>;
  const [regs, mess] = data;
  const events = regs.filter(r => r.kind === 'event'), workshops = regs.filter(r => r.kind === 'workshop');
  const empty = !regs.length && !mess.length;

  return (
    <section className="page">
      <h1 className="page-title page-head">My Registrations</h1>
      {empty && <div className="empty-note"><p>Nothing here yet.</p><Link to="/events" className="btn-slash">Browse events</Link></div>}
      <RegGroup title="Events" items={events} />
      <RegGroup title="Workshops" items={workshops} />
      {mess.length > 0 && <><h2 className="sec-title">Mess</h2><MessList items={mess} /></>}
    </section>
  );
}
