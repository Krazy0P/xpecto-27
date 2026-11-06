import { Link } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';

// Display order of groups. Contract roles: Convenor | Co-Convenor | Team Head | Member
const GROUPS = [['Convenor', 'Convenor'], ['Co-Convenor', 'Co-Convenor'], ['Team Head', 'Team Heads'], ['Member', 'Members']];
const KNOWN = GROUPS.map(([role]) => role);

function Card({ m, isAdmin }) {
  return (
    <article className="tilt-card member" data-role={m.role}>
      {isAdmin && <Link to={`/admin?tab=team&id=${m.id}`} className="edit-pencil" aria-label={`Edit ${m.name}`}>✎</Link>}
      {m.photoUrl ? <img src={m.photoUrl} alt={`${m.name}, ${m.role}`} loading="lazy" decoding="async" className="member-photo" /> : <div className="member-photo ph" role="img" aria-label={`${m.name} (no photo)`}>{m.name.charAt(0)}</div>}
      <h3>{m.name}</h3>
      <p className="chip">{m.role}</p>
      <p className="muted">{m.department}</p>
      <div className="social">
        {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noreferrer noopener" aria-label={`${m.name} on LinkedIn`}>LinkedIn</a>}
        {m.email && <a href={`mailto:${m.email}`} aria-label={`Email ${m.name}`}>Email</a>}
      </div>
    </article>
  );
}

export default function Team() {
  const { data, error, reload } = useAsync(api.getTeam, []);
  const { isAdmin } = useAuth();
  return (
    <section className="page">
      <h1 className="page-title page-head">Team</h1>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : !data ? (
        <div className="grid-cards" aria-busy="true">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 300 }} />)}</div>
      ) : data.length === 0 ? <p>Team will be announced soon.</p> : GROUPS.map(([role, title]) => {
        const list = data.filter(m => role === 'Member' ? m.role === role || !KNOWN.includes(m.role) : m.role === role).sort((a, b) => a.order - b.order);
        return list.length > 0 && (
          <div key={role}>
            <h2 className="sec-title">{title}</h2>
            <div className="grid-cards">{list.map(m => <Card key={m.id} m={m} isAdmin={isAdmin} />)}</div>
          </div>
        );
      })}
    </section>
  );
}
