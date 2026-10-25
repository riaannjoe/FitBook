/**
 * src/pages/admin/SubscriptionsPage.jsx
 * ----------------------------------------
 * Admin Subscriptions page.
 *
 * VERIFIED API CONTRACTS:
 *
 * POST /subscriptions          (admin only)
 *   Required: member_id (INT), plan_id (INT), method (cash|card|upi|netbanking)
 *   Calls stored proc sp_subscribe(member_id, plan_id, method) in a transaction.
 *   Creates one subscription row + one payment row atomically.
 *   If member has an active plan, new plan starts when old one ends (renewal).
 *   Success 201: { data: { subscription_id, member_id, plan_id,
 *                           start_date, end_date, status, plan_name, price } }
 *   Errors: 404 NOT_FOUND (member or plan missing),
 *            400/409 from stored proc (date/amount checks)
 *
 * GET /subscriptions/expiring?days=N   (admin only)
 *   Returns: { data: [{ member_id, full_name, phone, end_date }] }
 *   Default: days=7
 *   Filters: active subscriptions expiring within N calendar days.
 *
 * POST /subscriptions/expire-check     (admin only)
 *   MUTATES the database:
 *     1. Sets subscriptions.status='expired' where active AND end_date < today
 *     2. Sets members.status='expired' where active AND no remaining active subscription
 *   Returns: { data: { subscriptions_expired: N, members_expired: N } }
 *   This is safe to call repeatedly (idempotent in practice — re-running changes 0 rows
 *   once already run today). Exposed as an explicit admin action, NOT called on page load.
 *
 * NO global subscription list endpoint exists.
 * NO subscription cancel/delete endpoint exists.
 *
 * For the create form, members are fetched from GET /members?limit=100
 * and plans from GET /plans — both endpoints already used by other pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './SubscriptionsPage.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'netbanking'];
const METHOD_LABEL = {
  cash: 'Cash', card: 'Card (Debit/Credit)',
  upi: 'UPI', netbanking: 'Net Banking',
};

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr + 'T00:00:00') - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// ─── Expire-Check Confirm Modal ────────────────────────────────────────────────
function ExpireCheckModal({ onConfirm, onClose, isRunning, result }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="ec-title">
        <div className={styles.modalBody}>
          {result ? (
            <>
              <div className={styles.modalIcon}>✅</div>
              <h2 id="ec-title" className={styles.modalTitle}>Expiry check complete</h2>
              <div className={styles.expireResult}>
                <div>
                  <span className={styles.expireResultNum}>{result.subscriptions_expired}</span>
                  Subscriptions marked expired
                </div>
                <div>
                  <span className={styles.expireResultNum}>{result.members_expired}</span>
                  Members marked expired
                </div>
              </div>
              <div className={styles.modalActions} style={{ marginTop: 20 }}>
                <button className={styles.cancelBtn} onClick={onClose}>Close</button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.modalIcon}>⚙️</div>
              <h2 id="ec-title" className={styles.modalTitle}>Run Expiry Check?</h2>
              <p className={styles.modalMsg}>
                This will mark all overdue active subscriptions as <strong>expired</strong>,
                then mark members who have no remaining active subscription as <strong>expired</strong>.
                <br /><br />
                The operation is safe to repeat — it only affects records that are past their
                end date and still show as active.
              </p>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={onClose} disabled={isRunning}>
                  Cancel
                </button>
                <button className={styles.confirmBtn} onClick={onConfirm} disabled={isRunning}>
                  {isRunning && <Spinner />}
                  {isRunning ? 'Running…' : 'Run Expiry Check'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Subscription Form ──────────────────────────────────────────────────
function CreateSubscriptionForm({ members, plans, loadingDeps, onCreated }) {
  const [form, setForm] = useState({ member_id: '', plan_id: '', method: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,  setIsSaving]   = useState(false);
  const [lastResult, setLastResult] = useState(null);  // show after success

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setServerError('');
    setLastResult(null);
  }

  function validate() {
    const errors = {};
    if (!form.member_id) errors.member_id = 'Select a member';
    if (!form.plan_id)   errors.plan_id   = 'Select a plan';
    if (!form.method)    errors.method    = 'Select a payment method';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setLastResult(null);
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setIsSaving(true);
    try {
      // POST /subscriptions
      // Body: { member_id: INT, plan_id: INT, method: string }
      // Returns: { data: Subscription } — the newly created row joined with plan data
      const { data } = await api.post('/subscriptions', {
        member_id: parseInt(form.member_id, 10),
        plan_id:   parseInt(form.plan_id,   10),
        method:    form.method,
      });
      setLastResult(data);
      setForm({ member_id: '', plan_id: '', method: '' });
      setFieldErrors({});
      onCreated();  // notify parent to refresh expiring list
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const ferrs = {};
        err.details.forEach(d => { ferrs[d.field] = d.message; });
        setFieldErrors(ferrs);
      } else if (err.code === 'NOT_FOUND') {
        setServerError('Member or plan not found. Refresh the page and try again.');
      } else {
        setServerError(err.message ?? 'Create failed. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  const selectedPlan = plans.find(p => String(p.plan_id) === form.plan_id);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>Create / Renew Subscription</div>
        <div className={styles.cardSubtitle}>
          Select a member and plan — payment is created automatically
        </div>
      </div>
      <div className={styles.cardBody}>

        {/* Success result */}
        {lastResult && (
          <div className={styles.successBox}>
            <div className={styles.successTitle}>✓ Subscription created</div>
            {[
              ['Plan',       lastResult.plan_name],
              ['Start date', fmtDate(lastResult.start_date)],
              ['End date',   fmtDate(lastResult.end_date)],
              ['Amount paid', formatINR(lastResult.price)],
              ['Status',     lastResult.status],
            ].map(([k, v]) => (
              <div key={k} className={styles.successRow}>
                <span className={styles.successKey}>{k}</span>
                <span className={styles.successValue}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {serverError && (
          <div className={styles.formError}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Member select */}
          <div className={styles.field}>
            <label htmlFor="sub-member"
                   className={`${styles.label} ${styles.required}`}>
              Member
            </label>
            {loadingDeps ? (
              <div className={styles.skeletonBar} style={{ height: 40 }} />
            ) : (
              <select
                id="sub-member"
                className={`${styles.select} ${fieldErrors.member_id ? styles.invalid : ''}`}
                value={form.member_id}
                onChange={e => set('member_id', e.target.value)}
                disabled={isSaving}
              >
                <option value="">Select a member…</option>
                {members.map(m => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.full_name} — {m.phone}
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.member_id && (
              <span className={styles.fieldError}>{fieldErrors.member_id}</span>
            )}
          </div>

          {/* Plan select */}
          <div className={styles.field}>
            <label htmlFor="sub-plan"
                   className={`${styles.label} ${styles.required}`}>
              Membership Plan
            </label>
            {loadingDeps ? (
              <div className={styles.skeletonBar} style={{ height: 40 }} />
            ) : (
              <select
                id="sub-plan"
                className={`${styles.select} ${fieldErrors.plan_id ? styles.invalid : ''}`}
                value={form.plan_id}
                onChange={e => set('plan_id', e.target.value)}
                disabled={isSaving}
              >
                <option value="">Select a plan…</option>
                {plans.map(p => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_name} — {formatINR(p.price)} / {p.duration_months}mo
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.plan_id && (
              <span className={styles.fieldError}>{fieldErrors.plan_id}</span>
            )}
            {selectedPlan && (
              <span className={styles.hint}>
                ₹{Number(selectedPlan.price).toLocaleString('en-IN')} for {selectedPlan.duration_months} month{selectedPlan.duration_months !== 1 ? 's' : ''}.
                If member already has an active plan, the new one starts when that ends.
              </span>
            )}
          </div>

          {/* Payment method */}
          <div className={styles.field}>
            <label htmlFor="sub-method"
                   className={`${styles.label} ${styles.required}`}>
              Payment Method
            </label>
            <select
              id="sub-method"
              className={`${styles.select} ${fieldErrors.method ? styles.invalid : ''}`}
              value={form.method}
              onChange={e => set('method', e.target.value)}
              disabled={isSaving}
            >
              <option value="">Select method…</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{METHOD_LABEL[m]}</option>
              ))}
            </select>
            {fieldErrors.method && (
              <span className={styles.fieldError}>{fieldErrors.method}</span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSaving || loadingDeps}>
            {isSaving && <Spinner />}
            {isSaving ? 'Creating…' : 'Create Subscription'}
          </button>
        </form>

      </div>
    </div>
  );
}

// ─── Expiring Subscriptions Panel ─────────────────────────────────────────────
function ExpiringPanel({ refreshKey }) {
  const [days,   setDays]   = useState(7);
  const [items,  setItems]  = useState([]);
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  const fetchExpiring = useCallback(async (d) => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /subscriptions/expiring?days=N
      // Returns: [{ member_id, full_name, phone, end_date }]
      const { data } = await api.get(`/subscriptions/expiring?days=${d}`);
      setItems(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load.');
      setStatus('error');
    }
  }, []);

  // Refetch when days changes or refreshKey changes (after a subscription is created)
  useEffect(() => { fetchExpiring(days); }, [days, refreshKey, fetchExpiring]);

  function daysClass(d) {
    if (d <= 2) return styles.urgentDays;
    if (d <= 5) return styles.soonDays;
    return styles.okDays;
  }

  return (
    <div className={styles.card} style={{ minHeight: 300 }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>Expiring Subscriptions</div>
        <div className={styles.cardSubtitle}>
          Members whose active subscriptions expire soon
        </div>
      </div>
      <div className={styles.cardBody}>

        {/* Days selector */}
        <div className={styles.daysRow}>
          <span className={styles.daysLabel}>Expiring within:</span>
          <select
            className={styles.daysSelect}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            aria-label="Select days window"
          >
            {[3, 7, 14, 30].map(d => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className={styles.expiringItem} style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className={styles.skeletonBar} style={{ height: 14, width: '60%' }} />
                  <div className={styles.skeletonBar} style={{ height: 11, width: '40%' }} />
                </div>
                <div className={styles.skeletonBar} style={{ height: 14, width: 70 }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>⚠️</div>
            <div className={styles.stateMsg}>{errMsg}</div>
            <button className={styles.retryBtn} onClick={() => fetchExpiring(days)}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {status === 'success' && items.length === 0 && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>✅</div>
            <div className={styles.stateTitle}>All good!</div>
            <div className={styles.stateMsg}>
              No active subscriptions expiring in the next {days} days.
            </div>
          </div>
        )}

        {/* List */}
        {status === 'success' && items.length > 0 && (
          <div className={styles.expiringList}>
            {items.map(item => {
              const remaining = daysUntil(item.end_date);
              return (
                <div key={`${item.member_id}-${item.end_date}`}
                     className={styles.expiringItem}>
                  <div className={styles.expiringLeft}>
                    <div className={styles.expiringName}>{item.full_name}</div>
                    <div className={styles.expiringPhone}>{item.phone}</div>
                  </div>
                  <div className={styles.expiringRight}>
                    <div className={styles.expiringDate}>{fmtDate(item.end_date)}</div>
                    <div className={`${styles.expiringDays} ${daysClass(remaining)}`}>
                      {remaining === 0 ? 'expires today'
                        : remaining < 0 ? `${Math.abs(remaining)}d overdue`
                        : `${remaining}d left`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Expire Check Card ─────────────────────────────────────────────────────────
function ExpireCheckCard() {
  const [showModal, setShowModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result,    setResult]    = useState(null);
  const [lastRan,   setLastRan]   = useState(null);

  async function runCheck() {
    setIsRunning(true);
    try {
      // POST /subscriptions/expire-check
      // Mutates DB: marks overdue subscriptions + members as expired.
      // Returns: { subscriptions_expired: N, members_expired: N }
      const { data } = await api.post('/subscriptions/expire-check');
      setResult(data);
      setLastRan(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      setResult({ error: err.message ?? 'Check failed.' });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <div className={styles.expireCheckCard}>
        <div className={styles.expireCheckLeft}>
          <div className={styles.expireCheckTitle}>Expiry Check</div>
          <div className={styles.expireCheckDesc}>
            Marks overdue active subscriptions as <strong>expired</strong> and updates
            member statuses accordingly. Run this daily or on demand to keep statuses
            accurate. This is a safe, repeatable operation.
            {lastRan && (
              <> Last ran at <strong>{lastRan}</strong>.</>
            )}
          </div>
          {result && !result.error && (
            <div className={styles.expireResult} style={{ marginTop: 12 }}>
              <div>
                <span className={styles.expireResultNum}>{result.subscriptions_expired}</span>
                subscriptions expired
              </div>
              <div>
                <span className={styles.expireResultNum}>{result.members_expired}</span>
                members expired
              </div>
            </div>
          )}
          {result?.error && (
            <div className={styles.formError} style={{ marginTop: 12 }}>
              {result.error}
            </div>
          )}
        </div>
        <button
          className={styles.expireCheckBtn}
          onClick={() => { setResult(null); setShowModal(true); }}
          disabled={isRunning}
        >
          <GearIcon /> Run Expiry Check
        </button>
      </div>

      {showModal && (
        <ExpireCheckModal
          onConfirm={async () => { await runCheck(); }}
          onClose={() => setShowModal(false)}
          isRunning={isRunning}
          result={result}
        />
      )}
    </>
  );
}

// ─── SubscriptionsPage ─────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  // Members and plans for the create form dropdowns
  const [members,     setMembers]     = useState([]);
  const [plans,       setPlans]       = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  // A counter bumped after a successful create — triggers expiring list to refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // Load members (up to 100) and plans in parallel once on mount
  useEffect(() => {
    Promise.all([
      api.get('/members?limit=100'),
      api.get('/plans'),
    ]).then(([mRes, pRes]) => {
      setMembers(mRes.data);
      setPlans(pRes.data);
    }).catch(() => {
      // Non-fatal: form dropdowns will be empty; user sees skeleton
    }).finally(() => {
      setLoadingDeps(false);
    });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Subscriptions</h1>
          <p className={styles.pageSubtitle}>
            Create member subscriptions, track expiring plans, and run the expiry check
          </p>
        </div>
      </div>

      {/* Two-column: create form | expiring list */}
      <div className={styles.twoCol}>
        <CreateSubscriptionForm
          members={members}
          plans={plans}
          loadingDeps={loadingDeps}
          onCreated={() => setRefreshKey(k => k + 1)}
        />
        <ExpiringPanel refreshKey={refreshKey} />
      </div>

      {/* Full-width: expire check */}
      <ExpireCheckCard />
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
