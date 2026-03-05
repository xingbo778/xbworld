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
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const BACKEND = process.env.BACKEND_URL || 'https://xbworld-production.up.railway.app';
const backendWs = BACKEND.replace(/^http/, 'ws');

// Use egress proxy if available (e.g. in Claude Code web environment),
// but skip it when connecting to a local backend.
const isLocalBackend = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BACKEND);
const proxyEnv = !isLocalBackend ? (process.env.HTTPS_PROXY || process.env.https_proxy) : undefined;
const httpsAgent = proxyEnv
  ? new HttpsProxyAgent(proxyEnv)
  : new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      timeout: 30000,
    });

// Common proxy options for all API endpoints
const apiProxy: Record<string, unknown> = {
  target: BACKEND,
  changeOrigin: true,
  secure: false,
  ...(BACKEND.startsWith('https') ? { agent: httpsAgent } : {}),
};

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

    proxy: {
      // WebSocket proxy — browser connects to local ws://localhost:3000/civsocket/...
      // and we forward to the remote backend
      '/civsocket': {
        target: backendWs,
        ws: true,
        changeOrigin: true,
        secure: false,
        ...(proxyEnv ? { agent: httpsAgent } : {}),
      },

      // API endpoints — must cover all backend routes
      '/civclientlauncher': apiProxy,
      '/validate_user': apiProxy,
      '/login_user': apiProxy,
      '/meta': apiProxy,
      '/game': apiProxy,
      '/servers': apiProxy,
      '/motd.js': apiProxy,
      '/agents': apiProxy,
      '/observer': apiProxy,
    },
  },
});
