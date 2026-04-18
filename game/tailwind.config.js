/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tcm-paper': '#f5e6d3',
        'tcm-ink': '#2c2c2c',
        'tcm-red': '#c0392b',
        'tcm-wood': '#27ae60',
        'tcm-water': '#2980b9',
        'tcm-metal': '#95a5a6',
        'tcm-earth': '#d35400',
      },
    },
  },
  plugins: [],
}
