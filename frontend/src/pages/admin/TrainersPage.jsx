/**
 * src/pages/admin/TrainersPage.jsx
 * ----------------------------------
 * Admin Trainer Management page.
 *
 * ══════════════════ VERIFIED API CONTRACTS ══════════════════
 *
 * ── Trainer CRUD ─────────────────────────────────────────────
 * GET /trainers
 *   Auth: any logged-in user (authenticate middleware, no authorize).
 *   Response: [{
 *     trainer_id, user_id (nullable), full_name, phone,
 *     email (nullable), specialization (nullable),
 *     hire_date, salary (nullable — admin-only, stripped for trainer role),
 *     clients (INT — count of active assignments, added by GROUP BY)
 *   }]
 *   Ordered: full_name ASC. No pagination.
 *
 * POST /trainers (admin only)
 *   Required: full_name, phone, hire_date
 *   Optional: email, specialization, salary, user_id (links to existing user)
 *   Note: does NOT create a user account. user_id must reference an existing user.
 *   Returns: { trainer_id }
 *
 * GET /trainers/:id
 *   Returns single trainer (no clients count).
 *
 * PUT /trainers/:id (admin only)
 *   UPDATABLE: full_name, phone, email, specialization, hire_date, salary
 *   Returns: updated trainer (from findById — no clients count).
 *
 * DELETE /trainers/:id (admin only)
 *   Returns: { deleted: true }
 *   Fails 409 IN_USE: FK references from workout_plans or trainer_assignments exist.
 *
 * ── Schedules ────────────────────────────────────────────────
 * GET /trainers/:id/schedule
 *   Returns: [{ schedule_id, trainer_id, day_of_week, start_time, end_time }]
 *   Ordered: Mon→Sun, then start_time ASC.
 *
 * POST /trainers/:id/schedule (admin only)
 *   Required: day_of_week ∈ {Mon,Tue,Wed,Thu,Fri,Sat,Sun},
 *             start_time (HH:MM or HH:MM:SS), end_time (HH:MM or HH:MM:SS)
 *   UNIQUE constraint: (trainer_id, day_of_week, start_time)  → 409 DUPLICATE
 *   CHECK constraint: end_time > start_time (enforced by DB)
 *   Returns: { schedule_id }
 *
 * DELETE /trainers/:id/schedule/:slotId (admin only)
 *   Returns: { deleted: true }
 *
 * ── Clients ──────────────────────────────────────────────────
 * GET /trainers/:id/clients (admin or own trainer)
 *   Returns: [{
 *     member_id, full_name, gender, dob, phone, email,
 *     address, emergency_contact, join_date, status,
 *     assignment_id, assigned_date
 *   }]
 *   Only active assignments.
 *
 * ── Assignments ──────────────────────────────────────────────
 * POST /assignments (admin only)
 *   Required: trainer_id (INT), member_id (INT)
 *   Validates both exist. Returns: { assignment_id }
 *   DB UNIQUE constraint on (trainer_id, member_id, status='active')
 *   prevents duplicate active assignments — returns 409 DUPLICATE.
 *
 * PATCH /assignments/:id/end (admin only)
 *   Returns: { ended: true }
 *   Sets assignment status='ended'.
 *
 * No global assignment list endpoint exists.
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './TrainersPage.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtTime(t) {
  // t = 'HH:MM:SS' from DB
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function toInputTime(t) {
  // Convert 'HH:MM:SS' to 'HH:MM' for <input type="time">
  if (!t) return '';
  return t.slice(0, 5);
}

// ─── Shared ────────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div className={styles.toast}>✓ {msg}</div>;
}

// ─── Trainer Form Modal (create + edit) ───────────────────────────────────────
function TrainerFormModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial);

  const emptyForm = {
    full_name: '', phone: '', email: '',
    specialization: '', hire_date: '', salary: '',
  };

  const [form, setForm] = useState(
    isEdit ? {
      full_name:      initial.full_name      ?? '',
      phone:          initial.phone          ?? '',
      email:          initial.email          ?? '',
      specialization: initial.specialization ?? '',
      hire_date:      initial.hire_date      ?? '',
      salary:         initial.salary != null ? String(initial.salary) : '',
    } : emptyForm
  );

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,   setIsSaving]     = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setFieldErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setServerError('');
  }

  function validate() {
    const errors = {};
    if (!form.full_name.trim()) errors.full_name = 'Name is required';
    if (!form.phone.trim())     errors.phone     = 'Phone is required';
    else if (!/^\d{10,15}$/.test(form.phone.trim())) errors.phone = 'Enter 10–15 digits';
    if (!form.hire_date)        errors.hire_date = 'Hire date is required';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = 'Enter a valid email address';
    if (form.salary && (isNaN(Number(form.salary)) || Number(form.salary) < 0))
      errors.salary = 'Salary must be 0 or more';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    const body = {
      full_name:  form.full_name.trim(),
      phone:      form.phone.trim(),
      hire_date:  form.hire_date,
    };
    if (form.email.trim())          body.email          = form.email.trim();
    if (form.specialization.trim()) body.specialization = form.specialization.trim();
    if (form.salary !== '')         body.salary         = parseFloat(form.salary);

    setIsSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.put(`/trainers/${initial.trainer_id}`, body);
        onSave(data);
      } else {
        const { data } = await api.post('/trainers', body);
        onSave(data);
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const ferrs = {};
        err.details.forEach(d => { ferrs[d.field] = d.message; });
        setFieldErrors(ferrs);
      } else if (err.code === 'DUPLICATE') {
        setFieldErrors({ phone: 'A trainer with this phone already exists.' });
      } else {
        setServerError(err.message ?? 'Save failed. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Compact field component
  const F = ({ name, label, required, hint, children }) => (
    <div className={styles.field}>
      <label htmlFor={`f-${name}`}
             className={`${styles.label} ${required ? styles.required : ''}`}>
        {label}
      </label>
      {children}
      {hint && !fieldErrors[name] && <span className={styles.hint}>{hint}</span>}
      {fieldErrors[name] && <span className={styles.fieldError}>{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="tf-title">
        <div className={styles.modalHeader}>
          <span id="tf-title" className={styles.modalTitle}>
            {isEdit ? `Edit — ${initial.full_name}` : 'Add Trainer'}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>
            {serverError && <div className={styles.formError}>{serverError}</div>}

            <F name="full_name" label="Full Name" required>
              <input ref={firstRef} id="f-full_name" type="text"
                     className={`${styles.input} ${fieldErrors.full_name ? styles.invalid : ''}`}
                     value={form.full_name} onChange={e => set('full_name', e.target.value)}
                     placeholder="e.g. Rahul Sharma" disabled={isSaving} />
            </F>

            <div className={styles.formRow}>
              <F name="phone" label="Phone" required hint="10–15 digits">
                <input id="f-phone" type="tel"
                       className={`${styles.input} ${fieldErrors.phone ? styles.invalid : ''}`}
                       value={form.phone} onChange={e => set('phone', e.target.value)}
                       placeholder="e.g. 9712020001" disabled={isSaving} />
              </F>
              <F name="email" label="Email">
                <input id="f-email" type="email"
                       className={`${styles.input} ${fieldErrors.email ? styles.invalid : ''}`}
                       value={form.email} onChange={e => set('email', e.target.value)}
                       placeholder="trainer@fitbook.com" disabled={isSaving} />
              </F>
            </div>

            <F name="specialization" label="Specialization">
              <input id="f-specialization" type="text"
                     className={styles.input}
                     value={form.specialization}
                     onChange={e => set('specialization', e.target.value)}
                     placeholder="e.g. Strength Training, Yoga" disabled={isSaving} />
            </F>

            <div className={styles.formRow}>
              <F name="hire_date" label="Hire Date" required>
                <input id="f-hire_date" type="date"
                       className={`${styles.input} ${fieldErrors.hire_date ? styles.invalid : ''}`}
                       value={form.hire_date} onChange={e => set('hire_date', e.target.value)}
                       disabled={isSaving} />
              </F>
              <F name="salary" label="Monthly Salary (₹)"
                 hint="Leave blank if not set">
                <input id="f-salary" type="number" min="0" step="100"
                       className={`${styles.input} ${fieldErrors.salary ? styles.invalid : ''}`}
                       value={form.salary} onChange={e => set('salary', e.target.value)}
                       placeholder="e.g. 32000" disabled={isSaving} />
              </F>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn}
                    onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Trainer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ trainer, onConfirm, onClose, isDeleting, error }) {
  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="del-title">
        <div className={styles.deleteBody}>
          <div className={styles.deleteWarning}>⚠️</div>
          <h2 id="del-title" className={styles.deleteTitle}>Delete Trainer</h2>
          <p className={styles.deleteMsg}>
            Permanently delete{' '}
            <span className={styles.deleteName}>{trainer.full_name}</span>?
          </p>
          <p className={styles.deleteNote}>
            If this trainer has workout plans or active/ended assignments, the
            backend will block the deletion. No data will be changed.
          </p>
          {error && <div className={styles.formError} style={{ marginBottom: 20, textAlign: 'left' }}>{error}</div>}
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isDeleting}>Cancel</button>
            <button className={styles.deleteBtn} onClick={onConfirm} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              {isDeleting ? 'Deleting…' : 'Delete Trainer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Section (inside detail panel) ────────────────────────────────────
function ScheduleSection({ trainerId }) {
  const [slots,   setSlots]   = useState([]);
  const [status,  setStatus]  = useState('loading');
  const [form,    setForm]    = useState({ day: '', start: '', end: '' });
  const [slotErr, setSlotErr] = useState('');
  const [adding,  setAdding]  = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchSchedule = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await api.get(`/trainers/${trainerId}/schedule`);
      setSlots(data);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, [trainerId]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  async function addSlot(e) {
    e.preventDefault();
    setSlotErr('');
    if (!form.day)   { setSlotErr('Select a day'); return; }
    if (!form.start) { setSlotErr('Enter start time'); return; }
    if (!form.end)   { setSlotErr('Enter end time'); return; }
    if (form.start >= form.end) { setSlotErr('End time must be after start time'); return; }

    setAdding(true);
    try {
      await api.post(`/trainers/${trainerId}/schedule`, {
        day_of_week: form.day,
        start_time:  form.start + ':00',
        end_time:    form.end   + ':00',
      });
      setForm({ day: '', start: '', end: '' });
      await fetchSchedule();
    } catch (err) {
      if (err.code === 'DUPLICATE')
        setSlotErr(`${form.day} ${form.start} already exists for this trainer.`);
      else
        setSlotErr(err.message ?? 'Failed to add slot.');
    } finally {
      setAdding(false);
    }
  }

  async function removeSlot(slotId) {
    setRemovingId(slotId);
    try {
      await api.delete(`/trainers/${trainerId}/schedule/${slotId}`);
      setSlots(s => s.filter(x => x.schedule_id !== slotId));
    } catch (err) {
      alert(err.message ?? 'Could not remove slot.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        Weekly Schedule
        <span className={styles.sectionCount}>{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
      </div>

      {status === 'loading' && <p className={styles.muted}>Loading schedule…</p>}
      {status === 'error'   && (
        <p className={styles.muted}>
          Failed to load schedule.{' '}
          <button style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={fetchSchedule}>Retry</button>
        </p>
      )}

      {status === 'ok' && (
        <>
          {slots.length === 0 ? (
            <p className={styles.muted} style={{ marginBottom: 14, fontStyle: 'italic' }}>
              No schedule slots yet.
            </p>
          ) : (
            <div className={styles.slotList}>
              {slots.map(slot => (
                <div key={slot.schedule_id} className={styles.slotItem}>
                  <span className={styles.slotDay}>{slot.day_of_week}</span>
                  <span className={styles.slotTime}>
                    {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                  </span>
                  <button className={styles.slotRemoveBtn}
                          onClick={() => removeSlot(slot.schedule_id)}
                          disabled={removingId === slot.schedule_id}
                          title="Remove slot"
                          aria-label={`Remove ${slot.day_of_week} slot`}>
                    {removingId === slot.schedule_id ? <Spinner /> : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add slot form */}
          <form onSubmit={addSlot} className={styles.addSlotForm} noValidate>
            <div className={styles.addSlotField}>
              <label className={styles.addSlotLabel}>Day</label>
              <select className={`${styles.addSlotSelect} ${slotErr && !form.day ? styles.invalid : ''}`}
                      value={form.day}
                      onChange={e => { setForm(f => ({ ...f, day: e.target.value })); setSlotErr(''); }}
                      disabled={adding}>
                <option value="">Day…</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className={styles.addSlotField}>
              <label className={styles.addSlotLabel}>Start</label>
              <input type="time" className={styles.addSlotInput}
                     value={form.start}
                     onChange={e => { setForm(f => ({ ...f, start: e.target.value })); setSlotErr(''); }}
                     disabled={adding} />
            </div>
            <div className={styles.addSlotField}>
              <label className={styles.addSlotLabel}>End</label>
              <input type="time" className={styles.addSlotInput}
                     value={form.end}
                     onChange={e => { setForm(f => ({ ...f, end: e.target.value })); setSlotErr(''); }}
                     disabled={adding} />
            </div>
            <button type="submit" className={styles.addSlotBtn} disabled={adding}>
              {adding && <Spinner />}
              {adding ? 'Adding…' : '+ Add Slot'}
            </button>
          </form>

          {slotErr && <div className={styles.inlineError}>{slotErr}</div>}
        </>
      )}
    </div>
  );
}

