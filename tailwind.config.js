/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        rule: 'var(--rule)',
        cash: 'var(--cash)',
        threshold: 'var(--threshold)',
        shortfall: 'var(--shortfall)',
        decision: 'var(--decision)',
      }
    },
  },
  plugins: [],
}
