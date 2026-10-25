/**
 * src/pages/admin/PaymentsPage.jsx
 * ----------------------------------
 * Admin Payments page — read-only payment ledger + revenue report.
 *
 * VERIFIED API CONTRACTS:
 *
 * GET /payments?member_id=&status=&page=&limit=    (admin only)
 *   Paginated via pagination utility (default limit=20, max=100).
 *   Server-side filters: member_id, status.
 *   Response: {
 *     data: [{
 *       payment_id, member_id, subscription_id,
 *       amount, payment_date, method, status,
 *       full_name          ← joined from members
 *     }],
 *     meta: { page, limit, total, pages }
 *   }
 *   Status values (from DB): 'paid' | 'pending' | 'failed'
 *   Method values: 'cash' | 'card' | 'upi' | 'netbanking'
 *   No CREATE, EDIT, or DELETE endpoint exists for payments.
 *
 * GET /reports/revenue    (admin only)
 *   Response: {
 *     data: {
 *       monthly: [{ month: 'YYYY-MM', txns: N, revenue: DECIMAL }],   ← ordered month DESC
 *       byPlan:  [{ plan_name, sold: N, revenue: DECIMAL }]            ← ordered revenue DESC
 *     }
 *   }
 *   Only counts payments WHERE status='paid'.
 *
 * LAYOUT:
 *   1. Revenue section (collapsed-by-default to avoid visual clutter)
 *      - Monthly revenue table (month, transactions, total)
 *      - By-plan revenue table (plan, subscriptions sold, total)
 *   2. Payments table with status filter dropdown + server-side pagination
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import styles from './PaymentsPage.module.css';

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtMonth(m) {
  // m = 'YYYY-MM'
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] ?? ''}`}>
      <span className={styles.dot} />
      {status}
    </span>
  );
}

// ─── Method chip ──────────────────────────────────────────────────────────────
function MethodChip({ method }) {
  return <span className={styles.methodChip}>{method}</span>;
}

// ─── Revenue Section ──────────────────────────────────────────────────────────
function RevenueSection() {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [open,   setOpen]   = useState(false);  // collapsed by default

  const fetchRevenue = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /reports/revenue
      // Returns: { monthly: [{month, txns, revenue}], byPlan: [{plan_name, sold, revenue}] }
      const { data: d } = await api.get('/reports/revenue');
      setData(d);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load revenue data.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  const totalRevenue = data?.monthly?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
  const totalTxns    = data?.monthly?.reduce((s, r) => s + Number(r.txns),    0) ?? 0;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Toggle header */}
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          marginBottom: open ? 14 : 0,
        }}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.sectionTitle} style={{ margin: 0 }}>
          Revenue Report
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {!open && status === 'success' && data && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {totalTxns} paid transaction{totalTxns !== 1 ? 's' : ''} ·{' '}
          total {formatINR(totalRevenue)} across {data.monthly?.length ?? 0} month{data.monthly?.length !== 1 ? 's' : ''}
        </p>
      )}

      {open && (
        <>
          {status === 'loading' && (
            <div className={styles.revenueGrid}>
              {[0, 1].map(i => (
                <div key={i} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.skBar}`} style={{ height: 14, width: '50%', borderRadius: 6 }} />
                  </div>
                  <table className={styles.revenueTable}>
                    <tbody>
                      {[0, 1, 2].map(j => (
                        <tr key={j} className={styles.skRevRow}>
                          <td><div className={styles.skBar} style={{ height: 11, width: '70%' }} /></td>
                          <td><div className={styles.skBar} style={{ height: 11, width: '40%' }} /></td>
                          <td><div className={styles.skBar} style={{ height: 11, width: '55%' }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn} onClick={fetchRevenue}>Retry</button>
            </div>
          )}

          {status === 'success' && data && (
            <div className={styles.revenueGrid}>

              {/* Monthly breakdown */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Monthly Revenue</div>
                  <div className={styles.cardSubtitle}>Paid payments grouped by month</div>
                </div>
                {data.monthly?.length === 0 ? (
                  <div className={styles.stateBox} style={{ padding: '24px' }}>
                    <div className={styles.stateMsg}>No revenue data yet.</div>
                  </div>
                ) : (
                  <table className={styles.revenueTable}>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Transactions</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map(row => (
                        <tr key={row.month}>
                          <td>{fmtMonth(row.month)}</td>
                          <td className={styles.mutedText}>{row.txns}</td>
                          <td className={styles.goldText}>{formatINR(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* By-plan breakdown */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Revenue by Plan</div>
                  <div className={styles.cardSubtitle}>Paid payments grouped by membership plan</div>
                </div>
                {data.byPlan?.length === 0 ? (
                  <div className={styles.stateBox} style={{ padding: '24px' }}>
                    <div className={styles.stateMsg}>No plan data yet.</div>
                  </div>
                ) : (
                  <table className={styles.revenueTable}>
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byPlan.map(row => (
                        <tr key={row.plan_name}>
                          <td>{row.plan_name}</td>
                          <td className={styles.mutedText}>{row.sold}</td>
                          <td className={styles.goldText}>{formatINR(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Payments Table ────────────────────────────────────────────────────────────
function PaymentsTable() {
  const [payments, setPayments] = useState([]);
  const [meta,     setMeta]     = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [status,   setStatus]   = useState('loading');
  const [errMsg,   setErrMsg]   = useState('');
  const [filter,   setFilter]   = useState('');    // '' = all statuses
  const [page,     setPage]     = useState(1);

  const fetchPayments = useCallback(async (pg, st) => {
    setStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 });
      if (st) params.set('status', st);

      // GET /payments?page=&limit=&status=
      // Response: { data: Payment[], meta: { page, limit, total, pages } }
      // Payment fields: payment_id, member_id, subscription_id,
      //                 amount, payment_date, method, status, full_name
      const { data, meta: m } = await api.get(`/payments?${params}`);
      setPayments(data);
      setMeta(m);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load payments.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchPayments(1, filter);
    setPage(1);
  }, [filter]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPayments(page, filter);
  }, [page]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.filterLabel}>Filter:</span>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter payments by status"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        {status === 'success' && (
          <span className={styles.countText}>
            {meta.total} payment{meta.total !== 1 ? 's' : ''}
            {filter && ` (${filter})`}
          </span>
        )}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {status === 'loading' && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={styles.skRow}>
                  {[20, 100, 60, 80, 55, 60, 40].map((w, j) => (
                    <td key={j}>
                      <div className={styles.skBar} style={{ height: 12, width: w }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Rows */}
              {status === 'success' && payments.map(p => (
                <tr key={p.payment_id}>
                  <td className={styles.muted}>#{p.payment_id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.full_name}</div>
                    <div className={styles.muted}>Member #{p.member_id}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    {formatINR(p.amount)}
                  </td>
                  <td className={styles.muted}>{fmtDate(p.payment_date)}</td>
                  <td><MethodChip method={p.method} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className={styles.muted}>#{p.subscription_id}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Failed to load payments</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn}
                      onClick={() => fetchPayments(page, filter)}>
                Retry
              </button>
            </div>
          )}

          {status === 'success' && payments.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>💳</div>
              <div className={styles.stateTitle}>
                {filter ? `No ${filter} payments` : 'No payments yet'}
              </div>
              <div className={styles.stateMsg}>
                {filter ? 'Try a different status filter.' : 'Payments appear here after subscriptions are created.'}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {status === 'success' && payments.length > 0 && meta.pages > 1 && (
          <div className={styles.tableFooter}>
            <span className={styles.resultCount}>
              {meta.total} total
            </span>
            <div className={styles.pagination}>
              <button className={styles.pageBtn}
                      onClick={() => setPage(p => p - 1)}
                      disabled={page <= 1}>
                ← Prev
              </button>
              <span className={styles.pageInfo}>Page {page} of {meta.pages}</span>
              <button className={styles.pageBtn}
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= meta.pages}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PaymentsPage ─────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Payments</h1>
          <p className={styles.pageSubtitle}>
            Payment ledger and revenue reports — read-only; payments are created automatically with subscriptions
          </p>
        </div>
      </div>

      <RevenueSection />

      <div className={styles.sectionTitle}>Payment Records</div>
      <PaymentsTable />
    </div>
  );
}
