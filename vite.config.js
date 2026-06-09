import { resolve } from 'path';
import { defineConfig } from 'vite';

// Vite config: point the root at /src so index.html and partials live next to source code.
// Static assets in src/public/ are served from the site root (e.g. /favicon.svg).
export default defineConfig({
  root: 'src',
  publicDir: 'public',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        coin: resolve(__dirname, 'src/coin.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
