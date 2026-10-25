/**
 * src/api/client.js
 * -----------------
 * A thin wrapper around the browser's native fetch() API.
 *
 * WHY NOT AXIOS?
 * axios is a popular library, but native fetch is built into every modern
 * browser — no extra download needed. Our backend's response format is simple
 * enough that a small wrapper is all we need.
 *
 * HOW IT WORKS (step by step):
 *   1. Read VITE_API_BASE from the .env file (/api/v1).
 *   2. Build the full URL: /api/v1 + the path you pass in.
 *   3. Grab the JWT token from localStorage (set later by the login page).
 *   4. Add the Authorization header if a token exists.
 *   5. Call fetch(), parse the JSON response.
 *   6. If the backend returned { success: false }, throw a rich error object.
 *   7. If fetch() itself failed (network down, etc.), that error propagates too.
 *   8. On success, return { data, meta? } so callers can use it directly.
 */

// Vite exposes env variables that start with VITE_ to the browser.
// Fallback to '/api/v1' so the file still works if .env is missing.
const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
// The key name is centralised here so every part of the app uses the same one.
const TOKEN_KEY = 'fitbook_token';

export const getToken    = ()      => localStorage.getItem(TOKEN_KEY);
export const saveToken   = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = ()      => localStorage.removeItem(TOKEN_KEY);

// ─── Core request function ────────────────────────────────────────────────────
/**
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} path   - e.g. '/members' or '/auth/login'
 * @param {object} [body] - for POST / PUT / PATCH requests
 * @returns {Promise<{ data: any, meta?: object }>}
 * @throws  An error with .message, .code, .status, and .details
 */
async function request(method, path, body) {
  // Build request headers
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build fetch options
  const options = { method, headers };
  if (body !== undefined) {
    // JSON.stringify converts the JS object to a string the server can read
    options.body = JSON.stringify(body);
  }

  // Make the HTTP request.
  // If the network is down, fetch() itself throws — that error is NOT caught
  // here so it bubbles up to the caller (no silent failures).
  const response = await fetch(`${BASE}${path}`, options);

  // Parse the response body as JSON.
  // The backend ALWAYS returns JSON (even for errors), so this should
  // always succeed. If somehow it doesn't, we throw a clear message.
  let json;
  try {
    json = await response.json();
  } catch {
    throw Object.assign(
      new Error(`Server returned non-JSON (HTTP ${response.status})`),
      { status: response.status, code: 'PARSE_ERROR' }
    );
  }

  // The backend uses: { success: true,  data: ..., meta?: ... }
  //                or { success: false, error: { code, message, details? } }
  if (!json.success) {
    // Build a proper Error so stack traces work in dev tools.
    const err = new Error(json.error?.message ?? 'Request failed');
    err.code    = json.error?.code;      // e.g. 'VALIDATION_ERROR'
    err.status  = response.status;       // e.g. 400, 401, 404
    err.details = json.error?.details;   // field-level validation errors array
    throw err;
  }

  // Return only the useful parts. Callers access result.data and result.meta.
  return { data: json.data, meta: json.meta };
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Named methods so call sites read naturally: api.get('/members')
export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};
