/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Noun-specific colors
        'noun-bg': '#1a1a1a',
        'noun-card': '#2d2d2d',
        'noun-border': '#333',
        'noun-accent': '#4CAF50',
        'noun-blue': '#2196F3',
        'noun-orange': '#FF9800',
        'noun-red': '#FF5722',
        'noun-text': '#ffffff',
        'noun-text-muted': '#888',
        'noun-text-dim': '#666',
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { 
            borderColor: '#4CAF50',
            boxShadow: '0 0 20px rgba(76, 175, 80, 0.3)'
          },
          '50%': { 
            borderColor: '#66BB6A',
            boxShadow: '0 0 30px rgba(76, 175, 80, 0.5)'
          },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      gridTemplateColumns: {
        'auto-fit-200': 'repeat(auto-fit, minmax(200px, 1fr))',
      }
    },
  },
  plugins: [],
}
