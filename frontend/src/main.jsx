/**
 * src/main.jsx
 * ------------
 * The entry point — the first JavaScript file the browser runs.
 *
 * What happens here:
 *   1. React finds the <div id="root"> in index.html.
 *   2. createRoot tells React to take control of that div.
 *   3. render() puts our app tree inside it.
 *   4. StrictMode is a development-only wrapper that highlights potential
 *      problems by rendering components twice (helps catch bugs early).
 *   5. AuthProvider wraps everything so any component can call useAuth().
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
