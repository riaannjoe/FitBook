/**
 * src/pages/admin/MaintenancePage.jsx
 * --------------------------------------
 * Admin Maintenance Requests page.
 *
 * ══════════════════ VERIFIED API CONTRACTS ══════════════════
 *
 * GET /maintenance?status=
 *   Auth: admin only
 *   Server-side filter: status ∈ {open, in_progress, resolved}
 *   No pagination.
 *   Response: [{
 *     request_id, equipment_id,
 *     reported_by  (user_id INT),
 *     issue        (VARCHAR 255),
 *     reported_date (DATE),
 *     status        ENUM('open','in_progress','resolved'),
 *     repair_cost   (DECIMAL, default 0),
 *     resolved_date (DATE | null),
 *     equipment     (VARCHAR — equipment.name joined),
 *     reported_by_name (VARCHAR — users.username joined)
 *   }]
 *   Ordered: reported_date DESC, request_id DESC
 *
 * POST /maintenance
 *   Auth: any logged-in user (authenticate only, no authorize)
 *   Required: equipment_id (INT), issue (VARCHAR)
 *   Backend: validates equipment exists, records req.user.id as reported_by
 *   DB TRIGGER: on INSERT → equipment.status set to 'under_repair'
 *   Response 201: { data: { request_id } }
 *   No DELETE endpoint exists.
 *
 * PUT /maintenance/:id
 *   Auth: admin only
 *   Required: status ∈ {open, in_progress, resolved}
 *   Optional: repair_cost (DECIMAL — defaults to 0 if omitted)
 *   DB TRIGGER: if status='resolved' → equipment.status set to 'working',
 *               resolved_date set to CURRENT_DATE
 *   Response 200: { updated: true }
 *   No DELETE endpoint for maintenance requests.
 *
 * ════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './MaintenancePage.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────
const MAINT_STATUSES = ['open', 'in_progress', 'resolved'];
function labelStatus(s) {
  if (s === 'in_progress') return 'In Progress';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtINR(v) {
  if (!v || Number(v) === 0) return '—';
  return `₹${Number(v).toLocaleString('en-IN')}`;
}
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
function Toast({ msg }) {
  if (!msg) return null;
  return <div className={styles.toast}>✓ {msg}</div>;
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

// ─── Report Issue Modal (POST /maintenance) ──────────────────────────────────
function ReportIssueModal({ equipment, onCreated, onClose }) {
  const [equipmentId, setEquipmentId] = useState('');
  const [issue,       setIssue]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function validate() {
    const err = {};
    if (!equipmentId)    err.equipment_id = 'Select a piece of equipment';
    if (!issue.trim())   err.issue        = 'Issue description is required';
    return err;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (Object.keys(err).length) { setFieldErrors(err); return; }

    setIsSaving(true);
    try {
      // POST /maintenance   required: equipment_id, issue
      // Backend sets reported_by = req.user.id (admin's user_id)
      // DB trigger: sets equipment.status = 'under_repair'
      const { data } = await api.post('/maintenance', {
        equipment_id: parseInt(equipmentId, 10),
        issue:        issue.trim(),
      });
      onCreated(data.request_id);
    } catch (err) {
      if (err.code === 'NOT_FOUND')
        setFieldErrors({ equipment_id: 'Equipment not found.' });
      else if (err.code === 'VALIDATION_ERROR' && err.details?.length)
        err.details.forEach(d => setFieldErrors(p => ({ ...p, [d.field]: d.message })));
      else
        setServerError(err.message ?? 'Failed to report issue. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="maint-create-title">
        <div className={styles.modalHeader}>
          <span id="maint-create-title" className={styles.modalTitle}>Report Maintenance Issue</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>
            {serverError && <div className={styles.formError}>{serverError}</div>}

            <div className={styles.field}>
              <label ref={firstRef} htmlFor="maint-equipment"
                     className={`${styles.label} ${styles.required}`}>Equipment</label>
              <select id="maint-equipment"
                      className={`${styles.select} ${fieldErrors.equipment_id ? styles.invalid : ''}`}
                      value={equipmentId}
                      onChange={e => { setEquipmentId(e.target.value); setFieldErrors(p => { const n = { ...p }; delete n.equipment_id; return n; }); }}
                      disabled={isSaving}>
                <option value="">Select equipment…</option>
                {equipment.map(eq => (
                  <option key={eq.equipment_id} value={eq.equipment_id}>
                    {eq.name} — {eq.category}
                  </option>
                ))}
              </select>
              {fieldErrors.equipment_id && (
                <span className={styles.fieldError}>{fieldErrors.equipment_id}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="maint-issue"
                     className={`${styles.label} ${styles.required}`}>Issue Description</label>
              <textarea id="maint-issue"
                        className={`${styles.textarea} ${fieldErrors.issue ? styles.invalid : ''}`}
                        value={issue}
                        onChange={e => { setIssue(e.target.value); setFieldErrors(p => { const n = { ...p }; delete n.issue; return n; }); }}
                        placeholder="Describe the problem clearly…"
                        rows={4} disabled={isSaving} />
              {fieldErrors.issue && <span className={styles.fieldError}>{fieldErrors.issue}</span>}
            </div>

            <div className={styles.triggerNote}>
              ⚡ Reporting an issue automatically sets the equipment status to <strong>Under Repair</strong>.
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Reporting…' : 'Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Update Status Modal (PUT /maintenance/:id) ──────────────────────────────
function UpdateStatusModal({ request, onUpdated, onClose }) {
  const [status,      setStatus]      = useState(request.status);
  const [repairCost,  setRepairCost]  = useState(
    request.repair_cost && Number(request.repair_cost) > 0
      ? String(request.repair_cost)
      : ''
  );
  const [fieldError,  setFieldError]  = useState('');
  const [serverError, setServerError] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError('');
    setServerError('');
    if (repairCost && (isNaN(Number(repairCost)) || Number(repairCost) < 0)) {
      setFieldError('Repair cost must be 0 or more.');
      return;
    }

    setIsSaving(true);
    try {
      // PUT /maintenance/:id   required: status   optional: repair_cost
      // If status='resolved': DB trigger sets equipment.status='working', resolved_date=CURRENT_DATE
      const body = { status };
      if (repairCost !== '') body.repair_cost = parseFloat(repairCost);
      await api.put(`/maintenance/${request.request_id}`, body);
      onUpdated(request.request_id, status);
    } catch (err) {
      if (err.code === 'NOT_FOUND')
        setServerError('Request not found — it may have been deleted.');
      else if (err.code === 'VALIDATION_ERROR')
        setServerError(err.message ?? 'Invalid status value.');
      else
        setServerError(err.message ?? 'Update failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="maint-upd-title">
        <div className={styles.modalHeader}>
          <div>
            <span id="maint-upd-title" className={styles.modalTitle}>
              Update Request #{request.request_id}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {request.equipment} — {request.issue.length > 60
                ? request.issue.slice(0, 60) + '…'
                : request.issue}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>
            {serverError && <div className={styles.formError}>{serverError}</div>}

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label htmlFor="maint-status"
                       className={`${styles.label} ${styles.required}`}>New Status</label>
                <select id="maint-status"
                        className={styles.select}
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        disabled={isSaving}>
                  {MAINT_STATUSES.map(s => (
                    <option key={s} value={s}>{labelStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="maint-repair-cost" className={styles.label}>Repair Cost (₹)</label>
                <input id="maint-repair-cost" type="number" min="0" step="100"
                       className={`${styles.input} ${fieldError ? styles.invalid : ''}`}
                       value={repairCost}
                       onChange={e => { setRepairCost(e.target.value); setFieldError(''); }}
                       placeholder="0" disabled={isSaving} />
                {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
              </div>
            </div>

            {status === 'resolved' && (
              <div className={styles.triggerNote}>
                ⚡ Resolving this request will automatically set the equipment status back
                to <strong>Working</strong> and record today as the resolved date.
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MaintenancePage ─────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const [requests,    setRequests]    = useState([]);
  const [loadStatus,  setLoadStatus]  = useState('loading');
  const [errMsg,      setErrMsg]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');  // '' = all
  const [equipment,   setEquipment]   = useState([]);
  const [modal,       setModal]       = useState(null);
  // null | {type:'create'} | {type:'update', request}
  const [toast,       setToast]       = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const fetchRequests = useCallback(async (statusF) => {
    setLoadStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (statusF) params.set('status', statusF);
      // GET /maintenance?status=
      // Returns: [{request_id, equipment_id, reported_by, issue, reported_date,
      //            status, repair_cost, resolved_date, equipment, reported_by_name}]
      const { data } = await api.get(`/maintenance?${params}`);
      setRequests(data);
      setLoadStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load maintenance requests.');
      setLoadStatus('error');
    }
  }, []);

  // Load equipment list for the create form
  useEffect(() => {
    api.get('/equipment')
      .then(res => setEquipment(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRequests(statusFilter); }, [statusFilter, fetchRequests]);

  // Count by status for tab badges
  const countByStatus = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  // When filter is active, the above counts only the filtered set — we track unfiltered for tabs
  // Simpler: just show badge on ALL tab as total

  function handleCreated(requestId) {
    setModal(null);
    showToast(`Issue reported — request #${requestId}. Equipment set to Under Repair.`);
    fetchRequests(statusFilter);
  }

  function handleUpdated(requestId, newStatus) {
    setModal(null);
    const msg = newStatus === 'resolved'
      ? `Request #${requestId} resolved. Equipment set back to Working.`
      : `Request #${requestId} updated to "${labelStatus(newStatus)}".`;
    showToast(msg);
    fetchRequests(statusFilter);
  }

  const TABS = [
    { label: 'All',         value: '' },
    { label: 'Open',        value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved',    value: 'resolved' },
  ];

  return (
    <div>
      <Toast msg={toast} />

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Maintenance</h1>
          <p className={styles.pageSubtitle}>
            Equipment issue tracking — report, track, and resolve maintenance requests
          </p>
        </div>
        <button className={styles.reportBtn} onClick={() => setModal({ type: 'create' })}>
          <PlusIcon /> Report Issue
        </button>
      </div>

      {/* Status filter tab bar */}
      <div className={styles.filterTabs} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={statusFilter === tab.value}
            className={`${styles.filterTab} ${statusFilter === tab.value ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {loadStatus === 'success' && tab.value === '' && (
              <span className={styles.filterTabCount}>{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipment</th>
                <th>Issue</th>
                <th>Reported By</th>
                <th>Reported</th>
                <th>Status</th>
                <th>Repair Cost</th>
                <th>Resolved</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loadStatus === 'loading' && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skRow}>
                  {[20, 90, 130, 70, 70, 75, 55, 55, 65].map((w, j) => (
                    <td key={j}><div className={styles.skBar} style={{ height: 12, width: w }} /></td>
                  ))}
                </tr>
              ))}

              {/* Rows */}
              {loadStatus === 'success' && requests.map(r => (
                <tr key={r.request_id}>
                  <td className={styles.muted}>#{r.request_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.equipment}</div>
                    <div className={styles.muted}>#{r.equipment_id}</div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 220, lineHeight: 1.4 }}>
                      {r.issue.length > 80 ? r.issue.slice(0, 80) + '…' : r.issue}
                    </div>
                  </td>
                  <td className={styles.muted}>{r.reported_by_name}</td>
                  <td className={styles.muted}>{fmtDate(r.reported_date)}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[r.status]}`}>
                      <span className={styles.dot} />
                      {labelStatus(r.status)}
                    </span>
                  </td>
                  <td className={styles.muted}>{fmtINR(r.repair_cost)}</td>
                  <td className={styles.muted}>{fmtDate(r.resolved_date)}</td>
                  <td>
                    <button
                      className={styles.updateBtn}
                      onClick={() => setModal({ type: 'update', request: r })}
                      title="Update status"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Error */}
          {loadStatus === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Could not load requests</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn} onClick={() => fetchRequests(statusFilter)}>Retry</button>
            </div>
          )}

          {/* Empty */}
          {loadStatus === 'success' && requests.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>🔧</div>
              <div className={styles.stateTitle}>
                {statusFilter ? `No ${labelStatus(statusFilter)} requests` : 'No maintenance requests'}
              </div>
              <div className={styles.stateMsg}>
                {statusFilter
                  ? 'Try a different status filter.'
                  : 'Report an issue using the button above.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <ReportIssueModal
          equipment={equipment}
          onCreated={handleCreated}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'update' && (
        <UpdateStatusModal
          request={modal.request}
          onUpdated={handleUpdated}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
