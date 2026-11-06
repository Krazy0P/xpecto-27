import StatusBadge from './StatusBadge';
import { capitalize, fmtDate, fmtMoney } from '../utils';

/** Mess registrations with the downloadable confirmation QR once approved. */
export default function MessList({ items }) {
  return (
    <ul className="reg-list">
      {items.map(r => (
        <li key={r.id} className="reg-row">
          <div><h3>{r.messName || `${capitalize(r.messOption)} Mess`}</h3>
            <p className="muted">{fmtDate(r.createdAt)} · {fmtMoney(r.amount)} · Txn {r.transactionId}</p></div>
          <StatusBadge status={r.status} />
          {r.status === 'approved' && (r.confirmationQrUrl ? (
            <div className="qr-dl">
              <img src={r.confirmationQrUrl} alt={`Confirmation QR for ${r.messOption} mess`} className="qr small" />
              <a className="btn-slash" href={r.confirmationQrUrl} download={`xpecto-mess-${r.messOption}-${r.id}.png`} target="_blank" rel="noreferrer">Download QR</a>
            </div>
          ) : <p className="muted">Your QR is being generated.</p>)}
        </li>
      ))}
    </ul>
  );
}
