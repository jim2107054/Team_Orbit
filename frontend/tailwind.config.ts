import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        upay: {
          navy: "#0a1128",
          dark: "#001f54",
          blue: "#034078",
          teal: "#1282a2",
          light: "#00f0ff",
          gold: "#f5a623",
          crimson: "#d90429",
          emerald: "#10b981",
          slate: "#1e293b",
          card: "#0f172a"
        }
      }
    },
  },
  plugins: [],
};
export default config;
