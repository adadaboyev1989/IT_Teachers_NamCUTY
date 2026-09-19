/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          500: '#f59e0b',
        },
        // `surface` and `neutral-*` are driven by CSS variables (defined in
        // index.css, flipped under the `.dark` class) rather than fixed hex
        // values. That's what lets every existing `bg-neutral-50`,
        // `text-neutral-900` etc. across the app automatically adapt to dark
        // mode with no per-component `dark:` classes needed — only the
        // saturated badge colors (emerald/amber/red/primary-50 tints) need
        // explicit dark: variants, since those stay on Tailwind's static
        // palette. `white` itself is deliberately left as real, fixed white —
        // it's used for text on colored gradients (always light), whereas
        // card/header backgrounds use the new `surface` token instead of
        // `white` so they can go dark.
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        neutral: {
          50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pop-in': 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'float-up-fade': 'floatUpFade 1.3s ease-out forwards',
        'unlock-shake': 'unlockShake 0.6s ease-in-out 0.1s both',
        'confetti-pop': 'confettiPop 1s ease-out both',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        popIn: {
          '0%': { opacity: 0, transform: 'scale(0.3)' },
          '60%': { opacity: 1, transform: 'scale(1.15)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        floatUpFade: {
          '0%': { opacity: 0, transform: 'translateY(0) scale(0.85)' },
          '15%': { opacity: 1, transform: 'translateY(-2px) scale(1.05)' },
          '80%': { opacity: 1, transform: 'translateY(-30px) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-46px) scale(0.95)' },
        },
        unlockShake: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-14deg)' },
          '40%': { transform: 'rotate(11deg)' },
          '60%': { transform: 'rotate(-7deg)' },
          '80%': { transform: 'rotate(4deg)' },
        },
        confettiPop: {
          '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0) rotate(0deg)' },
          '25%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(60deg)' },
          '100%': {
            opacity: 0,
            transform: 'translate(calc(-50% + var(--confetti-x)), calc(-50% + var(--confetti-y))) scale(0.8) rotate(220deg)',
          },
        },
      },
    },
  },
  plugins: [],
}
