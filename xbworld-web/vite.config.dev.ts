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

const BACKEND = process.env.BACKEND_URL || 'https://xbworld-production.up.railway.app';
const backendWs = BACKEND.replace(/^http/, 'ws');

// Create a custom HTTPS agent that ignores certificate validation issues.
// Railway's TLS setup sometimes causes "socket disconnected before TLS
// handshake" errors with the default Node.js http-proxy agent.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  // Increase timeout to handle Railway's cold-start latency
  timeout: 30000,
});

// Common proxy options for all API endpoints
const apiProxy = {
  target: BACKEND,
  changeOrigin: true,
  secure: false,
  agent: httpsAgent,
};

// In dev mode, index.html loads <script src="/javascript/ts-bundle/main.iife.js">
// which doesn't exist (it's a production build artifact). This plugin rewrites
// that request to the TS entry point so Vite can serve it with HMR.
function devTsBundlePlugin() {
  return {
    name: 'dev-ts-bundle-redirect',
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (req.url === '/javascript/ts-bundle/main.iife.js') {
          req.url = '/@fs' + resolve(__dirname, 'src/ts/main.ts');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, 'src/main/webapp'),

  plugins: [devTsBundlePlugin()],

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
    fs: {
      // Allow serving TS source files from outside the webapp root
      allow: [resolve(__dirname, 'src')],
    },

    proxy: {
      // WebSocket proxy — browser connects to local ws://localhost:3000/civsocket/...
      // and we forward to the remote backend
      '/civsocket': {
        target: backendWs,
        ws: true,
        changeOrigin: true,
        secure: false,
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
