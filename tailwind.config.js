/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
    "./components/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        // CLS Brand Colors
        'cls-amber': '#FFC107',
        'cls-yellow': '#FFEB3B',
        'cls-charcoal': '#1a1a1a',
        'cls-dark': '#0a0a0a',
        'cls-gray': '#333',
        'cls-light-gray': '#666',
        'cls-success': '#4CAF50',
        'cls-error': '#f44336',
        'cls-warning': '#FF9800',
        'cls-info': '#2196F3',
      },
      fontFamily: {
        'anton': ['Anton', 'sans-serif'],
      },
      spacing: {
        'space-xs': '4px',
        'space-sm': '8px',
        'space-md': '16px',
        'space-lg': '24px',
        'space-xl': '32px',
        'space-2xl': '48px',
      },
      borderRadius: {
        'radius-sm': '4px',
        'radius-md': '8px',
        'radius-lg': '12px',
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(255, 193, 7, 0.4)',
        'glow-amber-lg': '0 0 30px rgba(255, 193, 7, 0.6)',
      },
    },
  },
  plugins: [],
}
