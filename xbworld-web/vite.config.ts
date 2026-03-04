import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ts'),
      '@legacy': resolve(__dirname, 'src/main/webapp/javascript'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'src/main/webapp/javascript/ts-bundle'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/ts/main.ts'),
      formats: ['iife'],
      fileName: 'main',
      name: 'XBWorld',
    },
    rollupOptions: {
      external: ['pixi.js'],
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
