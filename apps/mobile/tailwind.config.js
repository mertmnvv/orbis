/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base:     "#0a0a0a",
          surface:  "#141414",
          elevated: "#1e1e1e",
          border:   "#2a2a2a",
        },
        accent: {
          DEFAULT: "#f97316",
          muted:   "#431407",
          light:   "#fed7aa",
        },
        mtext: {
          primary:   "#ffffff",
          secondary: "#a1a1aa",
          muted:     "#52525b",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger:  "#ef4444",
      },
    },
  },
  plugins: [],
};
