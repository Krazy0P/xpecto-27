import { useState } from 'react';
import api from '../../api';
import ImageUpload from '../../components/ImageUpload';
import RichText from './RichText';
import { getPath, toLocalInput, fromLocalInput, useAdminError } from './util';

/** Uploads via POST /api/admin/uploads and stores the returned URL in the form. */
function ImageField({ id, label, value, onChange, onBusy }) {
  const [busy, setBusy] = useState(false);
  const fail = useAdminError();
  const pick = async f => {
    if (!f) return; setBusy(true);
    onBusy?.(true);
    try {
      const result = await api.admin.upload(f);
      if (!result?.url) throw new Error('Image upload did not return a URL.');
      onChange(result.url);
    } catch (e) { fail(e); } finally { setBusy(false); onBusy?.(false); }
  };
  return (
    <div className="field">
      {value && <img src={value} alt={`Current ${label}`} className="upload-preview" />}
      <ImageUpload id={id} label={label + (busy ? ' (uploading…)' : '')} onChange={pick} />
    </div>
  );
}

function Prizes({ value, onChange }) {
  value = Array.isArray(value) ? value : [];
  const set = (i, k, v) => onChange(value.map((r, j) => j === i ? { ...r, [k]: v } : r));
  return (
    <fieldset className="field"><legend>Prize breakdown</legend>
      {value.map((r, i) => (
        <div className="row-inline" key={i}>
          <input aria-label={`Position ${i + 1}`} placeholder="1st" value={r.position} onChange={e => set(i, 'position', e.target.value)} />
          <input aria-label={`Amount ${i + 1}`} type="number" min="0" value={r.amount} onChange={e => set(i, 'amount', Number(e.target.value))} />
          <button type="button" className="link-btn" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...value, { position: '', amount: 0 }])}>+ Add prize</button>
    </fieldset>
  );
}

/** Renders a schema: [{ path, label, type, options?, required? }]. Dotted paths edit nested objects. */
export default function Fields({ fields, value, set, onBusy }) {
  return fields.map(f => {
    const id = `af-${f.path}`, v = getPath(value, f.path) ?? '';
    const common = { id, required: f.required };
    return (
      <div key={f.path}>
        {f.type === 'image' ? <ImageField id={id} label={f.label} value={v} onChange={x => set(f.path, x)} onBusy={onBusy} />
        : f.type === 'prizes' ? <Prizes value={getPath(value, f.path)} onChange={x => set(f.path, x)} />
        : f.type === 'checkbox' ? <div className="field"><label htmlFor={id}><input id={id} type="checkbox" checked={!!v} onChange={e => set(f.path, e.target.checked)} /> {f.label}</label></div>
        : (
          <div className="field">
            <label htmlFor={id}>{f.label}</label>
            {f.type === 'rich' ? <RichText id={id} label={f.label} value={v} onChange={x => set(f.path, x)} />
            : f.type === 'textarea' ? <textarea {...common} rows={4} value={v} onChange={e => set(f.path, e.target.value)} />
            : f.type === 'select' ? <select {...common} value={v} onChange={e => set(f.path, e.target.value)}>{(f.options.includes(v) || v === '' ? f.options : [v, ...f.options]).map(o => <option key={o}>{o}</option>)}</select>
            : f.type === 'datetime' ? <input {...common} type="datetime-local" value={toLocalInput(v)} onChange={e => set(f.path, fromLocalInput(e.target.value))} />
            : f.type === 'number' ? <input {...common} type="number" min="0" value={v} onChange={e => set(f.path, Number(e.target.value))} />
            : <input {...common} type={f.type || 'text'} value={v} onChange={e => set(f.path, e.target.value)} />}
          </div>
        )}
      </div>
    );
  });
}
