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
        // Neutral dark grays for dark mode — NOT green
        dark: {
          900: "#111318",  // page background
          800: "#1a1d24",  // sidebar / topbar
          700: "#21252e",  // card surface
          600: "#2a2f3a",  // borders
          500: "#383e4a",  // subtle borders / dividers
          400: "#6b7280",  // muted text / icons
          300: "#9ca3af",  // secondary text
          200: "#d1d5db",  // primary text
          100: "#f3f4f6",  // headings / white text
        },
      },
    },
  },
  plugins: [],
};
