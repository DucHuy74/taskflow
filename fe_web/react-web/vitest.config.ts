import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        '**/types/**',
        '**/*.d.ts',
      ],
    },
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    typecheck: {
      enabled: false, // Disable type checking for tests to avoid conflicts
    },
  },
});
