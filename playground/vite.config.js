import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  // Project Pages URL: https://tenphi.github.io/okhst/
  base: process.env.GH_PAGES ? '/okhst/' : '/',
});
