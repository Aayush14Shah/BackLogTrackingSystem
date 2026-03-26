/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono:    ['IBM Plex Mono', 'Courier New', 'monospace'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          fail:     '#c0392b',
          pass:     '#1a6b3c',
          promoted: '#1a4a7a',
          backlog:  '#ea580c',
          bg:       '#f5f1eb',
        },
      },
    },
  },
  plugins: [],
}
