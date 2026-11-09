import { useState } from 'react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { useAdminError } from './util';

/** Desk check: enter the registration ID shown on the participant's ticket/QR.
 *  The server looks it up live, so a forged or edited QR image can't pass. */
export default function VerifyTab() {
  const [id, setId] = useState('');
  const [res, setRes] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const fail = useAdminError();

  const check = async e => {
    e.preventDefault();
    if (!id.trim()) return;
    setBusy(true); setRes(null); setNotFound(false);
    try {
      setRes(await api.admin.verifyRegistration(id));
    } catch (x) {
      if (x.status === 404 || x.code === 'NOT_FOUND') setNotFound(true); else fail(x);
    } finally { setBusy(false); }
  };

  const r = res?.registration, u = r?.user;
  const what = r ? (r.kind === 'mess' ? `Mess: ${r.messName}` : r.targetName) : '';

  return (
    <div>
      <h2>Desk verification</h2>
      <p className="muted">Type or paste the registration ID from the ticket. Only an approved registration is valid.</p>
      <form onSubmit={check} className="row">
        <label>Registration ID <input value={id} onChange={e => setId(e.target.value)} placeholder="24-character ID" autoFocus /></label>
        <button className="btn-slash" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</button>
      </form>

      {notFound && <div className="manga-panel" role="alert"><b>✗ INVALID</b> — no registration with that ID.</div>}

      {r && (
        <div className="manga-panel" role="status">
          <p style={{ fontSize: '1.4rem', margin: 0 }}><b>{res.valid ? '✓ VALID' : '✗ NOT VALID'}</b> <StatusBadge status={r.status} /></p>
          {!res.valid && r.status === 'pending' && <p>Payment is still awaiting approval.</p>}
          {!res.valid && r.status === 'rejected' && <p>This registration was rejected{r.rejectionReason ? `: ${r.rejectionReason}` : '.'}</p>}
          <p><b>{u?.name || '—'}</b><br /><small>{u?.email}{u?.phone ? ` · ${u.phone}` : ''}{u?.college ? ` · ${u.college}` : ''}</small></p>
          <p>{r.kind} — {what}{r.teamName ? ` (team ${r.teamName})` : ''}<br /><small>Txn {r.transactionId} · ₹{r.amount}</small></p>
          <p className="muted"><small>Check the name against the participant's ID card.</small></p>
        </div>
      )}
    </div>
  );
}
