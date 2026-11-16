/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        circle: {
          amber: '#F59E0B',
          orange: '#EA580C',
          gold: '#FDBC1F',
          dark: '#0F172A',
          muted: '#475569',
          border: '#E2E8F0',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          warm: '#FFFBEB',
          surface: '#F1F5F9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'sans-serif'],
      },
      keyframes: {
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1.0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        slideUp: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fadeIn: 'fadeIn 0.2s ease-out',
      }
    },
  },
  plugins: [],
}
