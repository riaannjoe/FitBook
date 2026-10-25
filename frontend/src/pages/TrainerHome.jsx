/**
 * src/pages/TrainerHome.jsx
 * -------------------------
 * PLACEHOLDER — Phase 2 only.
 * Confirm trainer login redirects here and non-trainers are blocked.
 * Replaced in Phase 5 with the real trainer dashboard.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { placeholderStyles } from './AdminHome';

export default function TrainerHome() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={placeholderStyles.page}>
      <div style={placeholderStyles.card}>
        <div style={placeholderStyles.badge}>Trainer</div>
        <h1 style={placeholderStyles.title}>Trainer Home</h1>
        <p style={placeholderStyles.subtitle}>
          Phase 2 placeholder — real trainer dashboard coming in Phase 5.
        </p>
        <dl style={placeholderStyles.dl}>
          {[
            ['Username',   user?.username],
            ['Role',       user?.role],
            ['Trainer ID', user?.trainer_id],
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
