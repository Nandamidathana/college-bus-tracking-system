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
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#BAE0FD',
          300: '#7CC5FB',
          400: '#38A5F6',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F172A',
        },
        pastel: {
          yellow: '#2563EB',
          cream: '#F8FAFC',
          mint: '#F1F5F9',
          softTeal: '#64748B',
          deepTeal: '#1E293B',
          darkText: '#0F172A',
        },
        live: '#10b981',
        warning: '#f59e0b',
        offline: '#64748b',
        danger: '#ef4444',
      },
      borderRadius: {
        '4xl': '1.25rem',
        '5xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'glass-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        'pill-yellow': '0 1px 2px 0 rgba(37, 99, 235, 0.2)',
        'pill-teal': '0 1px 2px 0 rgba(30, 41, 59, 0.2)',
      },
    },
  },
  plugins: [],
}
