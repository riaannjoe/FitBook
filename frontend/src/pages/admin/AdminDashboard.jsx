/**
 * src/pages/admin/AdminDashboard.jsx
 * ------------------------------------
 * The real admin dashboard page.
 *
 * API ENDPOINT:
 *   GET /api/v1/dashboard  (requires admin JWT)
 *
 * EXACT RESPONSE SHAPE (verified from v_dashboard SQL view in schema.sql):
 *   {
 *     active_memberships: number,   COUNT of subscriptions WHERE status='active' AND end_date >= TODAY
 *     monthly_revenue:    number,   SUM(amount) of paid payments in the current calendar month
 *     todays_attendance:  number,   COUNT of attendance rows WHERE DATE(check_in) = TODAY
 *     open_issues:        number    COUNT of maintenance_requests WHERE status != 'resolved'
 *   }
 *
 * No other fields exist on this endpoint. All four metrics are displayed.
 * We do not call any other endpoint to populate this page.
 *
 * LOADING STRATEGY:
 *   - While fetching: show 4 skeleton shimmer cards.
 *   - On success: render real metric cards with a fade-in animation.
 *   - On error: show an error box with a Retry button that re-runs the fetch.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import styles from './AdminDashboard.module.css';

// ─── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees.
 * e.g. 17500 → "₹17,500"
 * The `maximumFractionDigits: 0` removes decimal places for clean display.
 */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

/** Format today's date in a friendly way: "Sunday, 25 October 2026" */
function formatToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Stat card configuration ──────────────────────────────────────────────────
// Each entry maps one field from the API response to a visual card.
// `format` is a function that converts the raw number to a display string.
// `iconBg` uses a colour from our CSS variable palette.
function getCardDefs(data) {
  return [
    {
      key:     'active_memberships',
      label:   'Active Memberships',
      value:   data.active_memberships,
      format:  v => v.toLocaleString('en-IN'),
      desc:    'Subscriptions currently active and not yet expired',
      icon:    <MembershipIcon />,
      iconBg:  'rgba(74,222,128,0.12)',
      iconColor: '#4ade80',
    },
    {
      key:     'monthly_revenue',
      label:   'Monthly Revenue',
      value:   data.monthly_revenue,
      format:  v => formatINR(v),
      desc:    `Paid payments received in ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
      icon:    <RevenueIcon />,
      iconBg:  'var(--gold-glow)',
      iconColor: 'var(--gold)',
      small:   true,  // value string is longer; use a smaller font
    },
    {
      key:     'todays_attendance',
      label:   "Today's Attendance",
      value:   data.todays_attendance,
      format:  v => v.toLocaleString('en-IN'),
      desc:    'Check-ins recorded today',
      icon:    <AttendanceIcon />,
      iconBg:  'rgba(96,165,250,0.12)',
      iconColor: '#60a5fa',
    },
    {
      key:     'open_issues',
      label:   'Open Issues',
      value:   data.open_issues,
      format:  v => v.toLocaleString('en-IN'),
      desc:    'Maintenance requests not yet resolved',
      icon:    <IssueIcon />,
      iconBg:  data.open_issues > 0 ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.08)',
      iconColor: data.open_issues > 0 ? '#f87171' : '#4ade80',
    },
  ];
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.cardTop}>
        <div className={styles.skeletonBar} style={{ height: 12, width: '55%' }} />
        <div className={styles.skeletonBar} style={{ height: 36, width: 36, borderRadius: 9 }} />
      </div>
      <div className={styles.skeletonBar} style={{ height: 36, width: '40%' }} />
      <div className={styles.skeletonBar} style={{ height: 10, width: '70%' }} />
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, format, desc, icon, iconBg, iconColor, small }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardLabel}>{label}</span>
        <div className={styles.cardIcon} style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <div className={`${styles.cardValue} ${small ? styles.cardValueSmall : ''}`}>
        {format(value)}
      </div>
      <div className={styles.cardDesc}>{desc}</div>
    </div>
  );
}

// ─── AdminDashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();

  // `status` tracks the fetch lifecycle:  'loading' | 'success' | 'error'
  const [status, setStatus]   = useState('loading');
  const [metrics, setMetrics] = useState(null);   // holds the raw API data object
  const [errMsg,  setErrMsg]  = useState('');

  // ── Fetch function ────────────────────────────────────────────────────────
  // useCallback memoises it so the useEffect below doesn't re-run unnecessarily.
  const fetchDashboard = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /api/v1/dashboard
      // The api client adds Authorization: Bearer <token> automatically.
      // It returns { data: { active_memberships, monthly_revenue,
      //              todays_attendance, open_issues } }
      const { data } = await api.get('/dashboard');
      setMetrics(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load dashboard data.');
      setStatus('error');
    }
  }, []);

  // Run once when the component mounts, and again whenever fetchDashboard changes.
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Render ────────────────────────────────────────────────────────────────
  const cards = status === 'success' ? getCardDefs(metrics) : [];

  return (
    <div>

      {/* Page header */}
      <div className={styles.header}>
        <h1 className={styles.greeting}>
          Good {greeting()}, {user?.username} 👋
        </h1>
        <p className={styles.subtitle}>{formatToday()}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.grid}>
        {status === 'loading' && (
          <>{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</>
        )}

        {status === 'error' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className={styles.errorBox}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorTitle}>Could not load dashboard</div>
              <div className={styles.errorMsg}>{errMsg}</div>
              <button className={styles.retryBtn} onClick={fetchDashboard}>
                Retry
              </button>
            </div>
          </div>
        )}

        {status === 'success' && cards.map(c => (
          <StatCard key={c.key} {...c} />
        ))}
      </div>

      {/* ── Info panel — data definitions ── */}
      {status === 'success' && (
        <>
          <div className={styles.sectionTitle}>What these metrics mean</div>
          <div className={styles.infoGrid}>

            <div className={styles.infoCard}>
              <div className={styles.infoTitle}>Metric sources</div>
              {[
                ['Active memberships', 'subscriptions WHERE status=active AND end_date ≥ today'],
                ['Monthly revenue',    `SUM of paid payments in ${new Date().toLocaleString('en-IN', { month: 'long' })}`],
                ["Today's attendance", 'attendance rows WHERE check_in date = today'],
                ['Open issues',        'maintenance_requests WHERE status ≠ resolved'],
              ].map(([k, v]) => (
                <div key={k} className={styles.infoRow}>
                  <span className={styles.infoKey}>{k}</span>
                  <span className={styles.infoValue} style={{ fontSize: 11, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoTitle}>Quick summary</div>
              {[
                ['Revenue currency', 'Indian Rupees (₹)'],
                ['Attendance period', 'Current calendar day only'],
                ['Revenue period', `${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`],
                ['Data freshness', 'Live — fetched on each page load'],
              ].map(([k, v]) => (
                <div key={k} className={styles.infoRow}>
                  <span className={styles.infoKey}>{k}</span>
                  <span className={styles.infoValue}>{v}</span>
                </div>
              ))}
            </div>

          </div>
        </>
      )}

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
function MembershipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
