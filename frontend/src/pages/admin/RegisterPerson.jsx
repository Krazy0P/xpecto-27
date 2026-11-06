import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import { useAdminError } from './util';

const empty = { participantName: '', participantEmail: '', participantPhone: '', college: '', visitDays: 1, competitions: [] };

export default function RegisterPerson() {
  const events = useAsync(api.getEvents, []);
  const fail = useAdminError();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const selected = useMemo(() => new Set(form.competitions), [form.competitions]);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleCompetition = id => set('competitions', selected.has(String(id))
    ? form.competitions.filter(value => value !== String(id))
    : [...form.competitions, String(id)]);

  const submit = async event => {
    event.preventDefault();
    if (!form.participantName.trim() || !form.participantEmail.trim() || !form.college.trim() || form.visitDays < 1 || !form.competitions.length) {
      toast.error('Complete the participant details and select at least one competition.');
      return;
    }
    setBusy(true);
    try {
      const registration = await api.admin.createRegistration({
        ...form,
        participantName: form.participantName.trim(),
        participantEmail: form.participantEmail.trim(),
        participantPhone: form.participantPhone.trim(),
        college: form.college.trim(),
        visitDays: Number(form.visitDays),
        competitions: form.competitions,
        competitionNames: events.data.filter(item => selected.has(String(item.id))).map(item => item.name),
      });
      setSaved(registration);
      setForm(empty);
      toast.success('Participant registered');
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Register participant</h2>
      <p className="muted">Admin registrations are saved as approved records and do not require payment proof.</p>
      {events.error ? <ErrorState message={events.error.message} onRetry={events.reload} /> : !events.data ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : (
        <form className="manga-panel" onSubmit={submit}>
          <div className="field"><label htmlFor="participant-name">Full name</label><input id="participant-name" required value={form.participantName} onChange={e => set('participantName', e.target.value)} /></div>
          <div className="field"><label htmlFor="participant-email">Email</label><input id="participant-email" type="email" required value={form.participantEmail} onChange={e => set('participantEmail', e.target.value)} /></div>
          <div className="field"><label htmlFor="participant-phone">Phone</label><input id="participant-phone" type="tel" value={form.participantPhone} onChange={e => set('participantPhone', e.target.value)} /></div>
          <div className="field"><label htmlFor="participant-college">College</label><input id="participant-college" required value={form.college} onChange={e => set('college', e.target.value)} /></div>
          <div className="field"><label htmlFor="visit-days">Number of days attending</label><input id="visit-days" type="number" min="1" required value={form.visitDays} onChange={e => set('visitDays', e.target.value)} /></div>
          <fieldset className="field">
            <legend>Competitions</legend>
            {events.data.length === 0 ? <p>No events are available yet.</p> : events.data.map(item => (
              <label key={item.id}><input type="checkbox" checked={selected.has(String(item.id))} onChange={() => toggleCompetition(item.id)} /> {item.name}</label>
            ))}
          </fieldset>
          <button className="btn-slash" disabled={busy}>{busy ? 'Registering…' : 'Register participant'}</button>
          {saved && <p role="status">Registered {saved.participantName} for {saved.competitions.length} competition(s).</p>}
        </form>
      )}
    </div>
  );
}
