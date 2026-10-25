/**
 * src/pages/admin/WorkoutsPage.jsx
 * -----------------------------------
 * Combined Exercise Library + Workout Plans page (single nav item "/admin/workouts").
 *
 * ══════════════════ VERIFIED API CONTRACTS ══════════════════
 *
 * ── Exercises ────────────────────────────────────────────────
 * GET /exercises
 *   Auth: any logged-in user (authenticate only, no authorize)
 *   Response: [{ exercise_id, name, muscle_group, description }]
 *   Ordered: muscle_group ASC, name ASC. No pagination.
 *   Filtering: none server-side. Client-side search implemented.
 *
 * POST /exercises
 *   Auth: admin OR trainer
 *   Required: name, muscle_group
 *   Optional: description
 *   Response 201: { data: { exercise_id } }
 *   No PUT or DELETE endpoint exists.
 *
 * ── Workout Plans ─────────────────────────────────────────────
 * GET /workout-plans?goal=&level=
 *   Auth: admin OR trainer
 *   Server-side filters: goal ∈ {weight_loss,muscle_gain,endurance,general}
 *                        level ∈ {beginner,intermediate,advanced}
 *   Response: [{
 *     workout_plan_id, title, goal, level, created_at,
 *     trainer_name  ← joined from trainers
 *   }]
 *   No exercise list on this response.
 *
 * GET /workout-plans/:id
 *   Auth: any logged-in user (authenticate only)
 *   Service groups flat join rows:
 *   Response: {
 *     workout_plan_id, title, goal, level,
 *     exercises: [{
 *       exercise_id, name, muscle_group,
 *       day_number, sets, reps
 *     }]
 *   }
 *
 * POST /workout-plans
 *   Auth: admin OR trainer
 *   Required: title, goal ∈ GOAL, level ∈ LEVEL
 *   Required for admin: trainer_id (INT — trainer who owns the plan)
 *   Optional: exercises: [{ exercise_id, day_number, sets, reps }]
 *             All 4 fields are required per exercise row if array is sent.
 *   Transaction: plan + exercises saved atomically.
 *   Response 201: { data: { workout_plan_id } }
 *   No PUT or DELETE endpoint exists.
 *
 * POST /workout-plans/assign
 *   Auth: admin OR trainer
 *   Required: member_id (INT), workout_plan_id (INT)
 *   Optional: end_date (YYYY-MM-DD)
 *   Validates member and plan exist.
 *   Response 201: { data: { mwp_id } }
 *   No endpoint to list, edit, or remove assignments.
 *
 * ════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './WorkoutsPage.module.css';

// ─── Constants (mirror backend utils/constants.js) ─────────────────────────────
const GOALS  = ['weight_loss', 'muscle_gain', 'endurance', 'general'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function labelGoal(g)  { return g.replace('_', ' '); }
function labelLevel(l) { return l.charAt(0).toUpperCase() + l.slice(1); }

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — EXERCISE LIBRARY
// ═══════════════════════════════════════════════════════════════

// ─── Add Exercise Form (collapsible card above grid) ─────────────────────────
function AddExerciseForm({ onAdded, onCancel }) {
  const [form,        setForm]        = useState({ name: '', muscle_group: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(f, v) {
    setForm(prev => ({ ...prev, [f]: v }));
    setFieldErrors(e => { const n = { ...e }; delete n[f]; return n; });
    setServerError('');
  }

  function validate() {
    const err = {};
    if (!form.name.trim())         err.name         = 'Exercise name is required';
    if (!form.muscle_group.trim()) err.muscle_group = 'Muscle group is required';
    return err;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (Object.keys(err).length) { setFieldErrors(err); return; }

    setIsSaving(true);
    try {
      // POST /exercises   required: name, muscle_group   optional: description
      const { data } = await api.post('/exercises', {
        name:         form.name.trim(),
        muscle_group: form.muscle_group.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      });
      onAdded(data.exercise_id, form);
    } catch (err) {
      if (err.code === 'DUPLICATE')
        setFieldErrors({ name: 'An exercise with this name already exists.' });
      else
        setServerError(err.message ?? 'Failed to add exercise. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.addFormCard}>
      <div className={styles.addFormTitle}>Add New Exercise</div>
      {serverError && <div className={styles.formError}>{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.addFormGrid}>
          <div className={styles.field}>
            <label htmlFor="ex-name"
                   className={`${styles.label} ${styles.required}`}>Exercise Name</label>
            <input ref={firstRef} id="ex-name" type="text"
                   className={`${styles.input} ${fieldErrors.name ? styles.invalid : ''}`}
                   value={form.name} onChange={e => set('name', e.target.value)}
                   placeholder="e.g. Bench Press" disabled={isSaving} />
            {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="ex-muscle"
                   className={`${styles.label} ${styles.required}`}>Muscle Group</label>
            <input id="ex-muscle" type="text"
                   className={`${styles.input} ${fieldErrors.muscle_group ? styles.invalid : ''}`}
                   value={form.muscle_group} onChange={e => set('muscle_group', e.target.value)}
                   placeholder="e.g. Chest, Legs, Back" disabled={isSaving} />
            {fieldErrors.muscle_group && <span className={styles.fieldError}>{fieldErrors.muscle_group}</span>}
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="ex-desc" className={styles.label}>Description</label>
            <textarea id="ex-desc"
                      className={styles.textarea}
                      value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="Optional: brief description of how to perform the exercise"
                      rows={2} disabled={isSaving} />
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={isSaving}>
            {isSaving && <Spinner />}
            {isSaving ? 'Adding…' : 'Add Exercise'}
          </button>
          <button type="button" className={styles.cancelBtn}
                  onClick={onCancel} disabled={isSaving}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Exercise Library Tab ──────────────────────────────────────────────────────
function ExerciseTab() {
  const [exercises, setExercises] = useState([]);
  const [status,    setStatus]    = useState('loading');
  const [errMsg,    setErrMsg]    = useState('');
  const [search,    setSearch]    = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [toast,     setToast]     = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const fetchExercises = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /exercises → [{ exercise_id, name, muscle_group, description }]
      const { data } = await api.get('/exercises');
      setExercises(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load exercises.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  function handleAdded(id, form) {
    // Optimistically prepend the new exercise, then refetch to get canonical order
    setExercises(prev => [
      { exercise_id: id, name: form.name, muscle_group: form.muscle_group, description: form.description },
      ...prev,
    ]);
    setShowForm(false);
    showToast(`"${form.name}" added to the exercise library.`);
    fetchExercises();
  }

  // Client-side search over fetched data
  const q = search.toLowerCase().trim();
  const filtered = q
    ? exercises.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.muscle_group.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      )
    : exercises;

  return (
    <div>
      <Toast msg={toast} />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input type="search" className={styles.searchInput}
                 placeholder="Search exercises, muscle groups…"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 aria-label="Search exercises" />
        </div>
        <button className={styles.addBtn}
                onClick={() => setShowForm(v => !v)}>
          <PlusIcon />
          {showForm ? 'Cancel' : 'Add Exercise'}
        </button>
        {status === 'success' && (
          <span className={styles.countText}>
            {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </span>
        )}
      </div>

      {/* Add exercise form */}
      {showForm && (
        <AddExerciseForm
          onAdded={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Exercise grid */}
      <div className={styles.grid}>
        {/* Skeleton */}
        {status === 'loading' && Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skBar} style={{ height: 14, width: '70%' }} />
            <div className={styles.skBar} style={{ height: 20, width: 80 }} />
            <div className={styles.skBar} style={{ height: 11, width: '90%' }} />
            <div className={styles.skBar} style={{ height: 11, width: '60%' }} />
          </div>
        ))}

        {/* Error */}
        {status === 'error' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>⚠️</div>
            <div className={styles.stateTitle}>Could not load exercises</div>
            <div className={styles.stateMsg}>{errMsg}</div>
            <button className={styles.retryBtn} onClick={fetchExercises}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {status === 'success' && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>{search ? '🔍' : '🏋️'}</div>
            <div className={styles.stateTitle}>
              {search ? 'No exercises match your search' : 'No exercises yet'}
            </div>
            <div className={styles.stateMsg}>
              {search ? 'Try a different name or muscle group.' : 'Add the first exercise using the button above.'}
            </div>
          </div>
        )}

        {/* Cards */}
        {status === 'success' && filtered.map(ex => (
          <div key={ex.exercise_id} className={styles.exerciseCard}>
            <div className={styles.exerciseCardTop}>
              <span className={styles.exerciseName}>{ex.name}</span>
              <span className={styles.exerciseId}>#{ex.exercise_id}</span>
            </div>
            <div className={styles.muscleChip}>{ex.muscle_group}</div>
            {ex.description && (
              <p className={styles.exerciseDesc}>{ex.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — WORKOUT PLANS
// ═══════════════════════════════════════════════════════════════

// ─── Plan Detail + Assign Modal ───────────────────────────────────────────────
function PlanDetailModal({ planId, members, onClose }) {
  const [plan,       setPlan]       = useState(null);
  const [status,     setStatus]     = useState('loading');
  const [errMsg,     setErrMsg]     = useState('');
  const [selMember,  setSelMember]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [assigning,  setAssigning]  = useState(false);
  const [assignMsg,  setAssignMsg]  = useState(null);

  useEffect(() => {
    (async () => {
      setStatus('loading');
      try {
        // GET /workout-plans/:id
        // Returns: { workout_plan_id, title, goal, level, exercises:[{...}] }
        const { data } = await api.get(`/workout-plans/${planId}`);
        setPlan(data);
        setStatus('success');
      } catch (err) {
        setErrMsg(err.message ?? 'Failed to load plan details.');
        setStatus('error');
      }
    })();
  }, [planId]);

  // Group exercises by day_number
  const byDay = plan?.exercises?.reduce((acc, ex) => {
    const d = ex.day_number ?? 0;
    if (!acc[d]) acc[d] = [];
    acc[d].push(ex);
    return acc;
  }, {}) ?? {};

  async function handleAssign(e) {
    e.preventDefault();
    setAssignMsg(null);
    if (!selMember) { setAssignMsg({ type: 'error', text: 'Select a member.' }); return; }

    setAssigning(true);
    try {
      // POST /workout-plans/assign
      // required: member_id, workout_plan_id   optional: end_date
      const body = {
        member_id:       parseInt(selMember, 10),
        workout_plan_id: planId,
      };
      if (endDate) body.end_date = endDate;

      const { data } = await api.post('/workout-plans/assign', body);
      setAssignMsg({ type: 'success', text: `Plan assigned — assignment #${data.mwp_id}` });
      setSelMember('');
      setEndDate('');
      setTimeout(() => setAssignMsg(null), 4000);
    } catch (err) {
      const map = {
        NOT_FOUND:         'Member or plan not found.',
        VALIDATION_ERROR:  err.message,
      };
      setAssignMsg({ type: 'error', text: map[err.code] ?? err.message ?? 'Assignment failed.' });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${styles.modalWide}`}
           role="dialog" aria-modal="true" aria-labelledby="pd-title">
        <div className={styles.modalHeader}>
          <span id="pd-title" className={styles.modalTitle}>
            {status === 'success' ? plan?.title : 'Loading Plan…'}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {status === 'loading' && (
          <div style={{ padding: '32px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[80, '60%', '40%'].map((w, i) => (
              <div key={i} className={styles.skBar} style={{ height: 14, width: w }} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
            <div>{errMsg}</div>
          </div>
        )}

        {status === 'success' && plan && (
          <>
            {/* Plan metadata */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>Plan Info</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`${styles.chip} ${styles.goal}`}>{labelGoal(plan.goal)}</span>
                <span className={`${styles.chip} ${styles.level}`}>{labelLevel(plan.level)}</span>
              </div>
            </div>

            {/* Exercises by day */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>
                Exercises — {plan.exercises.length} total
              </div>
              {plan.exercises.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No exercises attached to this plan.
                </p>
              ) : (
                Object.keys(byDay).sort((a, b) => Number(a) - Number(b)).map(day => (
                  <div key={day}>
                    <div className={styles.dayHeader}>
                      Day {day}
                    </div>
                    {byDay[day].map((ex, i) => (
                      <div key={i} className={styles.exerciseRow}>
                        <span className={styles.exerciseRowName}>{ex.name}</span>
                        <span className={`${styles.muscleChip}`}
                              style={{ fontSize: 11, padding: '2px 8px' }}>
                          {ex.muscle_group}
                        </span>
                        <span className={styles.exerciseRowMeta}>
                          {ex.sets} sets × {ex.reps} reps
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Assign to member */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>Assign to Member</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                Assigns this plan to the selected member. End date is optional.
                Members can have multiple plans assigned.
              </p>
              <form onSubmit={handleAssign} noValidate>
                <div className={styles.assignForm}>
                  <select className={styles.assignSelect}
                          value={selMember}
                          onChange={e => { setSelMember(e.target.value); setAssignMsg(null); }}
                          disabled={assigning}>
                    <option value="">Select member…</option>
                    {members.map(m => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.full_name} — {m.phone}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      End Date (optional)
                    </label>
                    <input type="date"
                           style={{ padding: '9px 11px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }}
                           value={endDate}
                           onChange={e => setEndDate(e.target.value)}
                           disabled={assigning} />
                  </div>
                  <button type="submit" className={styles.assignBtn} disabled={assigning}>
                    {assigning ? <Spinner /> : null}
                    {assigning ? 'Assigning…' : 'Assign Plan'}
                  </button>
                </div>
              </form>
              {assignMsg && (
                <div className={`${styles.assignMsg} ${styles[assignMsg.type]}`}>
                  {assignMsg.text}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create Plan Modal ─────────────────────────────────────────────────────────
function CreatePlanModal({ trainers, exercises: allExercises, onCreated, onClose }) {
  const [form, setForm] = useState({
    title: '', goal: '', level: '', trainer_id: '',
  });
  // Exercise rows: [{ exercise_id, day_number, sets, reps }]
  const [exRows,      setExRows]      = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function setF(f, v) {
    setForm(p => ({ ...p, [f]: v }));
    setFieldErrors(e => { const n = { ...e }; delete n[f]; return n; });
    setServerError('');
  }

  function addRow() {
    setExRows(r => [...r, { exercise_id: '', day_number: 1, sets: 3, reps: 10 }]);
  }

  function updateRow(i, f, v) {
    setExRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));
  }

  function removeRow(i) {
    setExRows(r => r.filter((_, idx) => idx !== i));
  }

  function validate() {
    const err = {};
    if (!form.title.trim())    err.title      = 'Title is required';
    if (!form.goal)            err.goal       = 'Goal is required';
    if (!form.level)           err.level      = 'Level is required';
    if (!form.trainer_id)      err.trainer_id = 'Trainer is required';
    // Validate each exercise row
    exRows.forEach((row, i) => {
      if (!row.exercise_id)      err[`ex_${i}_exercise_id`] = 'Select exercise';
      if (!row.day_number || row.day_number < 1) err[`ex_${i}_day`] = 'Day ≥ 1';
      if (!row.sets || row.sets < 1)             err[`ex_${i}_sets`] = '≥ 1';
      if (!row.reps || row.reps < 1)             err[`ex_${i}_reps`] = '≥ 1';
    });
    return err;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (Object.keys(err).length) { setFieldErrors(err); return; }

    const body = {
      title:      form.title.trim(),
      goal:       form.goal,
      level:      form.level,
      trainer_id: parseInt(form.trainer_id, 10),
      exercises:  exRows.map(r => ({
        exercise_id: parseInt(r.exercise_id, 10),
        day_number:  parseInt(r.day_number, 10),
        sets:        parseInt(r.sets, 10),
        reps:        parseInt(r.reps, 10),
      })),
    };

    setIsSaving(true);
    try {
      // POST /workout-plans
      // required (admin): title, goal, level, trainer_id
      // optional: exercises[]: { exercise_id, day_number, sets, reps }
      const { data } = await api.post('/workout-plans', body);
      onCreated(data.workout_plan_id, form.title);
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR')
        setServerError(err.message ?? 'Validation error — check all fields.');
      else
        setServerError(err.message ?? 'Create failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="cp-title">
        <div className={styles.modalHeader}>
          <span id="cp-title" className={styles.modalTitle}>Create Workout Plan</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {serverError && <div className={styles.formError}>{serverError}</div>}

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="cp-title-inp" className={`${styles.label} ${styles.required}`}>Plan Title</label>
            <input ref={firstRef} id="cp-title-inp" type="text"
                   className={`${styles.input} ${fieldErrors.title ? styles.invalid : ''}`}
                   value={form.title} onChange={e => setF('title', e.target.value)}
                   placeholder="e.g. Beginner Strength Starter" disabled={isSaving} />
            {fieldErrors.title && <span className={styles.fieldError}>{fieldErrors.title}</span>}
          </div>

          {/* Goal + Level */}
          <div className={styles.addFormGrid}>
            <div className={styles.field}>
              <label htmlFor="cp-goal" className={`${styles.label} ${styles.required}`}>Goal</label>
              <select id="cp-goal"
                      className={`${styles.select} ${fieldErrors.goal ? styles.invalid : ''}`}
                      value={form.goal} onChange={e => setF('goal', e.target.value)}
                      disabled={isSaving}>
                <option value="">Select goal…</option>
                {GOALS.map(g => <option key={g} value={g}>{labelGoal(g)}</option>)}
              </select>
              {fieldErrors.goal && <span className={styles.fieldError}>{fieldErrors.goal}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="cp-level" className={`${styles.label} ${styles.required}`}>Level</label>
              <select id="cp-level"
                      className={`${styles.select} ${fieldErrors.level ? styles.invalid : ''}`}
                      value={form.level} onChange={e => setF('level', e.target.value)}
                      disabled={isSaving}>
                <option value="">Select level…</option>
                {LEVELS.map(l => <option key={l} value={l}>{labelLevel(l)}</option>)}
              </select>
              {fieldErrors.level && <span className={styles.fieldError}>{fieldErrors.level}</span>}
            </div>
          </div>

          {/* Trainer */}
          <div className={styles.field}>
            <label htmlFor="cp-trainer" className={`${styles.label} ${styles.required}`}>Trainer (Plan Owner)</label>
            <select id="cp-trainer"
                    className={`${styles.select} ${fieldErrors.trainer_id ? styles.invalid : ''}`}
                    value={form.trainer_id} onChange={e => setF('trainer_id', e.target.value)}
                    disabled={isSaving}>
              <option value="">Select trainer…</option>
              {trainers.map(t => (
                <option key={t.trainer_id} value={t.trainer_id}>
                  {t.full_name}{t.specialization ? ` — ${t.specialization}` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.trainer_id && <span className={styles.fieldError}>{fieldErrors.trainer_id}</span>}
          </div>

          {/* Exercise rows */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)', marginBottom: 8 }}>
              Exercises (optional)
            </div>
            {exRows.map((row, i) => (
              <div key={i} className={styles.exerciseBuilderRow}>
                <select
                  className={`${styles.select} ${fieldErrors[`ex_${i}_exercise_id`] ? styles.invalid : ''}`}
                  value={row.exercise_id}
                  onChange={e => updateRow(i, 'exercise_id', e.target.value)}
                  disabled={isSaving}>
                  <option value="">Exercise…</option>
                  {allExercises.map(ex => (
                    <option key={ex.exercise_id} value={ex.exercise_id}>{ex.name}</option>
                  ))}
                </select>
                <input type="number" min="1" placeholder="Day"
                       className={`${styles.numInput} ${fieldErrors[`ex_${i}_day`] ? styles.invalid : ''}`}
                       value={row.day_number}
                       onChange={e => updateRow(i, 'day_number', e.target.value)}
                       disabled={isSaving} title="Day number" />
                <input type="number" min="1" placeholder="Sets"
                       className={`${styles.numInput} ${fieldErrors[`ex_${i}_sets`] ? styles.invalid : ''}`}
                       value={row.sets}
                       onChange={e => updateRow(i, 'sets', e.target.value)}
                       disabled={isSaving} title="Sets" />
                <input type="number" min="1" placeholder="Reps"
                       className={`${styles.numInput} ${fieldErrors[`ex_${i}_reps`] ? styles.invalid : ''}`}
                       value={row.reps}
                       onChange={e => updateRow(i, 'reps', e.target.value)}
                       disabled={isSaving} title="Reps" />
                <button type="button" className={styles.removeExerciseBtn}
                        onClick={() => removeRow(i)} disabled={isSaving}
                        title="Remove exercise">×</button>
              </div>
            ))}
            <button type="button" className={styles.addExerciseRowBtn}
                    onClick={addRow} disabled={isSaving}>
              + Add exercise row
            </button>
            {Object.keys(fieldErrors).some(k => k.startsWith('ex_')) && (
              <div className={styles.fieldError} style={{ marginTop: 6 }}>
                All exercise rows need a selected exercise, day ≥ 1, sets ≥ 1, reps ≥ 1.
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Creating…' : 'Create Plan'}
            </button>
            <button type="button" className={styles.cancelBtn}
                    onClick={onClose} disabled={isSaving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Workout Plans Tab ────────────────────────────────────────────────────────
function WorkoutPlansTab() {
  const [plans,     setPlans]     = useState([]);
  const [status,    setStatus]    = useState('loading');
  const [errMsg,    setErrMsg]    = useState('');
  const [goalFilter,  setGoalFilter]  = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  // For modals
  const [trainers,  setTrainers]  = useState([]);
  const [exercises, setExercises] = useState([]);
  const [members,   setMembers]   = useState([]);
  const [detailId,  setDetailId]  = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast,      setToast]      = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const fetchPlans = useCallback(async (goal, level) => {
    setStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (goal)  params.set('goal', goal);
      if (level) params.set('level', level);
      // GET /workout-plans?goal=&level=
      // Returns: [{ workout_plan_id, title, goal, level, created_at, trainer_name }]
      const { data } = await api.get(`/workout-plans?${params}`);
      setPlans(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load workout plans.');
      setStatus('error');
    }
  }, []);

  // Load supporting data for modals once
  useEffect(() => {
    Promise.allSettled([
      api.get('/trainers'),
      api.get('/exercises'),
      api.get('/members?limit=100'),
    ]).then(([t, e, m]) => {
      if (t.status === 'fulfilled') setTrainers(t.value.data);
      if (e.status === 'fulfilled') setExercises(e.value.data);
      if (m.status === 'fulfilled') setMembers(m.value.data);
    });
  }, []);

  useEffect(() => { fetchPlans(goalFilter, levelFilter); }, [goalFilter, levelFilter, fetchPlans]);

  function handleCreated(id, title) {
    setShowCreate(false);
    showToast(`"${title}" created successfully.`);
    fetchPlans(goalFilter, levelFilter);
  }

  return (
    <div>
      <Toast msg={toast} />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <select className={styles.filterSelect}
                value={goalFilter}
                onChange={e => setGoalFilter(e.target.value)}
                aria-label="Filter by goal">
          <option value="">All goals</option>
          {GOALS.map(g => <option key={g} value={g}>{labelGoal(g)}</option>)}
        </select>
        <select className={styles.filterSelect}
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                aria-label="Filter by level">
          <option value="">All levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{labelLevel(l)}</option>)}
        </select>
        <button className={styles.addBtn}
                onClick={() => setShowCreate(true)}>
          <PlusIcon /> Create Plan
        </button>
        {status === 'success' && (
          <span className={styles.countText}>
            {plans.length} plan{plans.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Plan cards grid */}
      <div className={styles.grid}>
        {status === 'loading' && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skBar} style={{ height: 16, width: '65%' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div className={styles.skBar} style={{ height: 22, width: 80 }} />
              <div className={styles.skBar} style={{ height: 22, width: 70 }} />
            </div>
            <div className={styles.skBar} style={{ height: 12, width: '50%' }} />
          </div>
        ))}

        {status === 'error' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>⚠️</div>
            <div className={styles.stateTitle}>Could not load plans</div>
            <div className={styles.stateMsg}>{errMsg}</div>
            <button className={styles.retryBtn}
                    onClick={() => fetchPlans(goalFilter, levelFilter)}>Retry</button>
          </div>
        )}

        {status === 'success' && plans.length === 0 && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>📋</div>
            <div className={styles.stateTitle}>No plans found</div>
            <div className={styles.stateMsg}>
              {goalFilter || levelFilter
                ? 'No plans match the selected filters.'
                : 'Create the first workout plan using the button above.'}
            </div>
          </div>
        )}

        {status === 'success' && plans.map(p => (
          <div key={p.workout_plan_id} className={styles.planCard}
               onClick={() => setDetailId(p.workout_plan_id)}
               role="button" tabIndex={0}
               onKeyDown={e => e.key === 'Enter' && setDetailId(p.workout_plan_id)}>
            <div className={styles.planTitle}>{p.title}</div>
            <div className={styles.planMeta}>
              <span className={`${styles.chip} ${styles.goal}`}>{labelGoal(p.goal)}</span>
              <span className={`${styles.chip} ${styles.level}`}>{labelLevel(p.level)}</span>
              <span className={`${styles.chip} ${styles.trainer}`}>👤 {p.trainer_name}</span>
            </div>
            <div className={styles.planExerciseCount}>
              Plan #{p.workout_plan_id} · Click to view exercises & assign
            </div>
          </div>
        ))}
      </div>

      {/* Plan detail modal */}
      {detailId !== null && (
        <PlanDetailModal
          planId={detailId}
          members={members}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Create plan modal */}
      {showCreate && (
        <CreatePlanModal
          trainers={trainers}
          exercises={exercises}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT PAGE
// ═══════════════════════════════════════════════════════════════
export default function WorkoutsPage() {
  const [tab, setTab] = useState('exercises');   // 'exercises' | 'plans'

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Workouts</h1>
          <p className={styles.pageSubtitle}>
            Exercise library and workout plan management
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'exercises'}
          className={`${styles.tab} ${tab === 'exercises' ? styles.tabActive : ''}`}
          onClick={() => setTab('exercises')}
          id="tab-exercises"
          aria-controls="panel-exercises"
        >
          🏋️ Exercise Library
        </button>
        <button
          role="tab"
          aria-selected={tab === 'plans'}
          className={`${styles.tab} ${tab === 'plans' ? styles.tabActive : ''}`}
          onClick={() => setTab('plans')}
          id="tab-plans"
          aria-controls="panel-plans"
        >
          📋 Workout Plans
        </button>
      </div>

      {/* Tab panels */}
      <div id="panel-exercises" role="tabpanel" aria-labelledby="tab-exercises"
           hidden={tab !== 'exercises'}>
        {tab === 'exercises' && <ExerciseTab />}
      </div>
      <div id="panel-plans" role="tabpanel" aria-labelledby="tab-plans"
           hidden={tab !== 'plans'}>
        {tab === 'plans' && <WorkoutPlansTab />}
      </div>
    </div>
  );
}
