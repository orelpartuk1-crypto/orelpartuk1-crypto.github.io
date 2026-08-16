/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS variable defined in index.css, so light
// and dark are two sets of values rather than two sets of class names. The
// <alpha-value> placeholder keeps opacity modifiers (bg-white/90, text-ink/70)
// working exactly as they do with normal Tailwind colours.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep, calm green — used for anything the user acts on.
        brand: {
          50: v('brand-50'),
          100: v('brand-100'),
          200: v('brand-200'),
          500: v('brand-500'),
          600: v('brand-600'),
          700: v('brand-700'),
        },
        // The soft ground the hero cards sit on.
        mint: {
          100: v('mint-100'),
          200: v('mint-200'),
          300: v('mint-300'),
        },
        // Money direction, applied consistently everywhere: out is red, in is green.
        spend: v('spend'),
        earn: v('earn'),
        // Page background — never pure white, so cards read as raised without
        // needing heavy shadows.
        surface: v('surface'),
        ink: v('ink'),
        muted: v('muted'),
        // `white` is really "card surface". Left literal it would stay blazing
        // white at night on every card in the app.
        white: v('card'),
        // Tailwind's stock slate is a cool blue-grey that fights the warm
        // ground, and is a fixed light ramp besides. Remapped so dividers,
        // chips and placeholders re-tune with the theme.
        slate: {
          50: v('n-50'),
          100: v('n-100'),
          200: v('n-200'),
          300: v('n-300'),
          400: v('n-400'),
          500: v('n-500'),
          600: v('n-600'),
          700: v('n-700'),
          800: v('n-800'),
          900: v('n-900'),
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,36,26,0.04), 0 6px 20px rgba(18,36,26,0.045)',
        lift: '0 4px 12px rgba(18,36,26,0.08), 0 12px 32px rgba(18,36,26,0.07)',
        fab: '0 6px 16px rgba(15,122,62,0.35)',
        nav: '0 2px 24px rgba(18,36,26,0.10)',
      },
      borderRadius: {
        xl2: '1.5rem',
        xl3: '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.34s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        pop: 'pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
