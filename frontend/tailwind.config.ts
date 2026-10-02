import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["var(--font-outfit)", "Outfit", "sans-serif"],
        jakarta: ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
        poppins: ["var(--font-outfit)", "Poppins", "sans-serif"],
        nunito: ["var(--font-jakarta)", "Nunito", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        bangla: ["var(--font-bn)", "Hind Siliguri", "sans-serif"],
      },
      colors: {
        flame: {
          50: "#FFF5ED",
          100: "#FFE6D4",
          200: "#FFC8A3",
          300: "#FFA46B",
          400: "#FF7E33",
          500: "#FF5E00",
          600: "#F04C00",
          700: "#CC3B00",
          800: "#A32F00",
          900: "#7A2400",
        },
        obsidian: {
          950: "#08090D",
          900: "#0D0F16",
          850: "#12151F",
          800: "#181C2A",
          750: "#1F2436",
          700: "#272E43",
          600: "#36405C",
        },
        upay: {
          gold: "#FFB800",
          amber: "#FF8A00",
          flame: "#FF5E00",
          hover: "#F59E0B",
          glow: "rgba(255, 94, 0, 0.35)",
          navy: "#0A0C12",
          "navy-dark": "#07080C",
          "navy-light": "#141724",
          card: "#FFFFFF",
          "card-dark": "#12151F",
          canvas: "#F8FAFC",
          "canvas-dark": "#090A0F",
          border: "#E2E8F0",
          "border-dark": "#222738",
          muted: "#64748B",
          "muted-dark": "#94A3B8",
          teal: "#05A677",
          emerald: "#10B981",
          rose: "#F43F5E",
          cyan: "#0EA5E9",
          orange: "#FF6A00",
          dark: "#090A0F",
          blue: "#0284C7",
          green: "#10B981",
          red: "#EF4444",
        }
      },
      backgroundImage: {
        'flame-gradient': 'linear-gradient(135deg, #FF5E00 0%, #FF8A00 50%, #FFA000 100%)',
        'flame-glow': 'linear-gradient(180deg, #FF8A00 0%, #FF5E00 100%)',
        'dark-card-glass': 'linear-gradient(135deg, rgba(24, 28, 42, 0.8) 0%, rgba(14, 17, 26, 0.85) 100%)',
        'sunset-glow': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(220, 68, 5, 0.22) 0%, rgba(9, 10, 15, 0.95) 75%)',
        'sunset-radial': 'radial-gradient(circle at 50% 0%, rgba(255, 94, 0, 0.18) 0%, transparent 65%)',
      },
      boxShadow: {
        'flame': '0 4px 20px -2px rgba(255, 94, 0, 0.35)',
        'flame-lg': '0 8px 30px -4px rgba(255, 94, 0, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-subtle': '0 4px 24px -1px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 10s linear infinite',
        'scale-up': 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 10px rgba(255,94,0,0.5))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 3px rgba(255,94,0,0.15))' }
        }
      }
    },
  },
  plugins: [],
};
export default config;
