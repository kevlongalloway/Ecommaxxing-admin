/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shopify: {
          green: '#008060',
          'green-hover': '#006e52',
          'green-light': '#f1f8f5',
        },
      },
    },
  },
  plugins: [],
}
