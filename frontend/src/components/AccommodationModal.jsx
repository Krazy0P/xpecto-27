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
import { fmtDate, fmtMoney } from '../utils';

/**
 * 3-step accommodation booking:
 *  1. Stay details (days + events)  2. Payment (UPI / NEFT-RTGS / Cheque)  3. Transaction ID + proof, submit.
 * Props: days (max selectable), pricePerDay, events [{id,name,startTime}], onClose, onSuccess.
 */
export default function AccommodationModal({ maxDays, pricePerDay, events, onClose, onSuccess }) {
  const navigate = useNavigate();
  const head = useRef(null);
  const [step, setStep] = useState(1);
  const [days, setDays] = useState(1);
  const [picked, setPicked] = useState([]);
  const [method, setMethod] = useState('upi');
  const [txn, setTxn] = useState('');
  const [file, setFile] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const amount = days * pricePerDay;
  const m = PAY_METHODS.find(x => x.id === method);

  useEffect(() => { head.current?.focus(); }, []);
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, []);

  const toggle = name => setPicked(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const toStep2 = () => {
    if (!picked.length) { setErrs({ events: 'Select at least one event you are participating in.' }); return; }
    setErrs({}); setStep(2);
  };

  const submit = async () => {
    const e = {};
    if (txn.trim().length < 6) e.txn = `Enter the ${m.refLabel.toLowerCase()} (at least 6 characters).`;
    const f = validateImage(file); if (f) e.file = f;
    setErrs(e); if (Object.keys(e).length) return;

    setBusy(true);
    const body = new FormData();
    body.append('visitDays', String(days));
    body.append('competitions', JSON.stringify(picked));
    body.append('paymentMethod', method);
    body.append('transactionId', txn.trim());
    body.append('screenshot', file);
    try {
      const r = await api.createAccommodationRegistration(body);
      setDone(r); onSuccess?.(r);
    } catch (x) {
      if (x.code === 'CONFLICT' && /transaction/i.test(x.message)) { setErrs({ txn: 'This transaction ID was already used. Check the ID in your payment app.' }); }
      else if (x.code === 'CONFLICT') setErrs({ banner: x.message });
      else if (x.code === 'FILE_TOO_LARGE') setErrs({ file: 'Proof is too large. Use an image under 5 MB.' });
      else if (x.code === 'UNAUTHENTICATED') { toast.error('Session expired. Please log in again.'); navigate('/auth', { state: { from: '/accommodation' } }); }
      else setErrs({ banner: x.message || 'Could not submit. Try again.' });
    } finally { setBusy(false); }
  };

  const steps = ['Stay', 'Payment', 'Confirm'];
  return createPortal(
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="manga-panel modal stay-modal" role="dialog" aria-modal="true" aria-labelledby="stay-title" initial={{ opacity: 0, y: 40, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <h2 id="stay-title" ref={head} tabIndex={-1}>{done ? 'Booking sent' : 'Book accommodation'}</h2>

        {done ? (
          <div className="pay-done">
            <p>Status: <StatusBadge status={done.status || 'pending'} /></p>
            <p>An admin will verify your payment and approve your stay. You can track it on your profile.</p>
            <Link to="/profile" className="btn-slash" onClick={onClose}>View my registrations</Link>
          </div>
        ) : (
          <>
            <ol className="stepper" aria-label="Progress">{steps.map((s, i) => <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'past' : ''} aria-current={step === i + 1 ? 'step' : undefined}>{s}</li>)}</ol>
            {errs.banner && <p className="banner-err" role="alert">{errs.banner}</p>}

            {step === 1 && (
              <div>
                <fieldset className="field" style={{ border: 0, padding: 0 }}>
                  <legend>How many days will you stay?</legend>
                  <div className="stay-days" role="radiogroup" aria-label="Number of days">
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map(n => (
                      <button key={n} type="button" role="radio" aria-checked={days === n} className={`chip ${days === n ? 'on' : ''}`} onClick={() => setDays(n)}>{n} day{n > 1 ? 's' : ''}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="field">
                  <label id="ev-label">Which events are you participating in?</label>
                  {events.length === 0 ? <p className="muted">No events listed yet.</p> : (
                    <div className="stay-events" role="group" aria-labelledby="ev-label">
                      {events.map(ev => (
                        <label key={ev.id}>
                          <input type="checkbox" checked={picked.includes(ev.name)} onChange={() => toggle(ev.name)} />
                          <span>{ev.name}{ev.startTime && <small>{fmtDate(ev.startTime)}</small>}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {errs.events && <span className="err" role="alert">{errs.events}</span>}
                </div>
                <div className="stay-total"><span>{days} day{days > 1 ? 's' : ''} × {fmtMoney(pricePerDay)}</span><span className="amount">{fmtMoney(amount)}</span></div>
                <div className="row"><span /><button className="btn-slash" onClick={toStep2}>Continue to payment</button></div>
              </div>
            )}

            {step === 2 && (
              <div className="pay-step">
                <PaymentMethods method={method} onMethod={setMethod} amount={amount} />
                <div className="row"><button className="link-btn" onClick={() => setStep(1)}>Back</button><button className="btn-slash" onClick={() => setStep(3)}>I have paid</button></div>
              </div>
            )}

            {step === 3 && (
              <div>
                <dl className="review">
                  <dt>Stay</dt><dd>{days} day{days > 1 ? 's' : ''}</dd>
                  <dt>Events</dt><dd>{picked.join(', ')}</dd>
                  <dt>Paid via</dt><dd>{m.label}</dd>
                  <dt>Amount</dt><dd>{fmtMoney(amount)}</dd>
                </dl>
                <div className="field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="stay-txn">{m.refLabel}</label>
                  <input id="stay-txn" value={txn} onChange={e => setTxn(e.target.value)} autoComplete="off" aria-invalid={!!errs.txn} aria-describedby="stay-txn-err" />
                  {errs.txn && <span id="stay-txn-err" className="err" role="alert">{errs.txn}</span>}
                </div>
                <ImageUpload id="stay-proof" label="Payment proof / screenshot (PNG, JPG, WEBP, max 5 MB)" onChange={setFile} error={errs.file} />
                <div className="row"><button className="link-btn" onClick={() => setStep(2)} disabled={busy}>Back</button><button className="btn-slash" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit booking'}</button></div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
