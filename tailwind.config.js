/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme inspired colors
        primary: {
          500: '#0e639c',
          600: '#007acc',
          700: '#0c5d8a'
        },
        dark: {
          // Background colors
          primary: '#1e1e1e',
          secondary: '#252526', 
          tertiary: '#2d2d30',
          hover: '#383838',
          active: '#3c3c3c',
          
          // Text colors
          text: {
            primary: '#cccccc',
            secondary: '#888888',
            white: '#ffffff',
            muted: '#666666'
          },
          
          // Border colors
          border: {
            primary: '#454545',
            accent: '#007acc'
          }
        },
        
        // Status colors
        success: '#4caf50',
        warning: '#ffa500', 
        error: '#f44336',
        info: '#2196f3'
      },
      
      spacing: {
        'header': '60px',
        'tab': '40px',
        'toolbar': '40px',
        'sidebar': '300px',
        'context-sidebar': '400px'
      },
      
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace']
      },
      
      animation: {
        'slide-in-bottom': 'slideInBottom 0.3s ease-out',
      },
      
      keyframes: {
        slideInBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}