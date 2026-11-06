import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import ErrorState from '../components/ErrorState';

const initial = { name: '', email: '', phone: '', college: '', city: '', course: '', year: '', socialLink: '', reach: '', motivation: '' };

export default function CampusAmbassador() {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.applyCampusAmbassador(form);
      setSubmitted(true);
      setForm(initial);
      toast.success('Application submitted');
    } catch (e) {
      if (e.code === 'ALREADY_APPLIED') setError(e.message);
      else setError(e.message || 'Could not submit your application.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page">
      <h1 className="page-title page-head">Campus Ambassador</h1>
      <div className="manga-panel">
        <h2>Represent XPECTO at your college</h2>
        <p>Campus Ambassadors help spread fest updates, build participation, coordinate registrations, and connect their college community with XPECTO.</p>
        {submitted && <p className="banner-success" role="status">Application received. The team will contact you after review.</p>}
        {error && <ErrorState message={error} />}
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="ca-name">Full name</label><input id="ca-name" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-email">Email</label><input id="ca-email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-phone">Phone</label><input id="ca-phone" type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-college">College</label><input id="ca-college" required value={form.college} onChange={e => set('college', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-city">City</label><input id="ca-city" required value={form.city} onChange={e => set('city', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-course">Course / department</label><input id="ca-course" required value={form.course} onChange={e => set('course', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-year">Year of study</label><input id="ca-year" required value={form.year} onChange={e => set('year', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-social">Instagram / LinkedIn profile</label><input id="ca-social" type="url" value={form.socialLink} onChange={e => set('socialLink', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-reach">How many students can you reach?</label><input id="ca-reach" required value={form.reach} onChange={e => set('reach', e.target.value)} /></div>
          <div className="field"><label htmlFor="ca-motivation">Why do you want to be an ambassador?</label><textarea id="ca-motivation" required rows="5" value={form.motivation} onChange={e => set('motivation', e.target.value)} /></div>
          <button className="btn-slash" disabled={busy}>{busy ? 'Submitting…' : 'Apply now'}</button>
        </form>
      </div>
    </section>
  );
}
