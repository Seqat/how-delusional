import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Base path is "./" so the built site also works on GitHub Pages project URLs
// (https://<user>.github.io/<repo>/) without rewriting assets.
export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any);
