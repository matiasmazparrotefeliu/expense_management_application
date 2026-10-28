import { defineConfig } from 'vitest/config';
import path from 'path';
import tailwindcss from 'tailwindcss';

// Next.js builds with its own pipeline and `postcss.config.mjs` (plugins by
// string name); running the suite also through that file fails because Vite
// rejects string plugins, so the vitest-only vite session declares Tailwind
// inline (autoprefixer is browser-only and unnecessary under jsdom).
export default defineConfig({
  // Test-only JSX transform: tsconfig uses `jsx: preserve` for Next's own
  // pipeline, but the vitest/esbuild session needs the Automatic runtime
  // (the test files don't `import React`).
  esbuild: { jsx: 'automatic' },
  css: { postcss: { plugins: [tailwindcss] } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
