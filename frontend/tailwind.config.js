/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F7F6',
          100: '#D5E9DE',
          200: '#B8DCcf',
          300: '#94C6BD',
          400: '#75AFA5',
          500: '#4D968B',
          600: '#285D59',
          700: '#204C49',
          800: '#183B38',
          900: '#102725',
        },
        pastel: {
          yellow: '#FFD166',
          cream: '#FFF7DF',
          mint: '#D5E9DE',
          softTeal: '#75AFA5',
          deepTeal: '#285D59',
          darkText: '#172522',
        },
        live: '#10b981',
        warning: '#f59e0b',
        offline: '#6b7280',
        danger: '#ef4444',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glass': '0 12px 36px -6px rgba(40, 93, 89, 0.08), 0 4px 12px -2px rgba(40, 93, 89, 0.04)',
        'glass-hover': '0 20px 40px -8px rgba(40, 93, 89, 0.14), 0 6px 16px -3px rgba(40, 93, 89, 0.06)',
        'pill-yellow': '0 4px 18px 0 rgba(255, 209, 102, 0.45)',
        'pill-teal': '0 4px 18px 0 rgba(40, 93, 89, 0.35)',
      },
    },
  },
  plugins: [],
}
