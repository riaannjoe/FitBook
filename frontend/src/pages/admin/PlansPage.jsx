/**
 * src/pages/admin/PlansPage.jsx
 * --------------------------------
 * Membership Plans CRUD page.
 *
 * VERIFIED API CONTRACTS (from planRoutes.js, planController.js, planModel.js):
 *
 * GET /plans
 *   No query params. No pagination.
 *   Ordered by duration_months ASC, price ASC.
 *   Response: { data: Plan[] }
 *
 * POST /plans
 *   Required: plan_name (VARCHAR 50, UNIQUE), duration_months (INT > 0), price (DECIMAL >= 0)
 *   Optional: description (VARCHAR 255)
 *   Success 201: { data: { plan_id } }
 *   Error 400: VALIDATION_ERROR (missing required fields)
 *   Error 409: DUPLICATE (plan_name already exists — schema has UNIQUE constraint)
 *
 * PUT /plans/:id
 *   UPDATABLE: plan_name, duration_months, price, description
 *   At least one field must be present (enforced by updateRow).
 *   Success 200: { data: Plan }   ← full updated plan object
 *   Error 404: Plan not found
 *   Error 409: DUPLICATE (renaming to an existing name)
 *
 * DELETE /plans/:id
 *   Success 200: { data: { deleted: true } }
 *   Error 409: IN_USE — subscriptions.plan_id FK prevents deletion.
 *              The backend's errorHandler maps ER_ROW_IS_REFERENCED_2 → 409 IN_USE.
 *   Error 404: Plan not found
 *
 * Plan object fields (all from membership_plans table):
 *   plan_id          INT     primary key
 *   plan_name        VARCHAR unique
 *   duration_months  INT     must be > 0 (CHECK constraint)
 *   price            DECIMAL must be >= 0 (CHECK constraint)
 *   description      VARCHAR nullable
 *
 * No status field — plans do not have an active/inactive toggle.
 *
 * LAYOUT:
 * Card grid instead of a table. Rationale: very few records (≤ ~20),
 * no search/filter, and each plan has a natural "pricing card" shape
 * that benefits from more space than a table cell provides.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './PlansPage.module.css';

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function durationLabel(months) {
  if (!months) return '—';
  if (months === 1)  return '1 Month';
  if (months === 12) return '1 Year';
  if (months === 6)  return '6 Months';
  if (months === 3)  return '3 Months';
  return `${months} Month${months !== 1 ? 's' : ''}`;
}

// ─── Shared tiny components ────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({ plan, onConfirm, onClose, isDeleting, error }) {
  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="del-title">
        <div className={styles.deleteBody}>
          <div className={styles.deleteWarning}>⚠️</div>
          <h2 id="del-title" className={styles.deleteTitle}>Delete Plan</h2>
          <p className={styles.deleteMsg}>
            You are about to permanently delete the{' '}
            <span className={styles.deleteName}>{plan.plan_name}</span> plan
            (ID #{plan.plan_id}).
          </p>
          <p className={styles.deleteNote}>
            If any member subscriptions are linked to this plan, the backend
            will refuse the deletion and no data will be changed.
          </p>
          {error && (
            <div className={styles.formError} style={{ marginBottom: 20, textAlign: 'left' }}>
              {error}
            </div>
          )}
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isDeleting}>
              Cancel
            </button>
            <button className={styles.deleteBtn} onClick={onConfirm} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              {isDeleting ? 'Deleting…' : 'Delete Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Form Modal (create + edit) ─────────────────────────────────────────
function PlanFormModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState({
    plan_name:        initial?.plan_name        ?? '',
    duration_months:  initial?.duration_months != null
                        ? String(initial.duration_months) : '',
    price:            initial?.price            != null
                        ? String(initial.price)           : '',
    description:      initial?.description      ?? '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,   setIsSaving]     = useState(false);

  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setServerError('');
  }

  // Client-side validation — mirrors backend required + DB CHECK constraints
  function validate() {
    const errors = {};
    if (!form.plan_name.trim())
      errors.plan_name = 'Plan name is required';
    else if (form.plan_name.trim().length > 50)
      errors.plan_name = 'Plan name must be 50 characters or fewer';

    const months = parseInt(form.duration_months, 10);
    if (!form.duration_months)
      errors.duration_months = 'Duration is required';
    else if (isNaN(months) || months < 1)
      errors.duration_months = 'Duration must be a whole number ≥ 1';

    const price = parseFloat(form.price);
    if (form.price === '')
      errors.price = 'Price is required';
    else if (isNaN(price) || price < 0)
      errors.price = 'Price must be 0 or greater';

    if (form.description.length > 255)
      errors.description = 'Description must be 255 characters or fewer';

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    // Build request body with correct numeric types.
    // The backend stores duration_months as INT and price as DECIMAL.
    const body = {
      plan_name:       form.plan_name.trim(),
      duration_months: parseInt(form.duration_months, 10),
      price:           parseFloat(parseFloat(form.price).toFixed(2)),
    };
    // Only include description if non-empty; omitting it leaves the DB value as null
    if (form.description.trim()) body.description = form.description.trim();

    setIsSaving(true);
    try {
      if (isEdit) {
        // PUT /plans/:id  → returns full updated plan
        const { data } = await api.put(`/plans/${initial.plan_id}`, body);
        onSave(data);
      } else {
        // POST /plans  → returns { plan_id }
        const { data } = await api.post('/plans', body);
        onSave(data);
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const ferrs = {};
        err.details.forEach(d => { ferrs[d.field] = d.message; });
        setFieldErrors(ferrs);
      } else if (err.code === 'DUPLICATE') {
        setFieldErrors({ plan_name: 'A plan with this name already exists.' });
      } else {
        setServerError(err.message ?? 'Save failed. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Tiny field wrapper renders label + input + error message
  const F = ({ name, label, required, hint, children }) => (
    <div className={styles.field}>
      <label htmlFor={`f-${name}`}
             className={`${styles.label} ${required ? styles.required : ''}`}>
        {label}
      </label>
      {children}
      {hint && !fieldErrors[name] && (
        <span className={styles.hint}>{hint}</span>
      )}
      {fieldErrors[name] && (
        <span className={styles.fieldError}>{fieldErrors[name]}</span>
      )}
    </div>
  );

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true"
           aria-labelledby="form-title">
        <div className={styles.modalHeader}>
          <span id="form-title" className={styles.modalTitle}>
            {isEdit ? `Edit — ${initial.plan_name}` : 'New Membership Plan'}
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

            {/* Plan name — full width */}
            <F name="plan_name" label="Plan Name" required>
              <input
                ref={firstRef}
                id="f-plan_name"
                type="text"
                className={`${styles.input} ${fieldErrors.plan_name ? styles.invalid : ''}`}
                value={form.plan_name}
                onChange={e => set('plan_name', e.target.value)}
                placeholder="e.g. Quarterly, Premium Yearly"
                disabled={isSaving}
                maxLength={50}
              />
            </F>

            {/* Duration + Price side by side */}
            <div className={styles.formRow}>
              <F name="duration_months" label="Duration (months)" required
                 hint="Whole number, minimum 1">
                <input
                  id="f-duration_months"
                  type="number"
                  min="1"
                  step="1"
                  className={`${styles.input} ${fieldErrors.duration_months ? styles.invalid : ''}`}
                  value={form.duration_months}
                  onChange={e => set('duration_months', e.target.value)}
                  placeholder="e.g. 1, 3, 12"
                  disabled={isSaving}
                />
              </F>

              <F name="price" label="Price (₹)" required hint="In Indian Rupees, min ₹0">
                <input
                  id="f-price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.input} ${fieldErrors.price ? styles.invalid : ''}`}
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="e.g. 1500"
                  disabled={isSaving}
                />
              </F>
            </div>

            {/* Description — optional, textarea */}
            <F name="description" label="Description"
               hint="Optional — shown to members; max 255 characters">
              <textarea
                id="f-description"
                className={`${styles.textarea} ${fieldErrors.description ? styles.invalid : ''}`}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="e.g. Full gym access including personal training sessions"
                disabled={isSaving}
                maxLength={255}
                rows={3}
              />
            </F>

          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn}
                    onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete }) {
  return (
    <div className={styles.card}>
      {/* Header row: name + ID badge */}
      <div className={styles.cardTop}>
        <div className={styles.cardName}>{plan.plan_name}</div>
        <div className={styles.cardId}>#{plan.plan_id}</div>
      </div>

      {/* Large price */}
      <div>
        <div className={styles.cardPrice}>{formatINR(plan.price)}</div>
        <div className={styles.cardPriceSub}>one-time payment</div>
      </div>

      {/* Duration chip */}
      <div>
        <span className={styles.cardDuration}>
          <CalendarIcon /> {durationLabel(plan.duration_months)}
        </span>
      </div>

      {/* Description (or placeholder if absent) */}
      <div className={styles.cardDesc}>
        {plan.description ?? <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description</span>}
      </div>

      {/* Edit / Delete action row */}
      <div className={styles.cardActions}>
        <button className={styles.outlineBtn} onClick={() => onEdit(plan)}>
          <EditIcon /> Edit
        </button>
        <button className={`${styles.outlineBtn} ${styles.danger}`} onClick={() => onDelete(plan)}>
          <TrashIcon /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonBar} style={{ height: 20, width: '65%' }} />
      <div className={styles.skeletonBar} style={{ height: 34, width: '45%' }} />
      <div className={styles.skeletonBar} style={{ height: 28, width: '40%', borderRadius: 20 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className={styles.skeletonBar} style={{ height: 11, width: '90%' }} />
        <div className={styles.skeletonBar} style={{ height: 11, width: '70%' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className={styles.skeletonBar} style={{ height: 34, flex: 1, borderRadius: 8 }} />
        <div className={styles.skeletonBar} style={{ height: 34, flex: 1, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ─── PlansPage ─────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans,  setPlans]  = useState([]);
  const [status, setStatus] = useState('loading');  // 'loading'|'success'|'error'
  const [errMsg, setErrMsg] = useState('');

  // Modal state
  const [modal,       setModal]       = useState(null);
  // modal = null | { type: 'create' } | { type: 'edit', plan }
  //       | { type: 'delete', plan }
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting,  setIsDeleting]  = useState(false);

  // Toast
  const [toast, setToast] = useState('');
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // ── Fetch plans ─────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      // GET /api/v1/plans
      // Returns: { data: Plan[] }  — flat array, no meta/pagination
      const { data } = await api.get('/plans');
      setPlans(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load plans.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── After save (create or edit) ─────────────────────────────────────────────
  function handleSaved(result) {
    const wasEdit = modal?.type === 'edit';
    setModal(null);
    showToast(wasEdit ? 'Plan updated successfully.' : 'Plan created successfully.');
    fetchPlans();  // reload full list to reflect server-side ordering
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleteError('');
    setIsDeleting(true);
    try {
      await api.delete(`/plans/${modal.plan.plan_id}`);
      const name = modal.plan.plan_name;
      setModal(null);
      showToast(`"${name}" has been deleted.`);
      fetchPlans();
    } catch (err) {
      if (err.code === 'IN_USE') {
        setDeleteError(
          'Cannot delete: one or more member subscriptions are linked to this plan. ' +
          'All associated subscriptions must be removed first.'
        );
      } else if (err.code === 'NOT_FOUND') {
        setDeleteError('Plan not found. It may have already been deleted. Refreshing…');
        setTimeout(() => { setModal(null); fetchPlans(); }, 1500);
      } else {
        setDeleteError(err.message ?? 'Delete failed. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Toast */}
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

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Membership Plans</h1>
          <p className={styles.pageSubtitle}>
            Define the plans members can subscribe to — set name, duration, and price
          </p>
        </div>
        <button className={styles.addBtn}
                onClick={() => setModal({ type: 'create' })}>
          <PlusIcon /> Add Plan
        </button>
      </div>

      {/* Count row */}
      {status === 'success' && (
        <p className={styles.countRow}>
          {plans.length} plan{plans.length !== 1 ? 's' : ''} available
        </p>
      )}

      {/* Card grid */}
      <div className={styles.grid}>

        {/* Loading */}
        {status === 'loading' && (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        )}

        {/* Error */}
        {status === 'error' && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>⚠️</div>
            <div className={styles.stateTitle}>Could not load plans</div>
            <div className={styles.stateMsg}>{errMsg}</div>
            <button className={styles.retryBtn} onClick={fetchPlans}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {status === 'success' && plans.length === 0 && (
          <div className={styles.stateBox}>
            <div className={styles.stateIcon}>🏷️</div>
            <div className={styles.stateTitle}>No plans yet</div>
            <div className={styles.stateMsg}>
              Create your first membership plan to get started.
            </div>
          </div>
        )}

        {/* Plan cards */}
        {status === 'success' && plans.map(p => (
          <PlanCard
            key={p.plan_id}
            plan={p}
            onEdit={plan => setModal({ type: 'edit', plan })}
            onDelete={plan => { setDeleteError(''); setModal({ type: 'delete', plan }); }}
          />
        ))}

      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <PlanFormModal
          initial={null}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <PlanFormModal
          initial={modal.plan}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <DeleteConfirmModal
          plan={modal.plan}
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
function PlusIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function CloseIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function CalendarIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
