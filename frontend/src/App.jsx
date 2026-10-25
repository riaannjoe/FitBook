/**
 * src/App.jsx
 * -----------
 * Application router — Phase 3H update.
 *
 * Admin route structure uses two nested layout routes:
 *   1. <ProtectedRoute allowedRoles={['admin']} />  — auth + role guard
 *   2. <AdminLayout />                              — sidebar + topbar shell
 *
 * Implemented admin pages (Phases 3A–3H):
 *   Dashboard, Members, Plans, Subscriptions, Payments,
 *   Trainers, Attendance, Workouts, Equipment, Maintenance
 *
 * Trainer and member routes remain as Phase 2 placeholders.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Shared guards and layout
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout    from './components/admin/AdminLayout';

// Public
import LoginPage      from './pages/LoginPage';

// Admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import MembersPage        from './pages/admin/MembersPage';
import PlansPage          from './pages/admin/PlansPage';
import SubscriptionsPage  from './pages/admin/SubscriptionsPage';
import PaymentsPage       from './pages/admin/PaymentsPage';
import TrainersPage       from './pages/admin/TrainersPage';
import AttendancePage     from './pages/admin/AttendancePage';
import WorkoutsPage       from './pages/admin/WorkoutsPage';
import EquipmentPage      from './pages/admin/EquipmentPage';
import MaintenancePage    from './pages/admin/MaintenancePage';
import ComingSoon         from './pages/admin/ComingSoon';

// Phase 2 placeholders (trainer / member unchanged)
import TrainerHome    from './pages/TrainerHome';
import MemberHome     from './pages/MemberHome';

// ─── Root redirect ────────────────────────────────────────────────────────────
function RootRedirect() {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  const home = user.role === 'admin'   ? '/admin'
             : user.role === 'trainer' ? '/trainer'
             : '/member';
  return <Navigate to={home} replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Admin — protected, then wrapped in the persistent shell ── */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/admin/members"      element={<MembersPage />} />
            <Route path="/admin/plans"        element={<PlansPage />} />
            <Route path="/admin/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/admin/payments"      element={<PaymentsPage />} />
            <Route path="/admin/trainers"     element={<TrainersPage />} />
            <Route path="/admin/assignments"  element={<ComingSoon page="Trainer Assignments" />} />
            <Route path="/admin/attendance"   element={<AttendancePage />} />
            <Route path="/admin/workouts"     element={<WorkoutsPage />} />
            <Route path="/admin/equipment"    element={<EquipmentPage />} />
            <Route path="/admin/maintenance"  element={<MaintenancePage />} />
          </Route>
        </Route>

        {/* ── Trainer (Phase 2 placeholder) ── */}
        <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
          <Route path="/trainer" element={<TrainerHome />} />
        </Route>

        {/* ── Member (Phase 2 placeholder) ── */}
        <Route element={<ProtectedRoute allowedRoles={['member']} />}>
          <Route path="/member" element={<MemberHome />} />
        </Route>

        {/* ── Root ── */}
        <Route path="/"  element={<RootRedirect />} />
        <Route path="*"  element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
