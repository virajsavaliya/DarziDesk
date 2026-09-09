/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // SPA fallback: serve index.html for any unmatched path so the React
    // Router client can handle deep links and hard-refreshes on nested URLs
    // (e.g. /dashboard/orders, /admin/tenants). Without this Vite returns 404.
    //
    // Production equivalents:
    //   nginx:   try_files $uri $uri/ /index.html;
    //   Vercel:  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    //   Netlify: /* /index.html 200
    historyApiFallback: true,
    proxy: {
      // Proxy API calls to backend in development — avoids CORS
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
} as any)

