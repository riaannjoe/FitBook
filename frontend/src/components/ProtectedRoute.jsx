/**
 * src/components/ProtectedRoute.jsx
 * ----------------------------------
 * A wrapper component that guards routes from unauthenticated or
 * unauthorised access.
 *
 * HOW REACT ROUTER'S <Outlet> WORKS:
 * In React Router v6 you can nest routes. When you wrap a group of routes
 * with a layout component, <Outlet> is the placeholder where the matched
 * child route renders. ProtectedRoute uses this pattern:
 *
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/admin" element={<AdminHome />} />
 *   </Route>
 *
 * When someone visits /admin, React Router renders <ProtectedRoute>.
 * If the user passes all checks, <Outlet> renders <AdminHome> inside it.
 * If not, the user is redirected before <AdminHome> ever renders.
 *
 * allowedRoles is optional. If omitted, any authenticated user may enter.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Full-page spinner shown while session is being restored ──────────────────
function InitializingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: '16px',
    }}>
      {/* Simple CSS spinner — no library needed */}
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--gold)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
        Restoring session…
      </p>
      {/* The keyframe animation lives here as an inline <style> tag. */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
/**
 * @param {string[]} [allowedRoles] - e.g. ['admin'] or ['admin','trainer']
 *                                    Omit to allow any authenticated user.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isInitializing } = useAuth();

  // 1. Session restoration is still in progress — don't decide yet.
  if (isInitializing) return <InitializingScreen />;

  // 2. No authenticated user — send to login.
  //    `replace` prevents the login page from appearing in browser history,
  //    so the back button doesn't loop back to the protected page.
  if (!user) return <Navigate to="/login" replace />;

  // 3. Authenticated, but wrong role for this section.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own home instead of showing an error wall.
    const home = user.role === 'admin'   ? '/admin'
               : user.role === 'trainer' ? '/trainer'
               : '/member';
    return <Navigate to={home} replace />;
  }

  // 4. All checks passed — render the matched child route.
  return <Outlet />;
}
