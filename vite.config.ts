import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Actions sets this to /repository-name/. It remains / for local use
  // and for username.github.io repositories.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: { target: 'es2020' },
});
