/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/**/*.{html,ts}',
    './libs/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--pp-primary, #7C3AED)',
          50: 'var(--pp-primary-50, #f5f3ff)',
          100: 'var(--pp-primary-100, #ede9fe)',
          600: 'var(--pp-primary-600, #7C3AED)',
          700: 'var(--pp-primary-700, #6d28d9)',
        },
      },
    },
  },
  plugins: [],
};
