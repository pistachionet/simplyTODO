import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    // Use "projects" to isolate server (node) and client (jsdom) envs.
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['tests/server/**/*.test.js'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['tests/client/**/*.test.{js,jsx}'],
          setupFiles: ['./tests/setup.js'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.js', 'client/src/**/*.{js,jsx}'],
      exclude: ['server/index.js', '**/*.test.{js,jsx}'],
    },
  },
});
