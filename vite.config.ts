import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const isGitHubPages = mode === 'production' && process.env.NODE_ENV === 'production';
  
  return {
    plugins: [react()],
    base: isGitHubPages ? '/zosql/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@core': path.resolve(__dirname, './src/core'),
        '@adapters': path.resolve(__dirname, './src/adapters'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    optimizeDeps: {
      exclude: ['@electric-sql/pglite']
    },
    server: {
      port: 3000,
      open: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    build: {
      outDir: 'docs',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'monaco-editor': ['monaco-editor', '@monaco-editor/react'],
            'pglite': ['@electric-sql/pglite'],
            'rawsql': ['rawsql-ts']
          }
        }
      },
      // GitHub Pages用の最適化
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    assetsInclude: ['**/*.wasm'],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts']
    }
  }
})