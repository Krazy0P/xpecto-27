import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import Fields from './FormFields';
import { setPath, useAdminError } from './util';

/** Generic list + create/edit/delete screen driven by a field schema. */
export default function CrudTab({ title, load, resource, fields, blank, label, canCreate = true, canDelete = true, prepare = b => b, initialId }) {
  const { data, error, reload } = useAsync(load, []);
  const fail = useAdminError();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);

  // Deep link from the public-page pencil (?id=)
  useEffect(() => { const it = data && initialId && data.find(x => String(x.id) === String(initialId)); if (it) setForm(structuredClone(it)); }, [data, initialId]);

  const save = async e => {
    e.preventDefault();
    if (uploads > 0) return;
    setBusy(true);
    try {
      const { id, ...body } = form; const out = prepare(body);
      if (id !== undefined) await resource.update(id, out); else await resource.create(out);
      toast.success('Saved'); setForm(null); reload();
    } catch (x) { fail(x); } finally { setBusy(false); }
  };
  const del = async it => {
    if (!window.confirm(`Delete "${label(it)}"? This cannot be undone.`)) return;
    try { await resource.remove(it.id); toast.success('Deleted'); reload(); } catch (x) { fail(x); }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div>
      <div className="row"><h2>{title}</h2>{canCreate && !form && <button className="btn-slash" onClick={() => setForm(structuredClone(blank))}>+ Add new</button>}</div>
      {form && (
        <form className="manga-panel" onSubmit={save}>
          <h3>{form.id !== undefined ? 'Edit' : 'New'} {title}</h3>
          <Fields fields={fields} value={form} set={(p, v) => setForm(f => setPath(f, p, v))} onBusy={active => setUploads(n => n + (active ? 1 : -1))} />
          <div className="row"><button type="button" className="link-btn" disabled={busy || uploads > 0} onClick={() => setForm(null)}>Cancel</button><button className="btn-slash" disabled={busy || uploads > 0}>{busy ? 'Saving…' : uploads > 0 ? 'Uploading…' : 'Save'}</button></div>
        </form>
      )}
      {!data ? <div className="skeleton" style={{ height: 100 }} /> : data.length === 0 ? <p>Nothing here yet.</p> : (
        <ul className="reg-list">{data.map(it => (
          <li key={it.id} className="manga-panel"><b>{label(it)}</b>
            <span><button className="link-btn" onClick={() => setForm(structuredClone(it))}>Edit</button>{canDelete && <button className="link-btn danger" onClick={() => del(it)}>Delete</button>}</span></li>
        ))}</ul>
      )}
    </div>
  );
}
