import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: resolve(__dirname, 'src/main/webapp/static'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ts'),
      '@legacy': resolve(__dirname, 'src/main/webapp/javascript'),
    },
  },
  build: {
    outDir: 'dist/webclient',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/webapp/webclient/index.html'),
      },
    },
    target: 'es2022',
    minify: 'esbuild',
  },
  server: {
    port: 8080,
    proxy: {
      '/civsocket': {
        target: 'ws://localhost:8002',
        ws: true,
      },
      '/civclientlauncher': 'http://localhost:8002',
    },
  },
});
