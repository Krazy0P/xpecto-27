import toast from 'react-hot-toast';
import api from '../../api';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import { useAdminError } from './util';

export default function AdminsTab() {
  const { data, error, reload } = useAsync(api.admin.admins, []);
  const fail = useAdminError();

  const remove = async (a) => {
    if (!window.confirm(`Remove admin access for ${a}?`)) return;
    try {
      await api.admin.removeAdmin(a);
      toast.success(`Removed admin access for ${a}`);
      reload();
    } catch (x) {
      fail(x);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  return (
    <div>
      <h2>Admin Accounts</h2>
      <div className="manga-panel" style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>🔒 Admin Provisioning Policy:</p>
        <p style={{ margin: '0.25rem 0', color: 'var(--color-muted, #aaa)' }}>
          To protect the fest platform, new admin accounts with password credentials can <b>only be created from the backend terminal</b>:
        </p>
        <code style={{ display: 'block', background: 'rgba(0,0,0,0.4)', padding: '0.6rem 0.8rem', borderRadius: '4px', margin: '0.5rem 0', color: '#00f0ff' }}>
          cd backend<br />
          cargo run -- create-admin &lt;email&gt; &lt;password&gt; [name]
        </code>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted, #888)' }}>
          You can also configure <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in <code>backend/.env</code> for automatic provisioning.
        </p>
      </div>

      {!data ? (
        <div className="skeleton" style={{ height: 80 }} />
      ) : data.length === 0 ? (
        <p>No admins found.</p>
      ) : (
        <ul className="reg-list">
          {data.map((a) => (
            <li key={a} className="manga-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{a}</b>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', borderRadius: '3px' }}>
                  ADMIN
                </span>
              </div>
              <button className="link-btn danger" onClick={() => remove(a)}>
                Revoke Admin
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
