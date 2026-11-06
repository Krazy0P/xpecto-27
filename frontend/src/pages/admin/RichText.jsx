import { useRef } from 'react';
import DOMPurify from 'dompurify';

const WRAP = [['B', 'Bold', '<strong>', '</strong>'], ['I', 'Italic', '<em>', '</em>'], ['U', 'Underline', '<u>', '</u>'], ['H2', 'Heading', '<h2>', '</h2>'], ['•', 'Bullet list', '<ul><li>', '</li></ul>']];

export default function RichText({ id, label, value, onChange }) {
  const ref = useRef(null);
  const emit = v => onChange(DOMPurify.sanitize(v));
  const wrap = (open, close) => {
    const el = ref.current, { selectionStart: a, selectionEnd: b, value: v } = el;
    const next = v.slice(0, a) + open + (v.slice(a, b) || 'text') + close + v.slice(b);
    emit(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + open.length, a + open.length + (b - a || 4)); });
  };
  const link = () => { const u = window.prompt('Link URL (https://…)'); if (u) wrap(`<a href="${u.replaceAll('"', '&quot;')}">`, '</a>'); };
  return (
    <div className="rich-wrap">
      <div className="rich-bar" role="toolbar" aria-label="Formatting">
        {WRAP.map(([t, l, o, c]) => <button key={t} type="button" aria-label={l} onClick={() => wrap(o, c)}>{t}</button>)}
        <button type="button" aria-label="Link" onClick={link}>🔗</button>
      </div>
      <textarea id={id} ref={ref} className="rich" rows={8} aria-label={label} value={value || ''} onChange={e => emit(e.target.value)} />
      <div className="rich" aria-label="Preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value || '') }} />
    </div>
  );
}
