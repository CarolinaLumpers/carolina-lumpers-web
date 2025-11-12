/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cls-amber': '#FFBF00',
        'cls-gold': '#E8A317',
        'cls-charcoal': '#1a1a1a',
        'cls-dark': '#0f0f0f',
      },
      fontFamily: {
        'anton': ['Anton', 'sans-serif'],
        'roboto': ['Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
