/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/appearance/**/*.tsx', './src/ui/**/*.tsx'],
  corePlugins: {preflight: false},
  future: {hoverOnlyWhenSupported: true},
  theme: {
    extend: {
      colors: {
        background: 'var(--surface)', foreground: 'var(--ink)',
        border: 'var(--line)', input: 'var(--control-line)', ring: 'var(--focus)',
        primary: {DEFAULT: 'var(--accent)', foreground: 'var(--on-accent)'},
        secondary: {DEFAULT: 'var(--quiet)', foreground: 'var(--ink)'},
        muted: {DEFAULT: 'var(--quiet)', foreground: 'var(--sub)'},
        accent: {DEFAULT: 'var(--selected)', foreground: 'var(--accent-ink)'},
      },
    },
  },
};
