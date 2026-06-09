import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        ink: "#0a0a0b",
        surface: "#101013",
        line: "rgba(255,255,255,0.08)",
        accent: "#e8543f",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseline: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        "aurora-breathe": {
          "0%, 100%": { opacity: "0.55", transform: "translateX(-50%) scale(1)" },
          "50%": { opacity: "0.85", transform: "translateX(-50%) scale(1.08)" },
        },
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "step-in": {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.16,1,0.3,1) both",
        pulseline: "pulseline 2.4s ease-in-out infinite",
        "aurora-breathe": "aurora-breathe 7s ease-in-out infinite",
        "cursor-blink": "cursor-blink 1.1s step-start infinite",
        "step-in": "step-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
