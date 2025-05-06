// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

// GitHub Pages deployment uses the repository name as the base path
// We'll set it to '/boardie02/' for GitHub Pages
export default defineConfig({
  base: '/boardie02/', // Base path for GitHub Pages
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
