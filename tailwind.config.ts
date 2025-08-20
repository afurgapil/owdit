import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "open-sans": ["var(--font-open-sans)", "sans-serif"],
        raleway: ["var(--font-raleway)", "sans-serif"],
      },
      colors: {
        "neon-blue": "#00f3ff",
        "neon-purple": "#b400ff",
        "neon-green": "#00ff41",
        "neon-pink": "#ff0080",
        "neon-orange": "#ff6b35",
        "neon-red": "#ff4757",
        "dark-bg": "#0a0a0a",
        "darker-bg": "#050505",
        "card-bg": "rgba(15, 15, 15, 0.9)",
        "border-glow": "rgba(0, 243, 255, 0.3)",
        "owl-gold": "#ffd700",
        "owl-amber": "#ff8c00",
      },
      animation: {
        "cyberpunk-pulse": "cyberpunk-pulse 2s infinite",
        "matrix-rain": "matrix-rain 25s linear infinite",
        "owl-float": "owl-float 4s ease-in-out infinite",
      },
      keyframes: {
        "cyberpunk-pulse": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.8",
            transform: "scale(1.08)",
          },
        },
        "matrix-rain": {
          "0%": {
            transform: "translateY(-100vh)",
          },
          "100%": {
            transform: "translateY(100vh)",
          },
        },
        "owl-float": {
          "0%, 100%": {
            transform: "translateY(0px) rotate(0deg)",
          },
          "25%": {
            transform: "translateY(-10px) rotate(2deg)",
          },
          "50%": {
            transform: "translateY(-5px) rotate(0deg)",
          },
          "75%": {
            transform: "translateY(-15px) rotate(-2deg)",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
