/**
 * src/pages/admin/AttendancePage.jsx
 * -------------------------------------
 * Admin Attendance Management page.
 *
 * ══════════════════ VERIFIED API CONTRACTS ══════════════════
 *
 * All attendance endpoints require authorize('admin').
 *
 * POST /attendance/check-in
 *   Required: member_id (INT)
 *   Service checks (in order):
 *     1. Member exists               → 404 NOT_FOUND
 *     2. Member not suspended        → 403 MEMBER_SUSPENDED
 *     3. Member has active sub       → 400 NO_ACTIVE_MEMBERSHIP
 *     4. Member not already in       → 409 ALREADY_CHECKED_IN
 *   Success 201: { data: { attendance_id } }
 *
 * POST /attendance/check-out
 *   Required: member_id (INT)
 *   Check: open attendance row exists (check_out IS NULL)  → 404 NOT_CHECKED_IN
 *   Success 200: { data: { member_id } }
 *
 * GET /attendance?date=YYYY-MM-DD&member_id=&page=&limit=
 *   Server-side filters: date, member_id
 *   Paginated (default 20, max 100)
 *   Response: {
 *     data: [{
 *       attendance_id, member_id, check_in (DATETIME), check_out (DATETIME|NULL),
 *       full_name (joined from members)
 *     }],
 *     meta: { page, limit, total, pages }
 *   }
 *   check_out IS NULL  ←→  session is currently active
 *
 * GET /attendance/analytics
 *   No params.
 *   Response: {
 *     data: {
 *       byHour:    [{ hr: 0-23, visits: N }]   ordered hr ASC
 *       byWeekday: [{ day: 'Monday'…, visits: N }] ordered DAYOFWEEK ASC
 *       inactive:  [{ member_id, full_name, phone }]
 *                  — active members with NO attendance in last 30 days
 *     }
 *   }
 *
 * ════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import styles from './AttendancePage.module.css';

// ─── Formatters ─────────────────────────────────────────────────────────────────
function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}


function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function duration(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end   = checkOut ? new Date(checkOut) : new Date();
  const mins  = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtHour(hr) {
  // 0 → "12 AM", 13 → "1 PM" etc.
  if (hr === 0)  return '12 AM';
  if (hr < 12)   return `${hr} AM`;
  if (hr === 12) return '12 PM';
  return `${hr - 12} PM`;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// ─── Check-in / Check-out Panel ──────────────────────────────────────────────
function ActionPanel({ members, loadingMembers, onActionDone }) {
  const [inMember,  setInMember]  = useState('');
  const [outMember, setOutMember] = useState('');
  const [inMsg,     setInMsg]     = useState(null);   // {type:'success'|'error', text}
  const [outMsg,    setOutMsg]    = useState(null);
  const [checkingIn,  setCheckingIn]  = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  function clearMsg(which) {
    if (which === 'in')  setTimeout(() => setInMsg(null),  4000);
    if (which === 'out') setTimeout(() => setOutMsg(null), 4000);
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    if (!inMember) { setInMsg({ type: 'error', text: 'Select a member first.' }); return; }
    setCheckingIn(true);
    setInMsg(null);
    try {
      // POST /attendance/check-in   { member_id: INT }
      // Success 201: { data: { attendance_id } }
      const { data } = await api.post('/attendance/check-in', {
        member_id: parseInt(inMember, 10),
      });
      setInMsg({ type: 'success', text: `✓ Checked in — visit #${data.attendance_id}` });
      setInMember('');
      clearMsg('in');
      onActionDone();
    } catch (err) {
      const map = {
        ALREADY_CHECKED_IN:    'Member is already checked in.',
        NO_ACTIVE_MEMBERSHIP:  'No active membership — subscribe before checking in.',
        MEMBER_SUSPENDED:      'Member is suspended and cannot check in.',
        NOT_FOUND:             'Member not found.',
      };
      setInMsg({ type: 'error', text: map[err.code] ?? err.message ?? 'Check-in failed.' });
      clearMsg('in');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut(e) {
    e.preventDefault();
    if (!outMember) { setOutMsg({ type: 'error', text: 'Select a member first.' }); return; }
    setCheckingOut(true);
    setOutMsg(null);
    try {
      // POST /attendance/check-out   { member_id: INT }
      // Success 200: { data: { member_id } }
      await api.post('/attendance/check-out', {
        member_id: parseInt(outMember, 10),
      });
      setOutMsg({ type: 'success', text: '✓ Checked out successfully.' });
      setOutMember('');
      clearMsg('out');
      onActionDone();
    } catch (err) {
      const map = {
        NOT_CHECKED_IN: 'Member has no open check-in today.',
        NOT_FOUND:      'Member not found.',
      };
      setOutMsg({ type: 'error', text: map[err.code] ?? err.message ?? 'Check-out failed.' });
      clearMsg('out');
    } finally {
      setCheckingOut(false);
    }
  }

  const selectProps = (val, setter) => ({
    className: styles.memberSelect,
    value: val,
    onChange: e => setter(e.target.value),
    disabled: loadingMembers || checkingIn || checkingOut,
  });

  const MemberOptions = () => (
    <>
      <option value="">Select member…</option>
      {members.map(m => (
        <option key={m.member_id} value={m.member_id}>
          {m.full_name} — {m.phone}
        </option>
      ))}
    </>
  );

  return (
    <div className={styles.actionCard}>
      {/* Check-in */}
      <div className={styles.actionPanel}>
        <div>
          <div className={styles.actionPanelTitle}>Check In</div>
          <div className={styles.actionPanelSub}>
            Requires an active subscription. Suspended members and already-checked-in members are blocked.
          </div>
        </div>
        <form onSubmit={handleCheckIn} noValidate>
          <div className={styles.actionRow}>
            <select {...selectProps(inMember, setInMember)}>
              <MemberOptions />
            </select>
            <button type="submit" className={styles.checkInBtn}
                    disabled={checkingIn || loadingMembers}>
              {checkingIn ? <Spinner /> : <CheckInIcon />}
              {checkingIn ? 'Checking…' : 'Check In'}
            </button>
          </div>
        </form>
        {inMsg && (
          <div className={`${styles.actionMsg} ${styles[inMsg.type]}`}>
            {inMsg.text}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={styles.actionDivider} />

      {/* Check-out */}
      <div className={styles.actionPanel}>
        <div>
          <div className={styles.actionPanelTitle}>Check Out</div>
          <div className={styles.actionPanelSub}>
            Only works if the member has an open (un-closed) check-in session.
          </div>
        </div>
        <form onSubmit={handleCheckOut} noValidate>
          <div className={styles.actionRow}>
            <select {...selectProps(outMember, setOutMember)}>
              <MemberOptions />
            </select>
            <button type="submit" className={styles.checkOutBtn}
                    disabled={checkingOut || loadingMembers}>
              {checkingOut ? <Spinner /> : <CheckOutIcon />}
              {checkingOut ? 'Checking…' : 'Check Out'}
            </button>
          </div>
        </form>
        {outMsg && (
          <div className={`${styles.actionMsg} ${styles[outMsg.type]}`}>
            {outMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attendance Records Table ─────────────────────────────────────────────────
function RecordsTable({ members }) {
  // Filters — server-side date and member_id, paginated
  const [dateFilter,   setDateFilter]   = useState(todayISO());
  const [memberFilter, setMemberFilter] = useState('');
  const [page,         setPage]         = useState(1);

  const [records, setRecords] = useState([]);
  const [meta,    setMeta]    = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [status,  setStatus]  = useState('loading');
  const [errMsg,  setErrMsg]  = useState('');

  const fetchRecords = useCallback(async (pg, date, memberId) => {
    setStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 });
      if (date)     params.set('date', date);
      if (memberId) params.set('member_id', memberId);

      // GET /attendance?date=&member_id=&page=&limit=
      const { data, meta: m } = await api.get(`/attendance?${params}`);
      setRecords(data);
      setMeta(m);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load records.');
      setStatus('error');
    }
  }, []);

  // Refetch when filters or page change
  useEffect(() => {
    fetchRecords(page, dateFilter, memberFilter);
  }, [page, dateFilter, memberFilter, fetchRecords]);

  function applyFilters(date, memberId) {
    setDateFilter(date);
    setMemberFilter(memberId);
    setPage(1);
  }

  function clearFilters() {
    setDateFilter('');
    setMemberFilter('');
    setPage(1);
  }

  // Expose a refresh method upward via the exported component being re-mounted won't work,
  // so we use a simple key prop from the parent
  return (
    <div>
      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="att-date">Date</label>
          <input
            id="att-date"
            type="date"
            className={styles.filterInput}
            value={dateFilter}
            onChange={e => applyFilters(e.target.value, memberFilter)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="att-member">Member</label>
          <select
            id="att-member"
            className={styles.filterSelect}
            value={memberFilter}
            onChange={e => applyFilters(dateFilter, e.target.value)}
          >
            <option value="">All members</option>
            {members.map(m => (
              <option key={m.member_id} value={m.member_id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <button className={styles.clearBtn} onClick={clearFilters}>
          Clear
        </button>
        {status === 'success' && (
          <span className={styles.countText}>
            {meta.total} record{meta.total !== 1 ? 's' : ''}
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
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {status === 'loading' && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={styles.skRow}>
                  {[24, 110, 100, 100, 55, 65].map((w, j) => (
                    <td key={j}><div className={styles.skBar} style={{ height: 12, width: w }} /></td>
                  ))}
                </tr>
              ))}

              {/* Rows */}
              {status === 'success' && records.map(r => {
                const active = r.check_out === null;
                return (
                  <tr key={r.attendance_id}>
                    <td className={styles.muted}>#{r.attendance_id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                      <div className={styles.muted}>#{r.member_id}</div>
                    </td>
                    <td>
                      <div>{fmtTime(r.check_in)}</div>
                      <div className={styles.muted}>
                        {new Date(r.check_in).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short',
                        })}
                      </div>
                    </td>
                    <td className={active ? styles.muted : undefined}>
                      {active ? '—' : fmtTime(r.check_out)}
                    </td>
                    <td className={styles.muted}>
                      {duration(r.check_in, r.check_out)}
                      {active && ' (live)'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${active ? styles.active : styles.completed}`}>
                        <span className={styles.dot} />
                        {active ? 'Active' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Could not load records</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn}
                      onClick={() => fetchRecords(page, dateFilter, memberFilter)}>
                Retry
              </button>
            </div>
          )}

          {status === 'success' && records.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>📋</div>
              <div className={styles.stateTitle}>No records found</div>
              <div className={styles.stateMsg}>
                {dateFilter
                  ? `No attendance on ${dateFilter}.`
                  : 'No attendance records match the current filter.'}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {status === 'success' && meta.pages > 1 && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>{meta.total} total</span>
              <div className={styles.pageControls}>
                <button className={styles.pageBtn}
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span className={styles.pageCurrent}>Page {page} of {meta.pages}</span>
                <button className={styles.pageBtn}
                        disabled={page >= meta.pages}
                        onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pure CSS bar chart ────────────────────────────────────────────────────────
function BarChart({ rows, labelKey, valueKey, labelFn }) {
  if (!rows?.length) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No data.</p>;
  }
  const max = Math.max(...rows.map(r => Number(r[valueKey])), 1);
  return (
    <div className={styles.barChart}>
      {rows.map((row, i) => (
        <div key={i} className={styles.barRow}>
          <span className={styles.barLabel}>{labelFn ? labelFn(row[labelKey]) : row[labelKey]}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill}
                 style={{ width: `${(Number(row[valueKey]) / max) * 100}%` }} />
          </div>
          <span className={styles.barValue}>{row[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Analytics Section ────────────────────────────────────────────────────────
function AnalyticsSection() {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /attendance/analytics
      // Returns: { byHour:[{hr,visits}], byWeekday:[{day,visits}], inactive:[{member_id,full_name,phone}] }
      const { data: d } = await api.get('/attendance/analytics');
      setData(d);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load analytics.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return (
    <div>
      <div className={styles.sectionTitle}>Attendance Analytics</div>

      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div className={styles.skBar} style={{ height: 180, borderRadius: 10 }} />
        </div>
      )}

      {status === 'error' && (
        <div className={styles.stateBox} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          <div className={styles.stateIcon}>⚠️</div>
          <div className={styles.stateMsg}>{errMsg}</div>
          <button className={styles.retryBtn} onClick={fetchAnalytics}>Retry</button>
        </div>
      )}

      {status === 'success' && data && (
        <>
          {/* Charts row: by hour + by weekday */}
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <div className={styles.analyticsCardHeader}>
                <div className={styles.analyticsCardTitle}>Visits by Hour of Day</div>
                <div className={styles.analyticsCardSub}>All-time check-ins grouped by hour</div>
              </div>
              <div className={styles.analyticsCardBody}>
                <BarChart
                  rows={data.byHour}
                  labelKey="hr"
                  valueKey="visits"
                  labelFn={fmtHour}
                />
              </div>
            </div>

            <div className={styles.analyticsCard}>
              <div className={styles.analyticsCardHeader}>
                <div className={styles.analyticsCardTitle}>Visits by Day of Week</div>
                <div className={styles.analyticsCardSub}>All-time check-ins grouped by weekday</div>
              </div>
              <div className={styles.analyticsCardBody}>
                <BarChart
                  rows={data.byWeekday}
                  labelKey="day"
                  valueKey="visits"
                  labelFn={d => d.slice(0, 3)}   // 'Monday' → 'Mon'
                />
              </div>
            </div>
          </div>

          {/* Inactive members — full width */}
          <div className={styles.analyticsCardFull}>
            <div className={styles.analyticsCardHeader}>
              <div className={styles.analyticsCardTitle}>
                Inactive Active Members — {data.inactive?.length ?? 0} member{(data.inactive?.length ?? 0) !== 1 ? 's' : ''}
              </div>
              <div className={styles.analyticsCardSub}>
                Active members with no attendance in the last 30 days
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {!data.inactive?.length ? (
                <p style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  All active members visited in the last 30 days. 🎉
                </p>
              ) : (
                <table className={styles.inactiveTable}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inactive.map(m => (
                      <tr key={m.member_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>#{m.member_id}</div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{m.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AttendancePage ───────────────────────────────────────────────────────────
export default function AttendancePage() {
  // Shared members list used by both ActionPanel and RecordsTable member filter
  const [members,      setMembers]      = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Bumped after a successful check-in or check-out to trigger RecordsTable refresh
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get('/members?limit=100')
      .then(res => setMembers(res.data))
      .catch(() => {})   // non-fatal — dropdowns will be empty
      .finally(() => setLoadingMembers(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Attendance</h1>
          <p className={styles.pageSubtitle}>
            Record member check-ins and check-outs, view daily logs, and monitor engagement
          </p>
        </div>
      </div>

      {/* Check-in / out actions */}
      <ActionPanel
        members={members}
        loadingMembers={loadingMembers}
        onActionDone={() => setRefreshKey(k => k + 1)}
      />

      {/* Attendance records table — re-mounts on refreshKey so it refetches today's data */}
      <div className={styles.sectionTitle}>Attendance Records</div>
      <RecordsTable key={refreshKey} members={members} />

      {/* Analytics — loaded once independently */}
      <AnalyticsSection />
    </div>
  );
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function CheckInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}

function CheckOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