// ─── Clients & Assignments Section ────────────────────────────────────────────
function ClientsSection({ trainerId, allMembers }) {
  const [clients,    setClients]    = useState([]);
  const [status,     setStatus]     = useState('loading');
  const [selectedMember, setSelectedMember] = useState('');
  const [assigning,  setAssigning]  = useState(false);
  const [endingId,   setEndingId]   = useState(null);
  const [assignErr,  setAssignErr]  = useState('');

  const fetchClients = useCallback(async () => {
    setStatus('loading');
    try {
      // GET /trainers/:id/clients — active assignments only
      // Returns: [{member_id, full_name, phone, status, assignment_id, assigned_date, ...}]
      const { data } = await api.get(`/trainers/${trainerId}/clients`);
      setClients(data);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, [trainerId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Filter out members who already have an active assignment with this trainer
  const assignedMemberIds = new Set(clients.map(c => c.member_id));
  const availableMembers = allMembers.filter(m => !assignedMemberIds.has(m.member_id));

  async function handleAssign(e) {
    e.preventDefault();
    setAssignErr('');
    if (!selectedMember) { setAssignErr('Select a member to assign'); return; }

    setAssigning(true);
    try {
      // POST /assignments { trainer_id, member_id }
      await api.post('/assignments', {
        trainer_id: parseInt(trainerId, 10),
        member_id:  parseInt(selectedMember, 10),
      });
      setSelectedMember('');
      await fetchClients();
    } catch (err) {
      if (err.code === 'DUPLICATE')
        setAssignErr('This member already has an active assignment with this trainer.');
      else if (err.code === 'NOT_FOUND')
        setAssignErr('Member or trainer not found. Refresh and try again.');
      else
        setAssignErr(err.message ?? 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleEnd(assignmentId) {
    setEndingId(assignmentId);
    try {
      // PATCH /assignments/:id/end
      await api.patch(`/assignments/${assignmentId}/end`);
      setClients(cs => cs.filter(c => c.assignment_id !== assignmentId));
    } catch (err) {
      alert(err.message ?? 'Could not end assignment.');
    } finally {
      setEndingId(null);
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        Active Clients
        <span className={styles.sectionCount}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
      </div>

      {status === 'loading' && <p className={styles.muted}>Loading clients…</p>}
      {status === 'error'   && (
        <p className={styles.muted}>
          Failed to load clients.{' '}
          <button style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={fetchClients}>Retry</button>
        </p>
      )}

      {status === 'ok' && (
        <>
          {clients.length === 0 ? (
            <p className={styles.muted} style={{ marginBottom: 14, fontStyle: 'italic' }}>
              No active clients.
            </p>
          ) : (
            <div className={styles.clientList}>
              {clients.map(c => (
                <div key={c.assignment_id} className={styles.clientItem}>
                  <div className={styles.clientInfo}>
                    <div className={styles.clientName}>{c.full_name}</div>
                    <div className={styles.clientMeta}>
                      {c.phone} · Assigned {fmtDate(c.assigned_date)} · #{c.assignment_id}
                    </div>
                  </div>
                  <button className={styles.endBtn}
                          onClick={() => handleEnd(c.assignment_id)}
                          disabled={endingId === c.assignment_id}
                          title="End this assignment">
                    {endingId === c.assignment_id ? <Spinner /> : 'End'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Assign member */}
          <form onSubmit={handleAssign} className={styles.assignForm} noValidate>
            <div className={styles.addSlotField} style={{ flex: 1 }}>
              <label className={styles.addSlotLabel}>Assign a member</label>
              <select className={styles.addSlotSelect}
                      value={selectedMember}
                      onChange={e => { setSelectedMember(e.target.value); setAssignErr(''); }}
                      disabled={assigning}
                      style={{ width: '100%' }}>
                <option value="">Select member…</option>
                {availableMembers.map(m => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.full_name} — {m.phone}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.addSlotBtn} disabled={assigning || !availableMembers.length}>
              {assigning && <Spinner />}
              {assigning ? 'Assigning…' : '+ Assign'}
            </button>
          </form>

          {assignErr && <div className={styles.inlineError}>{assignErr}</div>}
          {!availableMembers.length && !assigning && (
            <p className={styles.muted} style={{ fontSize: 12, marginTop: 6 }}>
              All members are already assigned to this trainer.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Trainer Detail Panel (wide modal) ────────────────────────────────────────
function TrainerDetailPanel({ trainer, allMembers, onEdit, onClose }) {
  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${styles.modalWide}`}
           role="dialog" aria-modal="true"
           aria-labelledby="td-title">
        <div className={styles.modalHeader}>
          <div>
            <span id="td-title" className={styles.modalTitle}>{trainer.full_name}</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Trainer #{trainer.trainer_id}
              {trainer.specialization ? ` · ${trainer.specialization}` : ''}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Profile details */}
        <div className={styles.detailGrid}>
          {[
            ['Phone',          trainer.phone ?? '—'],
            ['Email',          trainer.email ?? '—'],
            ['Specialization', trainer.specialization ?? '—'],
            ['Hire Date',      fmtDate(trainer.hire_date)],
            ['Monthly Salary', trainer.salary != null ? `₹${Number(trainer.salary).toLocaleString('en-IN')}` : '—'],
            ['Linked User',    trainer.user_id ? `User #${trainer.user_id}` : 'No account linked'],
          ].map(([label, val]) => (
            <div key={label} className={styles.detailItem}>
              <div className={styles.detailLabel}>{label}</div>
              <div className={styles.detailValue}>{val}</div>
            </div>
          ))}
        </div>

        {/* Edit button */}
        <div className={styles.detailActions}>
          <button className={styles.outlineBtn} onClick={() => onEdit(trainer)}>
            <EditIcon /> Edit Trainer
          </button>
        </div>

        {/* Schedule section */}
        <ScheduleSection trainerId={trainer.trainer_id} />

        {/* Clients & assignments section */}
        <ClientsSection trainerId={trainer.trainer_id} allMembers={allMembers} />
      </div>
    </div>
  );
}

// ─── TrainersPage ─────────────────────────────────────────────────────────────
export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [status,   setStatus]   = useState('loading');
  const [errMsg,   setErrMsg]   = useState('');
  const [search,   setSearch]   = useState('');

  // Members list for the assign-member dropdown
  const [allMembers, setAllMembers] = useState([]);

  // Modal state
  const [modal,       setModal]       = useState(null);
  // null | {type:'create'} | {type:'edit',trainer} | {type:'delete',trainer} | {type:'detail',trainer}
  const [deleteErr,   setDeleteErr]   = useState('');
  const [isDeleting,  setIsDeleting]  = useState(false);

  // Toast
  const [toast,     setToast]     = useState('');
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  // ── Fetch trainers ───────────────────────────────────────────────────────────
  const fetchTrainers = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      const [tRes, mRes] = await Promise.all([
        api.get('/trainers'),
        api.get('/members?limit=100'),
      ]);
      setTrainers(tRes.data);
      setAllMembers(mRes.data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load trainers.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  // ── Client-side search ───────────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filtered = q
    ? trainers.filter(t =>
        t.full_name.toLowerCase().includes(q) ||
        (t.specialization ?? '').toLowerCase().includes(q) ||
        t.phone.includes(q)
      )
    : trainers;

  // ── Save handler (create or edit) ────────────────────────────────────────────
  function handleSaved(result) {
    const wasEdit = modal?.type === 'edit';
    setModal(null);
    showToast(wasEdit ? 'Trainer updated successfully.' : 'Trainer added successfully.');
    fetchTrainers();
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleteErr('');
    setIsDeleting(true);
    try {
      await api.delete(`/trainers/${modal.trainer.trainer_id}`);
      const name = modal.trainer.full_name;
      setModal(null);
      showToast(`"${name}" has been deleted.`);
      fetchTrainers();
    } catch (err) {
      if (err.code === 'IN_USE') {
        setDeleteErr(
          'Cannot delete: this trainer has linked workout plans or assignments. ' +
          'End all assignments and remove linked workout plans first.'
        );
      } else if (err.code === 'NOT_FOUND') {
        setDeleteErr('Trainer not found — may already have been deleted.');
        setTimeout(() => { setModal(null); fetchTrainers(); }, 1500);
      } else {
        setDeleteErr(err.message ?? 'Delete failed. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // When Edit is triggered from inside the detail panel, swap modal type
  function handleEditFromDetail(trainer) {
    setModal({ type: 'edit', trainer });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <Toast msg={toast} />

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trainers</h1>
          <p className={styles.pageSubtitle}>
            Manage trainer profiles, schedules, and client assignments
          </p>
        </div>
        <button className={styles.addBtn}
                onClick={() => setModal({ type: 'create' })}>
          <PlusIcon /> Add Trainer
        </button>
      </div>

      {/* Client-side search */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}><SearchIcon /></span>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search name, phone, specialization…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search trainers"
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Specialization</th>
                <th>Hire Date</th>
                <th>Salary (₹)</th>
                <th>Clients</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {status === 'loading' && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skRow}>
                  {[20, 100, 80, 100, 70, 60, 40, 80].map((w, j) => (
                    <td key={j}><div className={styles.skBar} style={{ height: 13, width: w }} /></td>
                  ))}
                </tr>
              ))}

              {/* Rows */}
              {status === 'success' && filtered.map(t => (
                <tr key={t.trainer_id}>
                  <td className={styles.muted}>#{t.trainer_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.full_name}</div>
                    {t.email && <div className={styles.muted}>{t.email}</div>}
                  </td>
                  <td className={styles.muted}>{t.phone}</td>
                  <td>{t.specialization ?? <span className={styles.muted}>—</span>}</td>
                  <td className={styles.muted}>{fmtDate(t.hire_date)}</td>
                  <td>
                    {t.salary != null
                      ? `₹${Number(t.salary).toLocaleString('en-IN')}`
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td>
                    <span className={styles.clientBadge}>
                      <UsersIcon /> {t.clients}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn}
                              title="View details"
                              onClick={() => setModal({ type: 'detail', trainer: t })}>
                        <EyeIcon />
                      </button>
                      <button className={styles.iconBtn}
                              title="Edit trainer"
                              onClick={() => setModal({ type: 'edit', trainer: t })}>
                        <EditIcon />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.delete}`}
                              title="Delete trainer"
                              onClick={() => { setDeleteErr(''); setModal({ type: 'delete', trainer: t }); }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Error state */}
          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Could not load trainers</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn} onClick={fetchTrainers}>Retry</button>
            </div>
          )}

          {/* Empty / no results */}
          {status === 'success' && filtered.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>{search ? '🔍' : '🏋️'}</div>
              <div className={styles.stateTitle}>
                {search ? 'No trainers match your search' : 'No trainers yet'}
              </div>
              <div className={styles.stateMsg}>
                {search
                  ? 'Try a different name, phone, or specialization.'
                  : 'Add your first trainer to get started.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <TrainerFormModal
          initial={null}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <TrainerFormModal
          initial={modal.trainer}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <DeleteModal
          trainer={modal.trainer}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
          isDeleting={isDeleting}
          error={deleteErr}
        />
      )}

      {modal?.type === 'detail' && (
        <TrainerDetailPanel
          trainer={modal.trainer}
          allMembers={allMembers}
          onEdit={handleEditFromDetail}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function PlusIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function CloseIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function EyeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EditIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function UsersIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
