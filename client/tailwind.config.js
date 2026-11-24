/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // Design system tokens
        nav: {
          DEFAULT: '#142235',
          light: '#1a2d45',
          hover: '#1f3654',
        },
        surface: {
          DEFAULT: '#F4F6F9',
          card: '#FFFFFF',
          muted: '#F8FAFC',
        },
        action: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#15803D',
          light: '#F0FDF4',
          text: '#166534',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
          text: '#92400E',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
          text: '#991B1B',
        },
        txt: {
          DEFAULT: '#172033',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'nav': '2px 0 8px 0 rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
}
