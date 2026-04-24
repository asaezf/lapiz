import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0b0b10",
        panel: "#15151d",
        accent: "#f5c518",
        danger: "#ef4444",
        good: "#22c55e",
      },
    },
  },
  plugins: [],
};
export default config;
