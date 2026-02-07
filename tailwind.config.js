/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        beefy: {
          primary: '#2C254A',
          'primary-light': '#3A2D6C',
          purple: '#6B3B9D',
          blue: '#293B7D',
          accent: '#E78E4E',
          'accent-red': '#D33E3E',
          cream: '#F9E9D7',
          'cream-light': '#FDF5EC',
          muted: '#A7B3BF',
          /* Светлая тема: вторичный текст */
          'text-secondary': '#4E4563',
          /* Тёмная тема: высокий контраст */
          'dark-bg': '#1A1726',
          'dark-bg-card': '#25203A',
          'dark-text': '#FFFFFF',
          'dark-text-muted': '#DED9EC',
          'dark-border': '#5C5778',
        },
      },
    },
  },
  plugins: [],
}
