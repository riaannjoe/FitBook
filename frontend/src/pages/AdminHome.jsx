/**
 * src/pages/AdminHome.jsx
 * -----------------------
 * PLACEHOLDER — Phase 2 only.
 * Purpose: confirm that admin login redirects here and that the
 * ProtectedRoute blocks non-admin users.
 * This file will be replaced in Phase 3 with the real admin dashboard.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminHome() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={placeholderStyles.page}>
      <div style={placeholderStyles.card}>
        <div style={placeholderStyles.badge}>Admin</div>
        <h1 style={placeholderStyles.title}>Admin Home</h1>
        <p style={placeholderStyles.subtitle}>
          Phase 2 placeholder — real dashboard coming in Phase 3.
        </p>
        <UserInfo user={user} />
        <button style={placeholderStyles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}

function UserInfo({ user }) {
  return (
    <dl style={placeholderStyles.dl}>
      {[
        ['Username', user?.username],
        ['Role',     user?.role],
        ['User ID',  user?.id],
      ].map(([k, v]) => (
        <div key={k} style={placeholderStyles.row}>
          <dt style={placeholderStyles.dt}>{k}</dt>
          <dd style={placeholderStyles.dd}>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// Shared minimal styles — all three placeholder pages use the same object.
export const placeholderStyles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg)', padding: '24px',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '40px 48px', maxWidth: '460px',
    width: '100%', boxShadow: 'var(--shadow-md)', textAlign: 'center',
  },
  badge: {
    display: 'inline-block', background: 'var(--gold-glow)',
    border: '1px solid var(--gold-dark)', color: 'var(--gold)',
    borderRadius: '20px', padding: '4px 16px', fontSize: '12px',
    fontWeight: '600', letterSpacing: '0.5px', marginBottom: '16px',
  },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' },
  dl: { textAlign: 'left', marginBottom: '28px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0',
         borderBottom: '1px solid var(--border)' },
  dt: { color: 'var(--text-muted)', fontSize: '13px' },
  dd: { color: 'var(--text)', fontSize: '13px', fontWeight: '500' },
  logoutBtn: {
    padding: '10px 28px', background: 'transparent', color: 'var(--gold)',
    border: '1px solid var(--gold)', borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
};
