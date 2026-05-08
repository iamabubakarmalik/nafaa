/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9f3',
          100: '#d6f0e3',
          200: '#aee0c7',
          300: '#7ecaa6',
          400: '#4eaf81',
          500: '#2c9466',
          600: '#1f7752',
          700: '#1a5f43',
          800: '#174c37',
          900: '#143f2e',
        },
        accent: {
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -15px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
