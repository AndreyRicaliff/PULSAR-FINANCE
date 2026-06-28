import type { Config } from 'tailwindcss'

/** Tokens Claude Design (CLAUDE.md §15) via CSS vars (canais RGB) — dark/light por classe no <html>. */
const cor = (nome: string) => `rgb(var(--c-${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: cor('primary'),
        secondary: cor('secondary'),
        accent: cor('accent'),
        danger: cor('danger'),
        warn: cor('warn'),
        info: cor('info'),
        bg: cor('bg'),
        surface: cor('surface'),
        surface2: cor('surface2'),
        surface3: cor('surface3'),
        bd: cor('bd'),
        text: cor('text'),
        muted: cor('muted'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        titulo: ['Inter', 'system-ui', 'sans-serif'],
        apoio: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
} satisfies Config
