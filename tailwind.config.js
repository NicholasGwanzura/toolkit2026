/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.{html,js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-honor-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // HEVACRAZ brand palette use hevac-* in components
        hevac: {
          primary:    '#2C2420', // Rich charcoal
          secondary:  '#D4A574', // Warm terracotta
          accent:     '#5A7D5A', // Sage green
          highlight:  '#FF6B35', // Electric orange (CTAs)
          bg:         '#FDF8F3', // Warm off-white (page background)
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
