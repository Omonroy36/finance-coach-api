import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/main.ts', 'src/workers/worker.main.ts'],
    },
  },
  resolve: {
    alias: {
      '@/config': resolve(__dirname, 'src/config'),
      '@/plugins': resolve(__dirname, 'src/plugins'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/modules': resolve(__dirname, 'src/modules'),
      '@/workers': resolve(__dirname, 'src/workers'),
    },
  },
});
