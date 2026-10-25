import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,        // frontend runs on http://localhost:3000
    proxy: {
      // Any request whose URL starts with /api is forwarded to the backend.
      // Example: GET /api/v1/health  -->  http://localhost:5000/api/v1/health
      //
      // We do NOT rewrite the path, because the backend already expects /api/v1/...
      // changeOrigin: true makes the request appear to come from localhost:5000,
      // which satisfies the backend's CORS check during development.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
