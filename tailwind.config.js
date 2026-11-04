/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#dbe4f0',
          200: '#b8cce0',
          300: '#8aa8c8',
          400: '#5e7fa8',
          500: '#3f6088',
          600: '#2f4a6b',
          700: '#243a55',
          800: '#1a2c41',
          900: '#122031',
          950: '#0a1421',
        },
        forest: {
          50: '#f0faf3',
          100: '#dcf2e3',
          200: '#bbe5ca',
          300: '#8ad3a5',
          400: '#54b97c',
          500: '#319e5c',
          600: '#23804a',
          700: '#1d663c',
          800: '#1a5132',
          900: '#16422a',
          950: '#0b2618',
        },
        sand: {
          50: '#fbf8f3',
          100: '#f5efe3',
          200: '#ebe0c8',
          300: '#dccaa4',
          400: '#c9ad7c',
          500: '#b8945f',
          600: '#a37e51',
          700: '#876544',
          800: '#6f5339',
          900: '#5c4531',
          950: '#33271b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(18, 32, 49, 0.06), 0 1px 2px rgba(18, 32, 49, 0.04)',
        'card-hover': '0 8px 24px rgba(18, 32, 49, 0.08), 0 2px 6px rgba(18, 32, 49, 0.04)',
        glow: '0 0 0 8px rgba(49, 158, 92, 0.12)',
        'glow-navy': '0 0 0 8px rgba(47, 74, 107, 0.14)',
        'glow-rec': '0 0 0 10px rgba(220, 38, 38, 0.18)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'pulse-ring': 'pulse-ring 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
