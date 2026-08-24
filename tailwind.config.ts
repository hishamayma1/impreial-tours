import type { Config } from 'tailwindcss'

/**
 * Design tokens are lifted verbatim from the Stitch "Egypt Offers Carousel" screen
 * (stitch/egypt-offers-carousel/index.html) so the CMS-driven build is pixel-faithful
 * to the approved design, then extended with semantic brand aliases.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — the navy used for every CTA, chip and dark section.
        brand: {
          DEFAULT: '#10223b',
          dark: '#0a1728',
          light: '#1c3a63',
        },
        'on-primary-container': '#798aa8',
        'inverse-primary': '#b6c7e8',
        'on-surface-variant': '#44474d',
        background: '#fcf9f8',
        'tertiary-container': '#321d00',
        'primary-fixed-dim': '#b6c7e8',
        'inverse-surface': '#313030',
        'outline-variant': '#c5c6ce',
        'primary-container': '#10223b',
        error: '#ba1a1a',
        'surface-container-lowest': '#ffffff',
        secondary: '#5d5f5d',
        'surface-variant': '#e5e2e1',
        'on-tertiary-fixed-variant': '#5c421e',
        'error-container': '#ffdad6',
        'on-secondary-fixed-variant': '#454746',
        'inverse-on-surface': '#f3f0ef',
        'on-secondary-fixed': '#1a1c1b',
        'on-primary-fixed': '#091c35',
        outline: '#75777e',
        'on-surface': '#1c1b1b',
        'surface-container-highest': '#e5e2e1',
        'surface-container': '#f0eded',
        'on-tertiary-fixed': '#2a1800',
        'on-tertiary': '#ffffff',
        'tertiary-fixed': '#ffddb6',
        surface: '#fcf9f8',
        'secondary-container': '#e2e3e1',
        'surface-container-low': '#f6f3f2',
        'on-primary': '#ffffff',
        'on-secondary-container': '#636563',
        'on-error': '#ffffff',
        'surface-dim': '#dcd9d9',
        'secondary-fixed': '#e2e3e1',
        primary: '#000b1f',
        'primary-fixed': '#d5e3ff',
        'secondary-fixed-dim': '#c6c7c5',
        'tertiary-fixed-dim': '#e7c092',
        tertiary: '#130900',
        'on-background': '#1c1b1b',
        'surface-bright': '#fcf9f8',
        'on-error-container': '#93000a',
        'on-tertiary-container': '#a58359',
        'on-primary-fixed-variant': '#374762',
        'on-secondary': '#ffffff',
        'surface-container-high': '#eae7e7',
        'surface-tint': '#4e5f7b',
        /**
         * Spec Section 0 semantic aliases. `accent` is the one accent colour
         * (navy #10223B) and `hairline` is the 1px border used on every card.
         */
        accent: {
          DEFAULT: '#10223b',
          dark: '#0a1728',
          light: '#1c3a63',
        },
        hairline: '#c5c6ce',
      },
      borderColor: {
        hairline: '#c5c6ce',
      },
      borderWidth: {
        hairline: '1px',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        'section-v-padding': '112px',
        'stack-sm': '16px',
        'stack-md': '32px',
        'stack-lg': '64px',
        'grid-gutter': '32px',
        'grid-margin': '48px',
      },
      fontFamily: {
        'display-hero': ['var(--font-display)', 'Playfair Display', 'serif'],
        'display-hero-mobile': ['var(--font-display)', 'Playfair Display', 'serif'],
        'headline-section': ['var(--font-display)', 'Playfair Display', 'serif'],
        'headline-card': ['var(--font-display)', 'Playfair Display', 'serif'],
        'body-lg': ['var(--font-body)', 'Inter', 'sans-serif'],
        'body-md': ['var(--font-body)', 'Inter', 'sans-serif'],
        'label-caps': ['var(--font-body)', 'Inter', 'sans-serif'],
        caption: ['var(--font-body)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'display-hero': ['64px', { lineHeight: '1.1', letterSpacing: '0.02em', fontWeight: '500' }],
        'display-hero-mobile': [
          '40px',
          { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '500' },
        ],
        'headline-section': [
          '32px',
          { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '500' },
        ],
        'headline-card': ['24px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-caps': ['13px', { lineHeight: '1.0', letterSpacing: '0.1em', fontWeight: '600' }],
        caption: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      boxShadow: {
        widget: '0 20px 50px -12px rgba(0,0,0,0.15)',
        nav: '0 8px 30px -12px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        /* Loader keyframes — transform/opacity only, so they stay off the main thread. */
        'loader-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'loader-bar': {
          '0%, 100%': { transform: 'scaleY(0.35)', opacity: '0.5' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
        },
        'loader-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
