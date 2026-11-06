import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useRegisterFlow from '../hooks/useRegisterFlow';
import WorkshopCard from '../components/WorkshopCard';
import PaymentModal from '../components/PaymentModal';
import ErrorState from '../components/ErrorState';
import { sameId } from '../utils';

const toTarget = w => ({ id: w.id, name: w.title, amount: w.fee });

export default function Workshops() {
  const { data, error, reload } = useAsync(api.getWorkshops, []);
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const flow = useRegisterFlow();
  const { start } = flow;
  const ask = w => start(toTarget(w), `/workshops?register=${w.id}`);

  // Back from login with ?register=ID -> reopen the modal for that workshop
  useEffect(() => {
    const id = params.get('register');
    if (!data || loading || !user || !id) return;
    setParams({}, { replace: true });
    const w = data.find(x => sameId(x.id, id));
    if (w && w.seatsLeft > 0) start(toTarget(w), '');
  }, [data, loading, user, params, setParams, start]);

  const sorted = data ? [...data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)) : [];
  return (
    <section className="page">
      <h1 className="page-title page-head">Workshops</h1>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid-cards" aria-busy="true">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320 }} />)}</div>
      ) : sorted.length === 0 ? <p>No workshops scheduled yet. Check back soon.</p> : (
        <div className="wlist">{sorted.map(w => <WorkshopCard key={w.id} workshop={w} onRegister={ask} />)}</div>
      )}
      {flow.target && <PaymentModal kind="workshop" target={flow.target} onClose={flow.close} onSuccess={reload} />}
    </section>
  );
}
