import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [react()],
  // Project Pages URL: https://tenphi.github.io/okhst/
  base: process.env.GH_PAGES ? '/okhst/' : '/',
});
