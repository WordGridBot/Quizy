/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          void: "#030712",     // Absolute deep space black
          obsidian: "#0d1117", // Polished graphite panel background
          slate: "#1f2937",    // Tactical borders and sub-cards
          cyan: "#06b6d4",     // Primary interactive glow elements
          emerald: "#10b981",  // Correct answer / success states
          crimson: "#f43f5e",  // Incorrect choice / warning states
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};