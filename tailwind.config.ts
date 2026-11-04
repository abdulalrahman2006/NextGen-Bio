import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // these five follow light / dark mode
        paper: "rgb(var(--c-paper) / <alpha-value>)", slate9: "rgb(var(--c-ink) / <alpha-value>)", slate7: "rgb(var(--c-muted) / <alpha-value>)",
        slate5: "rgb(var(--c-faint) / <alpha-value>)", slate3: "rgb(var(--c-line) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)", ok: "rgb(var(--c-ok) / <alpha-value>)", warn: "rgb(var(--c-warn) / <alpha-value>)",
        // these never change
        gold: "#D9A15F", night: "#1D2B36", snow: "#F8FAFC",
      },
      fontFamily: { sans: ['"Helvetica Neue"', "Inter", "Arial", "sans-serif"] },
      fontSize: { mega: ["10vw", { lineHeight: "0.85", letterSpacing: "-0.05em" }] },
    },
  },
  plugins: [],
} satisfies Config;
