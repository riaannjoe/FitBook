/**
 * src/pages/LoginPage.jsx
 * -----------------------
 * The public login screen. Two-column layout on desktop (branding left,
 * form right), single column on mobile.
 *
 * WHAT HAPPENS WHEN THE USER SUBMITS:
 *   1. Validate that both fields are non-empty (client-side, quick UX check).
 *   2. Set isSubmitting = true so the button shows a spinner and can't be
 *      clicked twice.
 *   3. Call api.post('/auth/login', { username, password }).
 *   4. The API client attaches Content-Type and (if present) the Bearer token,
 *      then parses the backend's { success, data, error } envelope.
 *   5a. Success → call auth.login(token, user) → context sets user in state
 *       → useEffect below watches user and redirects to the role home page.
 *   5b. Failure → catch block sets the error message shown to the user.
 *   6. isSubmitting resets in the finally block.
 *
 * BACKEND CONTRACT (verified from source):
 *   POST /auth/login
 *   Request body: { username: string, password: string }
 *   Success 200: { success: true, data: { token: string,
 *                  user: { id, username, role, member_id, trainer_id } } }
 *   Failure 401: { success: false, error: { code: 'INVALID_CREDENTIALS',
 *                  message: 'Invalid username or password' } }
 *   Rate limit:  30 requests / 15 min on this endpoint.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

// Map role → home path — used after login and in the redirect guard.
const ROLE_HOME = { admin: '/admin', trainer: '/trainer', member: '/member' };

export default function LoginPage() {
  const auth     = useAuth();
  const navigate = useNavigate();

  // Form field state
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');  // '' = no error

  // Focus the username input when the page first loads
  const usernameRef = useRef(null);
  useEffect(() => { usernameRef.current?.focus(); }, []);

  // If already logged in, redirect away immediately
  useEffect(() => {
    if (auth.user) {
      navigate(ROLE_HOME[auth.user.role] ?? '/', { replace: true });
    }
  }, [auth.user, navigate]);

  // ── Form submission ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();   // stop the browser's default page-reload on submit
    setError('');         // clear any previous error message

    // Quick client-side check — avoids an unnecessary network request
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the real backend. api.post handles JSON serialisation and
      // parses the { success, data } envelope. On { success: false } it throws.
      const { data } = await api.post('/auth/login', {
        username: username.trim(),
        password,
        // Note: do NOT log `password` anywhere in this file.
      });

      // data = { token: "...", user: { id, username, role, member_id, trainer_id } }
      auth.login(data.token, data.user);
      // Redirect is handled by the useEffect above that watches auth.user.

    } catch (err) {
      // err.code is the backend's machine-readable code (e.g. INVALID_CREDENTIALS)
      // err.message is the human-readable message from the backend.
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('Invalid username or password. Please try again.');
      } else if (!navigator.onLine || err.message?.includes('fetch')) {
        setError('Cannot reach the server. Please check your connection.');
      } else {
        setError(err.message ?? 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          <div className={styles.brandLogo}>
            <DumbbellIcon size={36} />
            <span className={styles.brandName}>FitBook</span>
          </div>
          <h1 className={styles.brandTagline}>
            Smart Gym&nbsp;Management,<br />Simplified.
          </h1>
          <ul className={styles.featureList}>
            {[
              'Member & subscription management',
              'Trainer schedules and assignments',
              'Real-time attendance tracking',
              'Workout plans and exercise library',
              'Equipment and maintenance log',
              'Revenue reports and analytics',
            ].map(f => (
              <li key={f} className={styles.featureItem}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
        </div>
        {/* Decorative background element */}
        <div className={styles.brandGlow} />
      </div>

      {/* ── Right form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>

          {/* Mobile-only logo (the left panel is hidden on small screens) */}
          <div className={styles.mobileLogo}>
            <DumbbellIcon size={28} />
            <span className={styles.brandName}>FitBook</span>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSubtitle}>Sign in to your account</p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className={styles.errorBanner} role="alert">
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}

          {/* ── Login form ── */}
          <form onSubmit={handleSubmit} noValidate className={styles.form}>

            {/* Username */}
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>
                Username
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <UserIcon />
                </span>
                <input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  className={styles.input}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <><Spinner /> Signing in…</>
                : 'Sign In'}
            </button>

          </form>

          {/* Info note */}
          <p className={styles.hint}>
            Contact your administrator to create or reset your account.
          </p>

        </div>
      </div>
    </div>
  );
}

// ─── Small inline SVG icons ────────────────────────────────────────────────────
// Self-contained SVGs so there's no icon library dependency.

function DumbbellIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1"  y="10" width="3" height="4" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="4"  y="8"  width="3" height="8" rx="1" fill="currentColor" />
      <rect x="17" y="10" width="3" height="4" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="17" y="8"  width="3" height="8" rx="1" fill="currentColor" />
      <rect x="7"  y="11" width="10" height="2" rx="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px', height: '14px',
      border: '2px solid rgba(15,14,12,0.3)',
      borderTopColor: 'var(--text-on-gold)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      marginRight: '8px',
      verticalAlign: 'middle',
    }} />
  );
}
