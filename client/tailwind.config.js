/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        burando: {
          navy: {
            DEFAULT: '#132545',
            light: '#1e3a5f',
            dark: '#0a1a2e',
          },
          teal: {
            DEFAULT: '#006A82',
            light: '#0d7a94',
            dark: '#004d5e',
          },
          'bright-teal': {
            DEFAULT: '#18AA9D',
            light: '#2bb8ab',
            dark: '#138a7f',
          },
          'light-green': {
            DEFAULT: '#30EBB9',
            light: '#4df0c7',
            dark: '#26d4a5',
          },
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#006A82', // Updated to Burando teal
          600: '#004d5e',
          700: '#132545', // Updated to Burando navy
          800: '#0a1a2e',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        'burando-sm': '0 1px 2px 0 rgba(19, 37, 69, 0.05)',
        'burando-md': '0 4px 6px -1px rgba(19, 37, 69, 0.1), 0 2px 4px -1px rgba(19, 37, 69, 0.06)',
        'burando-lg': '0 10px 15px -3px rgba(19, 37, 69, 0.1), 0 4px 6px -2px rgba(19, 37, 69, 0.05)',
        'burando-xl': '0 20px 25px -5px rgba(19, 37, 69, 0.1), 0 10px 10px -5px rgba(19, 37, 69, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
