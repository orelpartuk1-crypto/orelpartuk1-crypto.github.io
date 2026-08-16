/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep, calm green — used for anything the user acts on.
        brand: {
          50: '#e8f4ec',
          100: '#c9e5d3',
          200: '#a3d3b5',
          500: '#0f7a3e',
          600: '#0c6733',
          700: '#0a5429',
        },
        // The soft mint the hero cards sit on.
        mint: {
          100: '#dceee2',
          200: '#c3ddca',
          300: '#a8cdb3',
        },
        // Money direction, applied consistently everywhere: out is red, in is green.
        spend: '#d24a3c',
        earn: '#0f7a3e',
        // Page background — a warm off-white with a hint of green, never pure white,
        // so the white cards read as raised without needing heavy shadows.
        surface: '#eff3ed',
        ink: '#12241a',
        muted: '#7c8a80',
        // Tailwind's stock slate is a cool blue-grey and fights the warm
        // background everywhere it appears. Remapping the ramp itself re-tunes
        // every existing slate-* usage — dividers, chips, placeholders — in one
        // place, instead of hunting them down one by one.
        slate: {
          50: '#f5f8f3',
          100: '#e9eee7',
          200: '#d7ded4',
          300: '#b9c4b6',
          400: '#98a495',
          500: '#7c8a80',
          600: '#5f6c63',
          700: '#48534c',
          800: '#333b36',
          900: '#1d231f',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        // Barely-there: depth comes from the tinted background, not from shadow.
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
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.34s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheet-up 0.36s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        pop: 'pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
