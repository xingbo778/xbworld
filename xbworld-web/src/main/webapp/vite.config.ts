import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: false,

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        webclient: resolve(__dirname, "webclient/index.html"),
      },
    },
    sourcemap: true,
  },

  server: {
    port: 3000,
    proxy: {
      "/civsocket": {
        target: "ws://localhost:8080",
        ws: true,
      },
      "/civclientlauncher": "http://localhost:8080",
      "/game": "http://localhost:8080",
      "/agents": "http://localhost:8080",
      "/meta": "http://localhost:8080",
      "/servers": "http://localhost:8080",
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "javascript"),
    },
  },
});
