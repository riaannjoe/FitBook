/**
 * src/context/AuthContext.jsx
 * ---------------------------
 * The single source of truth for authentication state across the app.
 *
 * WHAT IT DOES:
 *   - On startup, checks localStorage for a saved token.
 *     If found, validates it against GET /auth/me.
 *     If valid → restores the session. If invalid/expired → clears it.
 *   - Exposes login(), logout(), user, and role helpers to all components.
 *   - The `isInitializing` flag prevents the router from flashing the login
 *     page before we've had a chance to restore a saved session.
 *
 * IMPORTANT: /auth/me returns { user_id, username, role, created_at,
 *            member_id, trainer_id }. We normalize it to the same shape
 *            as the login response ({ id, username, role, member_id,
 *            trainer_id }) so the rest of the app always sees one shape.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, saveToken, removeToken } from '../api/client';

// ─── Create the context ───────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  // null  = logged out
  // object = { id, username, role, member_id, trainer_id }
  const [user, setUser] = useState(null);

  // true while we're checking an existing token on first load.
  // Components should show a spinner (not render routes) until this is false.
  const [isInitializing, setIsInitializing] = useState(true);

  // ── Session restoration on app start ──────────────────────────────────────
  useEffect(() => {
    // Only run once, when the component first mounts.
    async function restoreSession() {
      const token = getToken();

      if (!token) {
        // No token in localStorage — user has never logged in (or logged out).
        setIsInitializing(false);
        return;
      }

      try {
        // Validate the stored token against the real backend.
        // GET /auth/me returns:
        //   { user_id, username, role, created_at, member_id, trainer_id }
        // Note: the field is `user_id` here, not `id`. We normalize below.
        const { data } = await api.get('/auth/me');

        // Normalize to the canonical user shape used everywhere in the app.
        setUser({
          id:          data.user_id,   // normalize: /auth/me uses user_id
          username:    data.username,
          role:        data.role,
          member_id:   data.member_id,
          trainer_id:  data.trainer_id,
        });
      } catch {
        // Token was rejected (expired, revoked, or corrupted).
        // Clean up so the user sees the login page cleanly.
        removeToken();
      } finally {
        // Whether success or failure, we're done initializing.
        setIsInitializing(false);
      }
    }

    restoreSession();
  }, []); // ← empty dependency array = run once on mount

  // ── login() ───────────────────────────────────────────────────────────────
  // Called by LoginPage after a successful POST /auth/login.
  // The login response `user` shape: { id, username, role, member_id, trainer_id }
  const login = (token, userData) => {
    saveToken(token);  // persist to localStorage
    setUser(userData); // update React state → triggers re-render → router redirects
  };

  // ── logout() ──────────────────────────────────────────────────────────────
  // Called by any component with a logout button.
  const logout = () => {
    removeToken();
    setUser(null);
    // Navigation to /login is handled by ProtectedRoute when user becomes null.
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  // These make conditional rendering readable:
  //   if (isAdmin)   → show admin-only button
  //   if (isMember)  → show member-only section
  const isAdmin   = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const isMember  = user?.role === 'member';

  return (
    <AuthContext.Provider value={{
      user,
      isInitializing,
      login,
      logout,
      isAdmin,
      isTrainer,
      isMember,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Custom hook ──────────────────────────────────────────────────────────────
// Any component can do:  const { user, login, logout } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
