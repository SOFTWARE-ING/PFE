/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        army: {
          50:  "#f2f7ec",
          100: "#e0ecd1",
          200: "#c3dba5",
          300: "#9fc472",
          400: "#7aab44",
          500: "#5d8f2e",
          600: "#4a7223",
          700: "#3a581b",
          800: "#2e4415",
          900: "#243310",
          950: "#141d08",
        },
      },
    },
  },
  plugins: [],
};
