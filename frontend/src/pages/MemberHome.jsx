/**
 * src/pages/MemberHome.jsx
 * ------------------------
 * PLACEHOLDER — Phase 2 only.
 * Confirm member login redirects here and non-members are blocked.
 * Replaced in Phase 8 with the real member self-service portal.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { placeholderStyles } from './AdminHome';

export default function MemberHome() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={placeholderStyles.page}>
      <div style={placeholderStyles.card}>
        <div style={placeholderStyles.badge}>Member</div>
        <h1 style={placeholderStyles.title}>Member Portal</h1>
        <p style={placeholderStyles.subtitle}>
          Phase 2 placeholder — real member portal coming in Phase 8.
        </p>
        <dl style={placeholderStyles.dl}>
          {[
            ['Username',  user?.username],
            ['Role',      user?.role],
            ['Member ID', user?.member_id],
          ].map(([k, v]) => (
            <div key={k} style={placeholderStyles.row}>
              <dt style={placeholderStyles.dt}>{k}</dt>
              <dd style={placeholderStyles.dd}>{v ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <button style={placeholderStyles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
