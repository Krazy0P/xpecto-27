import { useState } from 'react';
import toast from 'react-hot-toast';
import useAsync from '../../hooks/useAsync';
import api from '../../api';
import ErrorState from '../../components/ErrorState';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate } from '../../utils';
import { useAdminError } from './util';

export default function AmbassadorsTab() {
  const { data, error, reload } = useAsync(api.admin.ambassadors, []);
  const [status, setStatus] = useState('');
  const fail = useAdminError();
  const rows = (data || []).filter(row => !status || row.status === status);
  const decide = async (id, action) => {
    try { await api.admin.decideAmbassador(id, action); toast.success(`Application ${action}`); reload(); } catch (e) { fail(e); }
  };
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div>
      <div className="row"><h2>Campus ambassador applications</h2><label>Status <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option>pending</option><option>approved</option><option>rejected</option></select></label></div>
      {!data ? <div className="skeleton" style={{ height: 120 }} /> : rows.length === 0 ? <p>No applications found.</p> : (
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>Applicant</th><th>College</th><th>Profile</th><th>Reach</th><th>Motivation</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{row.name}<br /><small>{row.email}<br />{row.phone}</small></td><td>{row.college}<br /><small>{row.city} · {row.course} · Year {row.year}</small></td><td>{row.socialLink ? <a href={row.socialLink} target="_blank" rel="noreferrer">Open</a> : '—'}</td><td>{row.reach}</td><td>{row.motivation}</td><td>{fmtDate(row.createdAt)}</td><td><StatusBadge status={row.status} /></td><td>{row.status === 'pending' && <><button className="link-btn" onClick={() => decide(row.id, 'approved')}>Approve</button><button className="link-btn danger" onClick={() => decide(row.id, 'rejected')}>Reject</button></>}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
