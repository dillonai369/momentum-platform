import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Momentum brand palette
        canvas: "#FFFFFF",
        surface: "#F8F9FB",
        muted: "#F1F2F5",
        ink: {
          DEFAULT: "#0A0E1A",
          soft: "#1F2937",
          subtle: "#6B7280",
          faint: "#9CA3AF",
        },
        line: {
          DEFAULT: "#E5E7EB",
          soft: "#EEF0F3",
        },
        // Sidebar (dark)
        nav: {
          DEFAULT: "#0A0E1A",
          hover: "#1A1F2E",
          active: "#252B3D",
          border: "#1F2433",
          text: "#E5E7EB",
          muted: "#9CA3AF",
        },
        // Accents
        purple: {
          DEFAULT: "#7C3AED",
          deep: "#5B21B6",
          soft: "#EDE9FE",
        },
        blue: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          soft: "#DBEAFE",
        },
        // States
        success: { DEFAULT: "#10B981", soft: "#D1FAE5" },
        warning: { DEFAULT: "#F59E0B", soft: "#FEF3C7" },
        danger: { DEFAULT: "#EF4444", soft: "#FEE2E2" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 14, 26, 0.04)",
        cardHover: "0 4px 12px rgba(10, 14, 26, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
