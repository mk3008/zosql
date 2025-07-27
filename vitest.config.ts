import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
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
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['node_modules', 'dist'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts']
    }
  };
});