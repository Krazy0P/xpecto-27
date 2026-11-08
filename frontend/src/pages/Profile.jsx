import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import StatusBadge from '../components/StatusBadge';
import MessList from '../components/MessList';
import ErrorState from '../components/ErrorState';
import { capitalize, fmtDate, fmtMoney } from '../utils';

const DETAILS = [['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['College', 'college']];

function RegGroup({ title, items }) {
  if (!items.length) return null;
  return (
    <>
      <h2 className="sec-title">{title}</h2>
      <ul className="reg-list">
        {items.map(r => (
          <li key={r.id} className="reg-row">
            <div>
              <h3>{r.targetName}</h3>
              <p className="muted">{fmtDate(r.createdAt)}{r.teamName && ` · Team ${r.teamName}`}</p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Payments({ rows }) {
  const sum = status => rows.filter(p => p.status === status).reduce((t, p) => t + p.amount, 0);
  return (
    <>
      <h2 className="sec-title">Payments</h2>
      {rows.length === 0 ? <p className="muted">No payments made yet.</p> : (
        <>
          <div className="pay-summary">
            <div><span className="muted">Confirmed</span><b>{fmtMoney(sum('approved'))}</b></div>
            <div><span className="muted">Awaiting verification</span><b>{fmtMoney(sum('pending'))}</b></div>
            {sum('rejected') > 0 && <div><span className="muted">Rejected</span><b>{fmtMoney(sum('rejected'))}</b></div>}
          </div>
          <div className="pay-scroll">
            <table className="pay-table">
              <thead><tr><th>For</th><th>Date</th><th>Amount</th><th>Transaction ID</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td>{fmtMoney(p.amount)}</td>
                    <td className="txn">{p.transactionId}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/** Signed-in user's profile: account details, registrations, payments, and logout at the bottom. */
export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const { data, error, reload } = useAsync(() => Promise.all([api.myRegistrations(), api.myMessRegistrations()]), []);

  const signOut = async () => {
    setLeaving(true);
    navigate('/', { replace: true });
    try { await logout(); toast.success('Logged out'); }
    catch { toast.error('Could not reach the server to end your session. Please try again.'); }
  };

  const regs = data ? data[0] : [], mess = data ? data[1] : [];
  const events = regs.filter(r => r.kind === 'event'), workshops = regs.filter(r => r.kind === 'workshop');
  const payments = [
    ...regs.map(r => ({ id: r.id, name: r.targetName, createdAt: r.createdAt, amount: r.amount, transactionId: r.transactionId, status: r.status })),
    ...mess.map(r => ({ id: r.id, name: r.messName || `${capitalize(r.messOption)} Mess`, createdAt: r.createdAt, amount: r.amount, transactionId: r.transactionId, status: r.status })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="page">
      <h1 className="page-title page-head">My Profile</h1>

      <div className="fcard"><div className="fcard-in">
        <dl className="profile-details">
          {DETAILS.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{user[key] || '—'}</dd></div>)}
          {user.role === 'admin' && <div><dt>Role</dt><dd>Admin · <Link to="/admin">Open admin panel</Link></dd></div>}
        </dl>
      </div></div>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : !data ? (
        <div aria-busy="true"><div className="skeleton" style={{ height: 90, marginTop: 24 }} /><div className="skeleton" style={{ height: 90, marginTop: 12 }} /></div>
      ) : (
        <>
          {regs.length + mess.length === 0 && <div className="empty-note"><p>You haven't registered for anything yet.</p><Link to="/events" className="btn-slash">Browse events</Link></div>}
          <RegGroup title="Events" items={events} />
          <RegGroup title="Workshops" items={workshops} />
          {mess.length > 0 && <><h2 className="sec-title">Mess</h2><MessList items={mess} /></>}
          <Payments rows={payments} />
        </>
      )}

      <div className="profile-logout">
        <button type="button" className="btn-slash" onClick={signOut} disabled={leaving}>{leaving ? 'Logging out…' : 'Logout'}</button>
      </div>
    </section>
  );
}
