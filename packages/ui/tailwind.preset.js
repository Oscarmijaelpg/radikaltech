import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--color-primary) / <alpha-value>)",
          hover: "hsl(var(--color-primary-hover) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-secondary) / <alpha-value>)",
          hover: "hsl(var(--color-secondary-hover) / <alpha-value>)",
        },
        bg: "hsl(var(--color-bg) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        foreground: "hsl(var(--color-fg) / <alpha-value>)",
        muted: "hsl(var(--color-muted) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--color-card) / <alpha-value>)",
          hover: "hsl(var(--color-card-hover) / <alpha-value>)",
        },
        sentiment: {
          positive: "hsl(var(--color-sentiment-positive) / <alpha-value>)",
          neutral: "hsl(var(--color-sentiment-neutral) / <alpha-value>)",
          negative: "hsl(var(--color-sentiment-negative) / <alpha-value>)",
        },
        chart: {
          primary: "hsl(var(--color-chart-primary) / <alpha-value>)",
          grid: "hsl(var(--color-chart-grid) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 10px 40px -10px hsl(var(--color-primary) / 0.15)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [typography],
};
