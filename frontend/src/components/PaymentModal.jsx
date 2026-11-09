import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import ImageUpload, { validateImage } from './ImageUpload';
import StatusBadge from './StatusBadge';
import PaymentMethods from './PaymentMethods';
import { PAY_METHODS } from '../config/accommodation';
import { fmtMoney } from '../utils';

/**
 * 3-step payment flow shared by events, workshops and mess (same UPI / NEFT-RTGS / Cheque options as accommodation).
 * kind: 'event' | 'workshop' | 'mess'; target: { id, name, amount, teamSize? }
 */
export default function PaymentModal({ kind, target, onClose, onSuccess }) {
  const navigate = useNavigate();
  const head = useRef(null);
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('upi');
  const [txn, setTxn] = useState('');
  const [file, setFile] = useState(null);
  const [team, setTeam] = useState('');
  const [members, setMembers] = useState('');
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const m = PAY_METHODS.find(x => x.id === method);
  const teamEvent = kind === 'event' && target.teamSize?.max > 1;

  useEffect(() => { head.current?.focus(); }, []);
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  // Lock page scroll while the modal is open
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, []);

  const toStep3 = () => {
    const e = {};
    if (txn.trim().length < 6) e.txn = `Enter the ${m.refLabel.toLowerCase()} (at least 6 characters).`;
    const f = validateImage(file); if (f) e.file = f;
    setErrs(e); if (!Object.keys(e).length) setStep(3);
  };

  const submit = async () => {
    setBusy(true); setErrs({});
    const f = new FormData();
    if (kind === 'mess') f.append('messOption', target.id);
    else {
      f.append('kind', kind); f.append('targetId', target.id);
      if (teamEvent && team.trim()) {
        f.append('teamName', team.trim());
        f.append('teamMembers', JSON.stringify(members.split('\n').map(s => s.trim()).filter(Boolean).map(name => ({ name }))));
      }
    }
    f.append('paymentMethod', method); f.append('transactionId', txn.trim()); f.append('screenshot', file);
    try {
      const r = kind === 'mess' ? await api.createMessRegistration(f) : await api.createRegistration(f);
      setDone(r); onSuccess?.(r);
    } catch (e) {
      if (e.code === 'DUPLICATE_TRANSACTION') { setErrs({ txn: 'This transaction ID was already used. Check the ID in your payment app.' }); setStep(2); }
      else if (e.code === 'ALREADY_REGISTERED') setErrs({ banner: 'You have already registered for this. Check My Registrations for its status.' });
      else if (e.code === 'FILE_TOO_LARGE') { setErrs({ file: 'Screenshot is too large. Use an image under 5 MB.' }); setStep(2); }
      else if (e.code === 'UNAUTHENTICATED') { toast.error('Session expired. Please log in again.'); navigate('/auth', { state: { from: window.location.pathname + window.location.search } }); }
      else setErrs({ banner: e.message || 'Could not submit. Try again.' });
    } finally { setBusy(false); }
  };

  const steps = ['Pay', 'Proof', 'Submit'];
  // Portal to <body> so page transforms can never break position:fixed
  return createPortal(
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="manga-panel modal" role="dialog" aria-modal="true" aria-labelledby="pay-title" initial={{ opacity: 0, y: 40, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <h2 id="pay-title" ref={head} tabIndex={-1}>{done ? 'Registration sent' : `Register: ${target.name}`}</h2>

        {done ? (
          <div className="pay-done">
            <p>Status: <StatusBadge status={done.status || 'pending'} /></p>
            <p>An admin will verify your payment. {kind === 'mess' && 'Your mess QR will be emailed once approved.'}</p>
            <Link to="/profile" className="btn-slash" onClick={onClose}>View my registrations</Link>
          </div>
        ) : (
          <>
            <ol className="stepper" aria-label="Progress">{steps.map((s, i) => <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'past' : ''} aria-current={step === i + 1 ? 'step' : undefined}>{s}</li>)}</ol>
            {errs.banner && <p className="banner-err" role="alert">{errs.banner}</p>}

            {step === 1 && (
              <div className="pay-step">
                <PaymentMethods method={method} onMethod={setMethod} amount={target.amount} />
                <button className="btn-slash" onClick={() => setStep(2)}>I have paid</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="field">
                  <label htmlFor="txn">{m.refLabel}</label>
                  <input id="txn" value={txn} onChange={e => setTxn(e.target.value)} autoComplete="off" aria-invalid={!!errs.txn} aria-describedby="txn-err" />
                  {errs.txn && <span id="txn-err" className="err" role="alert">{errs.txn}</span>}
                </div>
                <ImageUpload id="shot" label="Payment proof / screenshot (PNG, JPG, WEBP, max 5 MB)" onChange={setFile} error={errs.file} />
                {teamEvent && (
                  <>
                    <div className="field"><label htmlFor="team">Team name (optional)</label><input id="team" value={team} onChange={e => setTeam(e.target.value)} /></div>
                    <div className="field"><label htmlFor="mem">Team members, one per line (max {target.teamSize.max})</label><textarea id="mem" rows={3} value={members} onChange={e => setMembers(e.target.value)} /></div>
                  </>
                )}
                <div className="row"><button className="link-btn" onClick={() => setStep(1)}>Back</button><button className="btn-slash" onClick={toStep3}>Review</button></div>
              </div>
            )}

            {step === 3 && (
              <div>
                <dl className="review">
                  <dt>For</dt><dd>{target.name}</dd><dt>Amount</dt><dd>{fmtMoney(target.amount)}</dd><dt>Paid via</dt><dd>{m.label}</dd><dt>{m.refLabel}</dt><dd>{txn}</dd><dt>Proof</dt><dd>{file?.name}</dd>
                </dl>
                <div className="row"><button className="link-btn" onClick={() => setStep(2)} disabled={busy}>Back</button><button className="btn-slash" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit registration'}</button></div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
