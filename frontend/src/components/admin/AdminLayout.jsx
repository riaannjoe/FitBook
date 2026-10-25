/**
 * src/components/admin/AdminLayout.jsx
 * --------------------------------------
 * The persistent shell that wraps every admin page.
 * It renders the sidebar, topbar, and a content area.
 * The actual page content is passed in via the `children` prop.
 *
 * HOW IT FITS INTO ROUTING:
 * App.jsx wraps admin routes in <AdminLayout>:
 *
 *   <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *     <Route element={<AdminLayout />}>           ← shell renders once
 *       <Route path="/admin"          element={<AdminDashboard />} />
 *       <Route path="/admin/members"  element={<MembersPage />} />
 *       ...
 *     </Route>
 *   </Route>
 *
 * <Outlet /> below renders whichever child route matched. The sidebar
 * and topbar stay in place; only the <Outlet> content swaps.
 *
 * NAV ITEMS:
 * `implemented: true`  → renders as a real NavLink.
 * `implemented: false` → renders as a disabled span with a "Soon" badge.
 *   This prevents misleading users into clicking dead routes.
 */

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

// ─── Navigation map ────────────────────────────────────────────────────────────
// Groups and items control exactly what appears in the sidebar.
// Add `implemented: true` as each Phase is delivered.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    path: '/admin',             icon: <GridIcon />,      implemented: true },
    ],
  },
  {
    label: 'Members',
    items: [
      { label: 'Members',      path: '/admin/members',     icon: <UsersIcon />,     implemented: true },
      { label: 'Plans',        path: '/admin/plans',       icon: <TagIcon />,       implemented: true },
      { label: 'Subscriptions',path: '/admin/subscriptions',icon: <CardIcon />,     implemented: true },
      { label: 'Payments',     path: '/admin/payments',    icon: <CurrencyIcon />,  implemented: true },
    ],
  },
  {
    label: 'Staff',
    items: [
      { label: 'Trainers',     path: '/admin/trainers',    icon: <StarIcon />,      implemented: true },
      { label: 'Assignments',  path: '/admin/assignments', icon: <LinkIcon />,      implemented: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Attendance',   path: '/admin/attendance',  icon: <ClockIcon />,     implemented: true },
      { label: 'Workouts',     path: '/admin/workouts',    icon: <DumbbellIcon />,  implemented: true },
      { label: 'Equipment',    path: '/admin/equipment',   icon: <ToolIcon />,      implemented: true },
      { label: 'Maintenance',  path: '/admin/maintenance', icon: <WrenchIcon />,    implemented: true },
    ],
  },
];

// ─── AdminLayout ───────────────────────────────────────────────────────────────
export default function AdminLayout({ pageTitle = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // First letter of username for the avatar circle
  const initials = user?.username?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className={styles.shell}>

      {/* ── Mobile overlay — dims the page when sidebar is open ── */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.visible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>

        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <DumbbellIcon size={18} />
          </div>
          <div>
            <div className={styles.logoText}>FitBook</div>
            <div className={styles.logoSub}>Admin Console</div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className={styles.nav} aria-label="Admin navigation">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className={styles.navSection}>
                <span className={styles.navSectionLabel}>{group.label}</span>
              </div>
              {group.items.map(item =>
                item.implemented ? (
                  // Real NavLink — React Router highlights it when the URL matches
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}  // exact match for root /admin only
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.active : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ) : (
                  // Disabled span — looks like a nav link but can't be clicked
                  <span key={item.path} className={`${styles.navLink} ${styles.soon}`}>
                    {item.icon}
                    {item.label}
                    <span className={styles.comingSoon}>Soon</span>
                  </span>
                )
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar footer: user card + logout */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <div className={styles.userName}>{user?.username}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogoutIcon />
            Log out
          </button>
        </div>

      </aside>

      {/* ── Main area ── */}
      <div className={styles.main}>

        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            <HamburgerIcon />
          </button>
          <span className={styles.topbarTitle}>{pageTitle}</span>
          <span className={styles.topbarUser}>
            Signed in as <strong>{user?.username}</strong>
          </span>
        </header>

        {/* Page content — Outlet renders the matched child route */}
        <main className={styles.content}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}

// ─── SVG icon set (self-contained, no library) ────────────────────────────────
function DumbbellIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="1"  y="10" width="3" height="4" rx="1" opacity="0.7"/>
      <rect x="4"  y="8"  width="3" height="8" rx="1"/>
      <rect x="17" y="10" width="3" height="4" rx="1" opacity="0.7"/>
      <rect x="17" y="8"  width="3" height="8" rx="1"/>
      <rect x="7"  y="11" width="10" height="2" rx="1" opacity="0.9"/>
    </svg>
  );
}
function GridIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function UsersIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function TagIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function CardIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function CurrencyIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function StarIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function LinkIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function ClockIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function ToolIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function WrenchIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function HamburgerIcon(){ return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function LogoutIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
