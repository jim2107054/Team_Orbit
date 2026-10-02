import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "var(--font-poppins)", "sans-serif"],
        nunito: ["Nunito", "var(--font-nunito)", "sans-serif"],
        bangla: ["Hind Siliguri", "var(--font-bn)", "sans-serif"],
      },
      colors: {
        upay: {
          orange: "#FF9F43",
          hover: "#F08E2F",
          navy: "#212B36",
          dark: "#092C4C",
          blue: "#034078",
          teal: "#05A677",
          green: "#198754",
          red: "#FF0000",
          card: "#FFFFFF",
          canvas: "#F7F7F7",
          border: "#DADFE5",
          muted: "#646B72"
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
        'scale-up': 'scaleUp 0.2s ease-out forwards'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
};
export default config;
