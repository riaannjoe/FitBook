/**
 * src/pages/admin/EquipmentPage.jsx
 * ------------------------------------
 * Admin Equipment Inventory page.
 *
 * ══════════════════ VERIFIED API CONTRACTS ══════════════════
 *
 * GET /equipment?status=&category=
 *   Auth: any logged-in user (authenticate, no authorize)
 *   Server-side filters: status ∈ {working,under_repair,retired}, category (free text)
 *   No pagination.
 *   Response: [{
 *     equipment_id, name, category,
 *     purchase_date (DATE|null), cost (DECIMAL|null),
 *     status ENUM('working','under_repair','retired') DEFAULT 'working'
 *   }]
 *   Ordered: name ASC
 *
 * POST /equipment (admin)
 *   Required: name, category
 *   Optional: purchase_date (YYYY-MM-DD), cost (DECIMAL ≥ 0)
 *   Note: status is NOT accepted on create — defaults to 'working'
 *   Response 201: { data: { equipment_id } }
 *
 * PUT /equipment/:id (admin)
 *   UPDATABLE: name, category, purchase_date, cost, status
 *   Enum validation: status ∈ {working,under_repair,retired}
 *   Response 200: updated equipment row
 *   ⚠️ DB trigger: creating a maintenance request auto-sets status='under_repair'.
 *      Resolving a maintenance request auto-sets status='working'.
 *      Admins can also manually override status via this PUT endpoint.
 *
 * DELETE /equipment/:id (admin)
 *   Response 200: { deleted: true }
 *   Fails 409 IN_USE: FK constraint from maintenance_requests (no CASCADE)
 *
 * ════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './EquipmentPage.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUSES = ['working', 'under_repair', 'retired'];
function labelStatus(s) {
  if (s === 'under_repair') return 'Under Repair';
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
  if (v == null) return '—';
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
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

// ─── Equipment Form Modal (Create + Edit) ────────────────────────────────────
function EquipmentFormModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial);
  const empty = { name: '', category: '', purchase_date: '', cost: '', status: 'working' };
  const [form, setForm] = useState(
    isEdit ? {
      name:          initial.name          ?? '',
      category:      initial.category      ?? '',
      purchase_date: initial.purchase_date ?? '',
      cost:          initial.cost != null ? String(initial.cost) : '',
      status:        initial.status        ?? 'working',
    } : empty
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }));
    setFieldErrors(e => { const n = { ...e }; delete n[f]; return n; });
    setServerError('');
  }

  function validate() {
    const err = {};
    if (!form.name.trim())     err.name     = 'Name is required';
    if (!form.category.trim()) err.category = 'Category is required';
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0))
      err.cost = 'Cost must be 0 or more';
    return err;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (Object.keys(err).length) { setFieldErrors(err); return; }

    const body = { name: form.name.trim(), category: form.category.trim() };
    if (form.purchase_date) body.purchase_date = form.purchase_date;
    if (form.cost !== '')   body.cost = parseFloat(form.cost);
    if (isEdit)             body.status = form.status;

    setIsSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.put(`/equipment/${initial.equipment_id}`, body);
        onSave(data);
      } else {
        const { data } = await api.post('/equipment', body);
        onSave(data);
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const fe = {};
        err.details.forEach(d => { fe[d.field] = d.message; });
        setFieldErrors(fe);
      } else {
        setServerError(err.message ?? 'Save failed. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  const F = ({ name, label, required, children }) => (
    <div className={styles.field}>
      <label htmlFor={`eq-${name}`}
             className={`${styles.label} ${required ? styles.required : ''}`}>{label}</label>
      {children}
      {fieldErrors[name] && <span className={styles.fieldError}>{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="eq-modal-title">
        <div className={styles.modalHeader}>
          <span id="eq-modal-title" className={styles.modalTitle}>
            {isEdit ? `Edit — ${initial.name}` : 'Add Equipment'}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>
            {serverError && <div className={styles.formError}>{serverError}</div>}

            <F name="name" label="Equipment Name" required>
              <input ref={firstRef} id="eq-name" type="text"
                     className={`${styles.input} ${fieldErrors.name ? styles.invalid : ''}`}
                     value={form.name} onChange={e => set('name', e.target.value)}
                     placeholder="e.g. Treadmill T1" disabled={isSaving} />
            </F>

            <div className={styles.formRow}>
              <F name="category" label="Category" required>
                <input id="eq-category" type="text"
                       className={`${styles.input} ${fieldErrors.category ? styles.invalid : ''}`}
                       value={form.category} onChange={e => set('category', e.target.value)}
                       placeholder="e.g. Cardio, Strength" disabled={isSaving} />
              </F>
              <F name="cost" label="Cost (₹)">
                <input id="eq-cost" type="number" min="0" step="100"
                       className={`${styles.input} ${fieldErrors.cost ? styles.invalid : ''}`}
                       value={form.cost} onChange={e => set('cost', e.target.value)}
                       placeholder="e.g. 85000" disabled={isSaving} />
              </F>
            </div>

            <div className={styles.formRow}>
              <F name="purchase_date" label="Purchase Date">
                <input id="eq-purchase_date" type="date"
                       className={styles.input}
                       value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
                       disabled={isSaving} />
              </F>
              {isEdit && (
                <F name="status" label="Status">
                  <select id="eq-status"
                          className={styles.select}
                          value={form.status} onChange={e => set('status', e.target.value)}
                          disabled={isSaving}>
                    {STATUSES.map(s => <option key={s} value={s}>{labelStatus(s)}</option>)}
                  </select>
                </F>
              )}
            </div>

            {isEdit && (
              <div className={styles.triggerNote}>
                ℹ️ Reporting a maintenance issue auto-sets status to <strong>Under Repair</strong>.
                Resolving the issue auto-sets it back to <strong>Working</strong>.
                You can also override the status manually above.
              </div>
            )}
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ────────────────────────────────────────────────────
function DeleteModal({ equipment, onConfirm, onClose, isDeleting, error }) {
  return (
    <div className={styles.overlay}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="eq-del-title">
        <div className={styles.deleteBody}>
          <div className={styles.deleteWarning}>⚠️</div>
          <h2 id="eq-del-title" className={styles.deleteTitle}>Delete Equipment</h2>
          <p className={styles.deleteMsg}>
            Permanently delete <span className={styles.deleteName}>{equipment.name}</span>?
          </p>
          <p className={styles.deleteNote}>
            If this equipment has any maintenance requests on record, the database will block
            the deletion. Resolve or close all linked requests first.
          </p>
          {error && <div className={styles.formError} style={{ marginBottom: 18, textAlign: 'left' }}>{error}</div>}
          <div className={styles.deleteActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isDeleting}>Cancel</button>
            <button className={styles.deleteBtn} onClick={onConfirm} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EquipmentPage ────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const [equipment,   setEquipment]   = useState([]);
  const [status,      setStatus]      = useState('loading');
  const [errMsg,      setErrMsg]      = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null);
  // null | {type:'create'} | {type:'edit',item} | {type:'delete',item}
  const [deleteErr,   setDeleteErr]   = useState('');
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [toast,       setToast]       = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const fetchEquipment = useCallback(async (statusF, categoryF) => {
    setStatus('loading');
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (statusF)   params.set('status', statusF);
      if (categoryF) params.set('category', categoryF);
      // GET /equipment?status=&category=
      const { data } = await api.get(`/equipment?${params}`);
      setEquipment(data);
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message ?? 'Failed to load equipment.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchEquipment(statusFilter, categoryFilter);
  }, [statusFilter, categoryFilter, fetchEquipment]);

  // Derive unique categories from fetched data for filter dropdown
  const categories = [...new Set(equipment.map(e => e.category))].sort();

  // Client-side name search over server-filtered list
  const q = search.toLowerCase().trim();
  const filtered = q
    ? equipment.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    : equipment;

  function handleSaved(result) {
    const wasEdit = modal?.type === 'edit';
    setModal(null);
    showToast(wasEdit ? 'Equipment updated.' : 'Equipment added successfully.');
    fetchEquipment(statusFilter, categoryFilter);
  }

  async function handleDelete() {
    setDeleteErr('');
    setIsDeleting(true);
    try {
      await api.delete(`/equipment/${modal.item.equipment_id}`);
      const name = modal.item.name;
      setModal(null);
      showToast(`"${name}" deleted.`);
      fetchEquipment(statusFilter, categoryFilter);
    } catch (err) {
      if (err.code === 'IN_USE') {
        setDeleteErr(
          'Cannot delete: this equipment has linked maintenance requests. ' +
          'Resolve or remove those requests first.'
        );
      } else if (err.code === 'NOT_FOUND') {
        setDeleteErr('Equipment not found — may already have been deleted.');
        setTimeout(() => { setModal(null); fetchEquipment(statusFilter, categoryFilter); }, 1500);
      } else {
        setDeleteErr(err.message ?? 'Delete failed. Try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <Toast msg={toast} />

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Equipment</h1>
          <p className={styles.pageSubtitle}>
            Gym equipment inventory — track status, costs, and purchase history
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setModal({ type: 'create' })}>
          <PlusIcon /> Add Equipment
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input type="search" className={styles.searchInput}
                 placeholder="Search name or category…"
                 value={search} onChange={e => setSearch(e.target.value)}
                 aria-label="Search equipment" />
        </div>
        <select className={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{labelStatus(s)}</option>)}
        </select>
        <select className={styles.filterSelect}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {status === 'success' && (
          <span className={styles.countText}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Purchase Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skRow}>
                  {[20, 110, 80, 80, 60, 80, 70].map((w, j) => (
                    <td key={j}><div className={styles.skBar} style={{ height: 12, width: w }} /></td>
                  ))}
                </tr>
              ))}

              {status === 'success' && filtered.map(eq => (
                <tr key={eq.equipment_id}>
                  <td className={styles.muted}>#{eq.equipment_id}</td>
                  <td style={{ fontWeight: 600 }}>{eq.name}</td>
                  <td className={styles.muted}>{eq.category}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[eq.status]}`}>
                      <span className={styles.dot} />
                      {labelStatus(eq.status)}
                    </span>
                  </td>
                  <td>{fmtINR(eq.cost)}</td>
                  <td className={styles.muted}>{fmtDate(eq.purchase_date)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} title="Edit"
                              onClick={() => setModal({ type: 'edit', item: eq })}>
                        <EditIcon />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.delete}`} title="Delete"
                              onClick={() => { setDeleteErr(''); setModal({ type: 'delete', item: eq }); }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {status === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>⚠️</div>
              <div className={styles.stateTitle}>Could not load equipment</div>
              <div className={styles.stateMsg}>{errMsg}</div>
              <button className={styles.retryBtn}
                      onClick={() => fetchEquipment(statusFilter, categoryFilter)}>Retry</button>
            </div>
          )}

          {status === 'success' && filtered.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.stateIcon}>{search ? '🔍' : '🏋️'}</div>
              <div className={styles.stateTitle}>
                {search ? 'No equipment matches your search' : 'No equipment found'}
              </div>
              <div className={styles.stateMsg}>
                {search ? 'Try a different name.' : 'Add your first piece of equipment above.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <EquipmentFormModal initial={null} onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <EquipmentFormModal initial={modal.item} onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          equipment={modal.item}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
          isDeleting={isDeleting}
          error={deleteErr}
        />
      )}
    </div>
  );
}
