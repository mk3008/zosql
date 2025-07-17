import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: [
    './src/web-ui/**/*.{html,js}',
    './src/web-ui/static/**/*.{html,js}'
  ],
  theme: {
    extend: {
      colors: {
        // zosql専用色
        'cte': {
          'primary': '#3b82f6',    // CTE関連
          'secondary': '#64748b',   // セカンダリ
          'success': '#10b981',     // 成功
          'warning': '#f59e0b',     // 警告
          'error': '#ef4444'        // エラー
        },
        'query': {
          'primary': '#10b981',     // クエリ関連
          'secondary': '#6b7280'
        },
        'bg': {
          'primary': '#ffffff',
          'secondary': '#f8fafc',
          'tertiary': '#f1f5f9',
          'hover': '#e2e8f0',
          'active': '#cbd5e1'
        },
        'text': {
          'primary': '#1e293b',
          'secondary': '#64748b',
          'tertiary': '#94a3b8'
        },
        'border': {
          'primary': '#e2e8f0',
          'secondary': '#cbd5e1'
        }
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace']
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem'
      }
    }
  },
  plugins: []
})