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
        glass: {
          deep:    "#0a0a1a",     // Rich indigo-black base canvas
          surface: "#ffffff08",   // Frosted card fill (white 3%)
          border:  "#ffffff18",   // Translucent glass edge (white 9%)
          hover:   "#ffffff12",   // Subtle hover lift
          accent:  "#818cf8",     // Primary indigo-violet accent
          glow:    "#c084fc",     // Secondary purple glow
          success: "#34d399",     // Correct / positive states
          danger:  "#fb7185",     // Incorrect / error states
          amber:   "#fbbf24",     // Timer / speed / rank highlights
          muted:   "#94a3b8",     // De-emphasized text
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
        glass: "16px",
        heavy: "24px",
      },
      boxShadow: {
        glass:      "0 8px 32px rgba(0, 0, 0, 0.3)",
        "glass-sm": "0 4px 16px rgba(0, 0, 0, 0.2)",
        glow:       "0 0 20px rgba(129, 140, 248, 0.15)",
        "glow-lg":  "0 0 40px rgba(129, 140, 248, 0.2)",
        "glow-success": "0 0 20px rgba(52, 211, 153, 0.15)",
        "glow-danger":  "0 0 20px rgba(251, 113, 133, 0.15)",
      },
      animation: {
        "float-slow":    "float 8s ease-in-out infinite",
        "float-mid":     "float 6s ease-in-out infinite 2s",
        "float-fast":    "float 5s ease-in-out infinite 4s",
        "pulse-glow":    "pulseGlow 4s ease-in-out infinite",
        "shimmer":       "shimmer 2s ease-in-out infinite",
        "fade-in":       "fadeIn 0.4s ease-out forwards",
        "slide-up":      "slideUp 0.5s ease-out forwards",
        "spin-slow":     "spin 12s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%":      { transform: "translateY(-20px) scale(1.05)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":      { opacity: "0.8", transform: "scale(1.1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};