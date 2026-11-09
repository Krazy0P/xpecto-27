import toast from 'react-hot-toast';
import { BANK, PAY_METHODS } from '../config/accommodation';
import { fmtMoney } from '../utils';
import qrImg from '../assets/accommodation-qr.jpg';

const copy = (text, what) => navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`)).catch(() => toast.error('Could not copy. Select it manually.'));

function Row({ label, value }) {
  return (<><dt>{label}</dt><dd>{value}</dd><button type="button" className="link-btn" onClick={() => copy(value, label)}>Copy</button></>);
}

/**
 * Shared payment-method picker + payment details (UPI QR / NEFT-RTGS / Cheque).
 * Used by accommodation, events, workshops and mess so every payment looks the same.
 * Props: method ('upi' | 'neft' | 'cheque'), onMethod(id), amount.
 */
export default function PaymentMethods({ method, onMethod, amount }) {
  return (
    <>
      <p className="amount">Amount: {fmtMoney(amount)}</p>
      <div className="pay-tabs" role="tablist" aria-label="Payment method">
        {PAY_METHODS.map(p => <button key={p.id} type="button" role="tab" aria-selected={method === p.id} className={`chip ${method === p.id ? 'on' : ''}`} onClick={() => onMethod(p.id)}>{p.label}</button>)}
      </div>

      {method === 'upi' && (
        <>
          <img className="qr stay-qr" src={qrImg} alt="UPI payment QR code for Xpecto IIT Mandi" />
          <dl className="bank-list"><Row label="UPI ID" value={BANK.upiId} /><Row label="Name" value={BANK.name} /></dl>
        </>
      )}
      {method === 'neft' && (
        <dl className="bank-list">
          <Row label="Name" value={BANK.name} /><Row label="Account No." value={BANK.accountNo} /><Row label="IFSC" value={BANK.ifsc} /><Row label="Bank" value={BANK.bank} /><Row label="Branch" value={BANK.branch} />
        </dl>
      )}
      {method === 'cheque' && (
        <>
          <dl className="bank-list"><Row label="Payable to" value={BANK.name} /><Row label="Account No." value={BANK.accountNo} /><Row label="Branch" value={BANK.branch} /></dl>
          <p className="muted pay-note">Write the cheque for {fmtMoney(amount)} in favour of “{BANK.name}”. Use the cheque number as your reference in the next step and upload a photo of the cheque as proof.</p>
        </>
      )}
      <p className="muted pay-note">Pay the exact amount, then continue. Keep your payment receipt or screenshot ready.</p>
    </>
  );
}
