/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        islamic: {
          green: '#14532d',
          gold: '#c89b3c'
        }
      }
    }
  },
  plugins: []
}
