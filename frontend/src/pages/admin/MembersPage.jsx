/**
 * src/pages/admin/MembersPage.jsx
 * --------------------------------
 * Full CRUD Members management page.
 *
 * VERIFIED API CONTRACTS (from memberRoutes.js, memberController.js, memberModel.js):
 *
 * GET /members?search=&status=&page=&limit=
 *   Response: { data: Member[], meta: { page, limit, total, pages } }
 *   Server-side search on full_name LIKE and phone LIKE (both in one query).
 *   Status filter: 'active' | 'expired' | 'suspended'
 *
 * GET /members/:id
 *   Response: { data: Member }
 *
 * POST /members
 *   Required: full_name, gender (M|F|O), dob (YYYY-MM-DD), phone
 *   Optional: email, address, emergency_contact, user_id
 *   Success 201: { data: { member_id } }
 *   Error 400: { error: { code: 'VALIDATION_ERROR', details: [{field, message}] } }
 *   Error 409: { error: { code: 'DUPLICATE' } }  ← phone or email already exists
 *
 * PUT /members/:id
 *   UPDATABLE fields: full_name, gender, dob, phone, email,
 *                     address, emergency_contact, status
 *   Success 200: { data: Member }  ← returns full updated record
 *   Error 409: DUPLICATE
 *
 * DELETE /members/:id
 *   Success 200: { data: { deleted: true } }
 *   Error 409: IN_USE  ← member has payments/subscriptions, cannot delete
 *
 * Member object fields:
 *   member_id, user_id, full_name, gender, dob, phone, email,
 *   address, emergency_contact, join_date, status
 *
 * COMPONENT STRUCTURE:
 *   MembersPage            ← list + toolbar + pagination + state management
 *   ├─ MemberFormModal     ← create / edit form (reused)
 *   ├─ MemberDetailModal   ← read-only detail view
 *   └─ DeleteConfirmModal  ← delete confirmation
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './MembersPage.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GENDER_OPTIONS  = ['M', 'F', 'O'];
const GENDER_LABEL    = { M: 'Male', F: 'Female', O: 'Other' };
const STATUS_OPTIONS  = ['active', 'expired', 'suspended'];
const PAGE_SIZE       = 20;  // matches backend default

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  // d arrives from API as 'YYYY-MM-DD' string (dateStrings: true in db.js)
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob + 'T00:00:00').getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// ─── Small shared components ───────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] ?? ''}`}>
      <span className={styles.dot} />
      {status}
    </span>
  );
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({ member, onConfirm, onClose, isDeleting, error }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="del-title">
        <div className={styles.deleteModal}>
          <div className={styles.deleteWarning}>⚠️</div>
          <h2 id="del-title" className={styles.deleteTitle}>Delete Member</h2>
          <p className={styles.deleteMsg}>
            You are about to permanently delete{' '}
            <span className={styles.deleteName}>{member.full_name}</span>{' '}
            (ID #{member.member_id}).
          </p>
          <p className={styles.deleteNote}>
            If this member has linked subscriptions, payments, or attendance records
            the backend will refuse the deletion and show an error — no data will
            be lost.
          </p>
          {error && (
            <div className={styles.formError} style={{ marginBottom: 16, textAlign: 'left' }}>
              {error}
            </div>
          )}
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isDeleting}>
              Cancel
            </button>
            <button className={styles.deleteBtn} onClick={onConfirm} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              {isDeleting ? 'Deleting…' : 'Delete Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Member Detail Modal ───────────────────────────────────────────────────────
function MemberDetailModal({ member, onEdit, onClose }) {
  const details = [
    ['Member ID',          `#${member.member_id}`],
    ['Full Name',          member.full_name],
    ['Gender',             GENDER_LABEL[member.gender] ?? member.gender],
    ['Date of Birth',      fmtDate(member.dob)],
    ['Age',                calcAge(member.dob) != null ? `${calcAge(member.dob)} yrs` : '—'],
    ['Phone',              member.phone],
    ['Email',              member.email ?? '—'],
    ['Join Date',          fmtDate(member.join_date)],
    ['Status',             member.status],
    ['Address',            member.address ?? '—'],
    ['Emergency Contact',  member.emergency_contact ?? '—'],
    ['Linked User ID',     member.user_id ?? '—'],
  ];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="detail-title">
        <div className={styles.modalHeader}>
          <span id="detail-title" className={styles.modalTitle}>
            Member — {member.full_name}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.detailGrid}>
          {details.map(([label, value]) => (
            <div key={label} className={styles.detailItem}>
              <div className={styles.detailLabel}>{label}</div>
              <div className={styles.detailValue}>
                {label === 'Status'
                  ? <StatusBadge status={value} />
                  : value}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.detailActions}>
          <button className={styles.outlineBtn} onClick={onEdit}>Edit Member</button>
          <button className={styles.cancelBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Member Form Modal (create + edit) ────────────────────────────────────────
function MemberFormModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial);

  // Form state — all fields as strings (HTML inputs are always strings)
  const [form, setForm] = useState({
    full_name:         initial?.full_name         ?? '',
    gender:            initial?.gender            ?? '',
    dob:               initial?.dob               ?? '',
    phone:             initial?.phone             ?? '',
    email:             initial?.email             ?? '',
    address:           initial?.address           ?? '',
    emergency_contact: initial?.emergency_contact ?? '',
    status:            initial?.status            ?? 'active',  // edit only
  });

  const [fieldErrors, setFieldErrors] = useState({});  // { field: message }
  const [serverError, setServerError] = useState('');
  const [isSaving,   setIsSaving]     = useState(false);

  // Focus first input on open
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    // Clear that field's validation error when the user starts typing
    setFieldErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setServerError('');
  }

  // Client-side validation mirrors the backend's required/enum rules
  function validate() {
    const errors = {};
    if (!form.full_name.trim()) errors.full_name = 'Full name is required';
    if (!form.gender)           errors.gender    = 'Gender is required';
    if (!form.dob)              errors.dob       = 'Date of birth is required';
    if (!form.phone.trim())     errors.phone     = 'Phone number is required';
    if (form.phone && !/^\d{10,15}$/.test(form.phone.trim()))
      errors.phone = 'Phone must be 10–15 digits';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Enter a valid email address';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    // Build the request body — only send non-empty optional fields
    const body = {
      full_name: form.full_name.trim(),
      gender:    form.gender,
      dob:       form.dob,
      phone:     form.phone.trim(),
    };
    if (form.email.trim())             body.email             = form.email.trim();
    if (form.address.trim())           body.address           = form.address.trim();
    if (form.emergency_contact.trim()) body.emergency_contact = form.emergency_contact.trim();
    if (isEdit)                        body.status            = form.status;

    setIsSaving(true);
    try {
      let result;
      if (isEdit) {
        // PUT /members/:id  returns the full updated member object
        const { data } = await api.put(`/members/${initial.member_id}`, body);
        result = data;
      } else {
        // POST /members  returns { member_id }
        const { data } = await api.post('/members', body);
        result = data;
      }
      onSave(result);  // parent reloads the list and closes modal
    } catch (err) {
      // The backend sends field-level details for VALIDATION_ERROR
      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const ferrs = {};
        err.details.forEach(d => { ferrs[d.field] = d.message; });
        setFieldErrors(ferrs);
      } else if (err.code === 'DUPLICATE') {
        setServerError('A member with this phone number or email already exists.');
      } else {
        setServerError(err.message ?? 'Save failed. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  const F = ({ name, label, required, children }) => (
    <div className={styles.field}>
      <label htmlFor={`f-${name}`}
             className={`${styles.label} ${required ? styles.required : ''}`}>
        {label}
      </label>
      {children}
      {fieldErrors[name] && (
        <span className={styles.fieldError}>{fieldErrors[name]}</span>
      )}
    </div>
  );

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="form-title">
        <div className={styles.modalHeader}>
          <span id="form-title" className={styles.modalTitle}>
            {isEdit ? `Edit — ${initial.full_name}` : 'Add New Member'}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>

            {serverError && (
              <div className={styles.formError}>{serverError}</div>
            )}

            {/* Row 1: Full name (full width) */}
            <F name="full_name" label="Full Name" required>
              <input
                ref={firstRef}
                id="f-full_name"
                type="text"
                className={`${styles.input} ${fieldErrors.full_name ? styles.invalid : ''}`}
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="e.g. Aarav Patel"
                disabled={isSaving}
                maxLength={100}
              />
            </F>

            {/* Row 2: Gender + DOB */}
            <div className={styles.formRow}>
              <F name="gender" label="Gender" required>
                <select
                  id="f-gender"
                  className={`${styles.select} ${fieldErrors.gender ? styles.invalid : ''}`}
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map(g => (
                    <option key={g} value={g}>{GENDER_LABEL[g]}</option>
                  ))}
                </select>
              </F>

              <F name="dob" label="Date of Birth" required>
                <input
                  id="f-dob"
                  type="date"
                  className={`${styles.input} ${fieldErrors.dob ? styles.invalid : ''}`}
                  value={form.dob}
                  onChange={e => set('dob', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={isSaving}
                />
              </F>
            </div>

            {/* Row 3: Phone + Email */}
            <div className={styles.formRow}>
              <F name="phone" label="Phone" required>
                <input
                  id="f-phone"
                  type="tel"
                  className={`${styles.input} ${fieldErrors.phone ? styles.invalid : ''}`}
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="10–15 digit number"
                  disabled={isSaving}
                  maxLength={15}
                />
              </F>

              <F name="email" label="Email">
                <input
                  id="f-email"
                  type="email"
                  className={`${styles.input} ${fieldErrors.email ? styles.invalid : ''}`}
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="optional"
                  disabled={isSaving}
                  maxLength={100}
                />
              </F>
            </div>

            {/* Row 4: Address */}
            <F name="address" label="Address">
              <input
                id="f-address"
                type="text"
                className={styles.input}
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="optional"
                disabled={isSaving}
                maxLength={255}
              />
            </F>

            {/* Row 5: Emergency contact + Status (edit only) */}
            <div className={styles.formRow}>
              <F name="emergency_contact" label="Emergency Contact">
                <input
                  id="f-emergency_contact"
                  type="tel"
                  className={styles.input}
                  value={form.emergency_contact}
                  onChange={e => set('emergency_contact', e.target.value)}
                  placeholder="optional"
                  disabled={isSaving}
                  maxLength={15}
                />
              </F>

              {isEdit && (
                <F name="status" label="Status">
                  <select
                    id="f-status"
                    className={styles.select}
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    disabled={isSaving}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </F>
              )}
            </div>

          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn}
                    onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MembersPage ───────────────────────────────────────────────────────────────
export default function MembersPage() {
  // ── List state ─────────────────────────────────────────────────────────────
  const [members,  setMembers]  = useState([]);
  const [meta,     setMeta]     = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
  const [status,   setStatus]   = useState('loading');  // 'loading'|'success'|'error'
  const [errMsg,   setErrMsg]   = useState('');

  // ── Toolbar state ──────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');   // '' = all statuses
  const [page,     setPage]     = useState(1);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);
  // modal = null | { type: 'create' } | { type: 'edit', member }
  //       | { type: 'detail', member } | { type: 'delete', member }
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting,  setIsDeleting]  = useState(false);

  // ── Feedback banner ────────────────────────────────────────────────────────
  const [toast, setToast] = useState('');  // '' = hidden

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // ── Fetch members ──────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (pg = page, q = search, st = filter) => {
    setStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (q.trim())  params.set('search', q.trim());
      if (st)        params.set('status', st);

      // GET /api/v1/members?page=&limit=&search=&status=
      // Response: { data: Member[], meta: { page, limit, total, pages } }
      const { data, meta: m } = await api.get(`/members?${params}`);
      setMembers(data);
      setMeta(m);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load members.');
      setStatus('error');
    }
  }, [page, search, filter]);

  // Refetch when page, search query, or status filter changes.
  // We use a debounce delay for the search to avoid hammering the API on each keystroke.
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchMembers(1, search, filter);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, filter]);  // eslint-disable-line react-hooks/exhaustive-deps

  // When only page changes (not search), fetch immediately
  useEffect(() => {
    fetchMembers(page, search, filter);
  }, [page]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── After create/edit ──────────────────────────────────────────────────────
  function handleSaved(result) {
    const isNew = !modal?.member;
    setModal(null);
    showToast(isNew ? 'Member added successfully.' : 'Member updated successfully.');
    // Reload the current page to reflect the change
    fetchMembers(page, search, filter);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleteError('');
    setIsDeleting(true);
    try {
      await api.delete(`/members/${modal.member.member_id}`);
      setModal(null);
      showToast(`${modal.member.full_name} has been deleted.`);
      // If the current page is now empty and we're not on page 1, go back one page
      const newTotal = meta.total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      fetchMembers(Math.min(page, maxPage), search, filter);
    } catch (err) {
      if (err.code === 'IN_USE') {
        setDeleteError(
          'Cannot delete: this member has linked subscriptions, payments, or attendance records. ' +
          'Update their status to "suspended" instead.'
        );
      } else {
        setDeleteError(err.message ?? 'Delete failed. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          background: '#1a2e1a', border: '1px solid #4ade80', color: '#4ade80',
          borderRadius: 'var(--radius-sm)', padding: '12px 20px',
          fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn 0.2s ease',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Members</h1>
          <p className={styles.pageSubtitle}>
            Manage gym member profiles and account status
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setModal({ type: 'create' })}>
          <PlusIcon /> Add Member
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Gender / Age</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading: 6 skeleton rows */}
              {status === 'loading' && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className={styles.skeletonRow}>
                    {[18, 120, 60, 90, 130, 70, 60, 60].map((w, j) => (
                      <td key={j}>
                        <div className={styles.skeletonBar} style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              )}

              {/* Success: real rows */}
              {status === 'success' && members.map(m => (
                <tr key={m.member_id}>
                  <td className={styles.muted}>#{m.member_id}</td>
                  <td>
                    <strong style={{ fontSize: 14 }}>{m.full_name}</strong>
                  </td>
                  <td className={styles.muted}>
                    {GENDER_LABEL[m.gender] ?? m.gender}
                    {calcAge(m.dob) != null && `, ${calcAge(m.dob)}y`}
                  </td>
                  <td>{m.phone}</td>
                  <td className={styles.muted}>{m.email ?? '—'}</td>
                  <td className={styles.muted}>{fmtDate(m.join_date)}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => setModal({ type: 'detail', member: m })}
                        title="View details"
                        aria-label={`View ${m.full_name}`}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={() => setModal({ type: 'edit', member: m })}
                        title="Edit"
                        aria-label={`Edit ${m.full_name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.delete}`}
                        onClick={() => { setDeleteError(''); setModal({ type: 'delete', member: m }); }}
                        title="Delete"
                        aria-label={`Delete ${m.full_name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty / error / no-results states (rendered inside the table wrapper) */}
          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Failed to load members</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn}
                      onClick={() => fetchMembers(page, search, filter)}>
                Retry
              </button>
            </div>
          )}

          {status === 'success' && members.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>{search || filter ? '🔍' : '👥'}</div>
              <div className={styles.stateTitle}>
                {search || filter ? 'No matching members' : 'No members yet'}
              </div>
              <div className={styles.stateMsg}>
                {search || filter
                  ? 'Try a different search term or status filter.'
                  : 'Add your first member using the button above.'}
              </div>
            </div>
          )}
        </div>

        {/* Table footer: count + pagination */}
        {status === 'success' && members.length > 0 && (
          <div className={styles.tableFooter}>
            <span className={styles.resultCount}>
              {meta.total} member{meta.total !== 1 ? 's' : ''} total
              {(search || filter) && ' (filtered)'}
            </span>
            {meta.pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {meta.pages}
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= meta.pages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'create' && (
        <MemberFormModal
          initial={null}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <MemberFormModal
          initial={modal.member}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'detail' && (
        <MemberDetailModal
          member={modal.member}
          onEdit={() => setModal({ type: 'edit', member: modal.member })}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <DeleteConfirmModal
          member={modal.member}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function PlusIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EyeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EditIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function CloseIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
