import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useRegisterFlow from '../hooks/useRegisterFlow';
import PaymentModal from '../components/PaymentModal';
import MessList from '../components/MessList';
import ErrorState from '../components/ErrorState';
import { fmtMoney } from '../utils';

export default function Mess() {
  const { user, loading: authLoading } = useAuth();
  const opts = useAsync(api.getMessOptions, []);
  const mine = useAsync(() => user ? api.myMessRegistrations() : Promise.resolve([]), [user]);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get('option') || '');
  const flow = useRegisterFlow();
  const chosen = opts.data?.find(o => o.id === selected);
  const pay = () => flow.start({ id: chosen.id, name: chosen.name, amount: chosen.price }, `/mess?option=${chosen.id}&register=1`);

  // Back from login: option is preselected, reopen the modal
  useEffect(() => {
    if (params.get('register') && chosen && user && !authLoading) { setParams({}, { replace: true }); flow.start({ id: chosen.id, name: chosen.name, amount: chosen.price }, ''); }
  }, [chosen, user, authLoading]); // eslint-disable-line

  return (
    <section className="page">
      <h1 className="page-title page-head">Mess Registrations</h1>
      {opts.error ? <ErrorState message={opts.error.message} onRetry={opts.reload} /> : !opts.data ? (
        <div className="grid-cards" aria-busy="true">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}</div>
      ) : opts.data.length === 0 ? <p>Mess registration is not open yet.</p> : (
        <>
          <div className="grid-cards" role="radiogroup" aria-label="Choose a mess">
            {opts.data.map(o => (
              <button key={o.id} role="radio" aria-checked={selected === o.id} className={`tilt-card mess-opt ${selected === o.id ? 'sel' : ''}`} onClick={() => setSelected(o.id)}>
                {o.imageUrl ? <img src={o.imageUrl} alt="" loading="lazy" decoding="async" className="card-img" /> : <div className="card-img ph" aria-hidden="true" lang="ja">食</div>}
                <h3>{o.name}</h3><p>{o.description}</p><p><b>{fmtMoney(o.price)}</b></p>
              </button>
            ))}
          </div>
          <p className="mt"><button className="btn-slash" disabled={!chosen} onClick={pay}>{chosen ? `Register for ${chosen.name}` : 'Select a mess to continue'}</button></p>
        </>
      )}

      <h2 className="sec-title">My mess registrations</h2>
      <p className="muted">Once approved, your individual QR appears here and is also emailed to you.</p>
      {!user ? <p>Log in to see your registrations.</p> : mine.error ? <ErrorState message={mine.error.message} onRetry={mine.reload} />
        : !mine.data ? <div className="skeleton" style={{ height: 90 }} /> : mine.data.length === 0 ? <p>No mess registrations yet.</p> : <MessList items={mine.data} />}

      {flow.target && <PaymentModal kind="mess" target={flow.target} onClose={flow.close} onSuccess={mine.reload} />}
    </section>
  );
}
