import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ command, mode }) => {
  // Command parameter unused in current config
  void command;
  const isGitHubPages = mode === 'production' && process.env.NODE_ENV === 'production';
  
  return {
    plugins: [
      react(),
      // GitHub Pages SPA fallback plugin
      {
        name: 'github-pages-spa-fallback',
        writeBundle() {
          if (isGitHubPages) {
            const outDir = 'docs';
            try {
              // Create SPA fallback for client-side routing
              const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
              fs.writeFileSync(path.join(outDir, '404.html'), indexHtml);
              
              // Disable Jekyll processing for GitHub Pages
              fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
              
              console.log('Created GitHub Pages files: 404.html and .nojekyll');
            } catch (error) {
              console.error('Failed to create GitHub Pages files:', error);
              // Continue build process despite the error
            }
          }
        }
      }
    ],
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