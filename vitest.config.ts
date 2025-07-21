import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  },
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    globals: true
  }
});