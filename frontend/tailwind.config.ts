import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // GetYourGuide-inspired palette
        brand: {
          DEFAULT: "#ff5533", // coral
          dark: "#e63f16",
          soft: "#fff1ee",
        },
        ink: "#05203c", // primary text / dark badges
        muted: "#5a6c7a", // secondary text
        line: "#e4e9ed", // borders
        discount: "#1a7a4c", // sale price green
        star: "#ff5533",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(5 32 60 / 0.08), 0 1px 2px -1px rgb(5 32 60 / 0.06)",
        pop: "0 8px 30px rgb(5 32 60 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
