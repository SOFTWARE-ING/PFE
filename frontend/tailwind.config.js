export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2563EB",
          secondary: "#7C3AED",
          accent: "#0EA5E9",
        },

        surface: {
          light: "#F4F7FB",
          dark: "#0F172A",
        },

        card: {
          light: "#FFFFFF",
          dark: "#1E293B",
        },

        border: {
          light: "#E2E8F0",
          dark: "#334155",
        },

        text: {
          primaryLight: "#0F172A",
          secondaryLight: "#475569",

          primaryDark: "#E2E8F0",
          secondaryDark: "#94A3B8",
        },
      },
    },
  },

  plugins: [],
};