import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';
import useAsync from '../../hooks/useAsync';
import StatusBadge from '../../components/StatusBadge';
import ErrorState from '../../components/ErrorState';
import { useAdminError } from './util';
import { fmtDate, sameId } from '../../utils';

const KINDS = [['', 'All'], ['event', 'Events'], ['workshop', 'Workshops'], ['accommodation', 'Accommodation']];

/** Registrations review table. mess=true switches to the mess endpoints. */
export default function RegTable({ mess = false }) {
  const [f, setF] = useState({ kind: '', status: '', targetId: '', messOption: '' });
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const fail = useAdminError();
  const targets = useAsync(() => Promise.all([api.getEvents(), api.getWorkshops(), api.getMessOptions()]).then(([events, workshops, messOptions]) => ({ events, workshops, messOptions })), []);
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const { data, error, reload } = useAsync(() => mess ? api.admin.messRegistrations(params) : api.admin.registrations(params), [JSON.stringify(f)]);
  const set = k => e => setF({ ...f, [k]: e.target.value, ...(k === 'kind' ? { targetId: '' } : {}) });
  const setKind = kind => setF({ ...f, kind, targetId: '' });
  const opts = f.kind === 'event' ? targets.data?.events : f.kind === 'workshop' ? targets.data?.workshops : [];

  const rows = (data || []).filter(r => (!f.status || r.status === f.status) && (mess ? !f.messOption || sameId(r.messOption, f.messOption) : (!f.kind || r.kind === f.kind) && (!f.targetId || sameId(r.targetId, f.targetId))));

  const decide = async (r, action) => {
    try {
      await (mess ? api.admin.decideMess : api.admin.decide)(r.id, action, reason);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected'); setRejecting(null); setReason(''); reload();
    } catch (x) { fail(x); }
  };

  const exportCsv = () => window.open(api.admin.exportCsvUrl(), '_blank', 'noopener');

  return (
    <div>
      <div className="row"><h2>{mess ? 'Mess registrations' : 'Registrations'}</h2>{!mess && <button className="btn-slash" onClick={exportCsv}>Export CSV</button>}</div>
      {!mess && (
        <div className="chips" role="tablist" aria-label="Registration type">
          {KINDS.map(([k, l]) => <button key={k} role="tab" aria-selected={f.kind === k} className={`chip ${f.kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}
        </div>
      )}
      <div className="filters">
        {!mess && f.kind && <label>Target <select value={f.targetId} onChange={set('targetId')}><option value="">All</option>{(opts || []).map(o => <option key={o.id} value={o.id}>{o.name || o.title}</option>)}</select></label>}
        {mess && <label>Mess <select value={f.messOption} onChange={set('messOption')}><option value="">All</option>{(targets.data?.messOptions || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        <label>Status <select value={f.status} onChange={set('status')}><option value="">All</option><option>pending</option><option>approved</option><option>rejected</option></select></label>
      </div>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : !data ? <div className="skeleton" style={{ height: 120 }} /> : rows.length === 0 ? <p>No registrations match.</p> : (
        <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>User</th><th>{mess ? 'Mess' : 'Target'}</th><th>Txn ID</th><th>₹</th><th>Date</th><th>Proof</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td>{r.participantName || r.user?.name}<br /><small>{r.participantEmail || r.user?.email}</small><br /><small>{r.college}{r.visitDays ? ` · ${r.visitDays} day(s)` : ''}</small></td>
              <td>{mess ? r.messOption : `${r.targetName || r.competitions?.length + ' competition(s)'} (${r.kind})`}{r.competitionNames?.length > 0 && <><br /><small>{r.competitionNames.join(', ')}</small></>}</td>
              <td>{r.transactionId}</td><td>{r.amount}</td><td>{fmtDate(r.createdAt)}</td>
              <td>{r.screenshotUrl ? <a href={r.screenshotUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{r.status === 'pending' && (rejecting === r.id ? (
                <span className="row-inline"><input aria-label="Rejection reason" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} /><button className="link-btn danger" disabled={!reason.trim()} onClick={() => decide(r, 'reject')}>Confirm</button><button className="link-btn" onClick={() => setRejecting(null)}>×</button></span>
              ) : <><button className="link-btn" onClick={() => decide(r, 'approve')}>Approve</button><button className="link-btn danger" onClick={() => { setRejecting(r.id); setReason(''); }}>Reject</button></>)}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
