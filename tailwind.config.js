/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // core surfaces
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",

        // brand accents (from HDI theme reference)
        primary: {
          DEFAULT: "#0f172a", // dark navy/slate
          foreground: "#f8fafc",
        },
        accent: {
          indigo: "#6366F1",
          cyan: "#22D3EE",
        },
        status: {
          success: "#22C55E",
          "success-light": "#DCFCE7",
          warning: "#F59E0B",
          "warning-light": "#FEF3C7",
          danger: "#EF4444",
          "danger-light": "#FEE2E2",
          info: "#3B82F6",
          "info-light": "#DBEAFE",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        display: ["Pragmatica", "Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        card: "0 4px 20px rgba(15, 23, 42, 0.08)",
        "card-dark": "0 4px 20px rgba(0, 0, 0, 0.4)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
