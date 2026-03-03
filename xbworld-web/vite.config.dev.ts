/**
 * Vite dev config for local frontend development against a remote backend.
 *
 * Usage:
 *   # Connect to the production Railway backend
 *   BACKEND_URL=https://xbworld-production.up.railway.app npx vite --config vite.config.dev.ts
 *
 *   # Or connect to a local backend
 *   BACKEND_URL=http://localhost:8080 npx vite --config vite.config.dev.ts
 *
 * This serves the legacy webapp files locally and proxies API/WebSocket
 * requests to the remote backend, so you can iterate on frontend code
 * without rebuilding or redeploying the backend (which takes ~5 minutes).
 *
 * The TS bundle is built on-the-fly by Vite's dev server with HMR.
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

const BACKEND = process.env.BACKEND_URL || 'https://xbworld-production.up.railway.app';
const backendWs = BACKEND.replace(/^http/, 'ws');

export default defineConfig({
  root: resolve(__dirname, 'src/main/webapp'),

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ts'),
      '@legacy': resolve(__dirname, 'src/main/webapp/javascript'),
    },
  },

  // In dev mode, serve TS as native ESM (no bundling needed)
  // The entry point is referenced from webclient/index.html
  build: {
    outDir: resolve(__dirname, 'src/main/webapp/javascript/ts-bundle'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/ts/main.ts'),
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['pixi.js'],
    },
    target: 'es2022',
    minify: false,
  },

  server: {
    port: 3000,
    allowedHosts: true,
    // open: '/webclient/index.html?action=new&type=singleplayer',

    proxy: {
      // WebSocket proxy — browser connects to local ws://localhost:3000/civsocket/...
      // and we forward to the remote backend
      '/civsocket': {
        target: backendWs,
        ws: true,
        changeOrigin: true,
      },

      // API endpoints — must cover all backend routes
      '/civclientlauncher': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/validate_user': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/login_user': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/meta': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/game': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/servers': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/motd.js': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/agents': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/observer': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
});
