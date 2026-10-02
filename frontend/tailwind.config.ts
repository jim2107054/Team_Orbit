import type { Config } from "tailwindcss";

/**
 * upay Shield — "Fintrixity" Design System
 * ------------------------------------------------------------------
 * Visual language derived from the Finance Analytics reference:
 *   · Near-black canvas, inset rounded panel, elevated matte cards
 *   · A single vivid flame-orange accent used for hero/CTA/chart focus
 *   · Generous corner radii, hairline 1px borders, soft deep shadows
 *
 * Typography is Merriweather only:
 *   · `font-display` → Merriweather (serif) for headings & hero numerals
 *   · `font-ui`      → Merriweather Sans for interface copy
 *   · `font-num`     → Merriweather Sans + tabular figures for data
 *   · `font-bangla`  → Noto Sans Bengali for Bengali script
 */

/** Merriweather (serif) — display / headings / hero figures */
const DISPLAY = ["Merriweather", "Noto Sans Bengali"];
/** Merriweather Sans — interface copy, labels, tables, numerals */
const UI = ["Merriweather Sans", "Noto Sans Bengali"];
/** Noto Sans Bengali — Bengali script first */
const BANGLA = ["Noto Sans Bengali", "Merriweather Sans"];

/** Theme-aware token helper: reads `--c-*` RGB channels set in globals.css */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

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
        // Canonical names
        display: DISPLAY,
        ui: UI,
        num: UI,
        bangla: BANGLA,
        sans: UI,
        serif: DISPLAY,
        mono: UI,
        // Legacy aliases kept so no surface regresses to a system font
        outfit: DISPLAY,
        poppins: DISPLAY,
        syne: DISPLAY,
        jakarta: UI,
        nunito: UI,
      },

      colors: {
        /* ── Theme-aware structural tokens ─────────────────────────── */
        canvas: token("canvas"),
        panel: token("panel"),
        card: token("card"),
        elev: token("elev"),
        raise: token("raise"),

        hair: token("hair"),
        hairsoft: token("hairsoft"),
        hairbold: token("hairbold"),

        ink: {
          DEFAULT: token("ink"),
          body: token("ink-body"),
          muted: token("ink-muted"),
          dim: token("ink-dim"),
        },

        inverse: {
          DEFAULT: token("inverse"),
          hi: token("inverse-hi"),
        },

        /* ── Theme-aware semantic status tokens ────────────────────── */
        success: {
          DEFAULT: token("success"),
          hi: token("success-hi"),
          lo: token("success-lo"),
        },
        danger: {
          DEFAULT: token("danger"),
          hi: token("danger-hi"),
          lo: token("danger-lo"),
        },
        info: {
          DEFAULT: token("info"),
          hi: token("info-hi"),
          lo: token("info-lo"),
        },
        iris: {
          DEFAULT: token("iris"),
          hi: token("iris-hi"),
          lo: token("iris-lo"),
        },

        /* ── Flame accent (the one brand colour) ───────────────────── */
        flame: {
          // 50/100 are *washes*, never text — they flip with the theme so a
          // warm tint never paints a white slab on the dark canvas.
          50: token("flame-50"),
          100: token("flame-100"),
          200: "#FFC4A6",
          300: "#FF9E70",
          400: "#FF7A3D",
          500: "#FF5A1F",
          600: "#F04405",
          700: "#C73504",
          800: "#9C2B06",
          900: "#7B250A",
          950: "#431003",
        },

        /* ── Ember (golden tail of the accent gradient) ────────────── */
        ember: {
          50: "#FFF8EB",
          100: "#FFEDCB",
          200: "#FFDA95",
          300: "#FFCE6B",
          400: "#FFB23D",
          500: "#FF9412",
          600: "#E87A05",
          700: "#B85C05",
          800: "#8F4809",
          900: "#753C0D",
          950: "#421D03",
        },

        /* ── Neutral ramp (overrides Tailwind's cool greys) ────────── */
        slate: {
          50: "#F5F5F7",
          100: "#ECECEF",
          200: "#DDDDE2",
          300: "#C3C3CB",
          400: "#9A9AA5",
          500: "#70707B",
          600: "#55555F",
          700: "#3C3C45",
          800: "#232329",
          900: "#15151B",
          950: "#0A0A0E",
        },
        gray: {
          50: "#F5F5F7",
          100: "#ECECEF",
          200: "#DDDDE2",
          300: "#C3C3CB",
          400: "#9A9AA5",
          500: "#70707B",
          600: "#55555F",
          700: "#3C3C45",
          800: "#232329",
          900: "#15151B",
          950: "#0A0A0E",
        },
        zinc: {
          50: "#F5F5F7",
          100: "#ECECEF",
          200: "#DDDDE2",
          300: "#C3C3CB",
          400: "#9A9AA5",
          500: "#70707B",
          600: "#55555F",
          700: "#3C3C45",
          800: "#232329",
          900: "#15151B",
          950: "#0A0A0E",
        },
        neutral: {
          50: "#F5F5F7",
          100: "#ECECEF",
          200: "#DDDDE2",
          300: "#C3C3CB",
          400: "#9A9AA5",
          500: "#70707B",
          600: "#55555F",
          700: "#3C3C45",
          800: "#232329",
          900: "#15151B",
          950: "#0A0A0E",
        },

        /* ── Accent aliases: every warm family resolves to flame ───── */
        amber: {
          50: token("flame-50"),
          100: token("flame-100"),
          200: "#FFC4A6",
          300: "#FF9E70",
          400: "#FF7A3D",
          500: "#FF5A1F",
          600: "#F04405",
          700: "#C73504",
          800: "#9C2B06",
          900: "#7B250A",
          950: "#431003",
        },
        orange: {
          50: token("flame-50"),
          100: token("flame-100"),
          200: "#FFC4A6",
          300: "#FF9E70",
          400: "#FF7A3D",
          500: "#FF5A1F",
          600: "#F04405",
          700: "#C73504",
          800: "#9C2B06",
          900: "#7B250A",
          950: "#431003",
        },
        yellow: {
          50: "#FFF8EB",
          100: "#FFEDCB",
          200: "#FFDA95",
          300: "#FFCE6B",
          400: "#FFB23D",
          500: "#FF9412",
          600: "#E87A05",
          700: "#B85C05",
          800: "#8F4809",
          900: "#753C0D",
          950: "#421D03",
        },

        /* ── Positive ramp ─────────────────────────────────────────── */
        emerald: {
          50: "#E9FBF2",
          100: "#C9F4DF",
          200: "#93E7C0",
          300: "#55D49A",
          400: "#23C17D",
          500: "#13A968",
          600: "#0C8B56",
          700: "#0B6F46",
          800: "#0A583A",
          900: "#094930",
          950: "#02281A",
        },
        green: {
          50: "#E9FBF2",
          100: "#C9F4DF",
          200: "#93E7C0",
          300: "#55D49A",
          400: "#23C17D",
          500: "#13A968",
          600: "#0C8B56",
          700: "#0B6F46",
          800: "#0A583A",
          900: "#094930",
          950: "#02281A",
        },
        teal: {
          50: "#E7FAF6",
          100: "#C3F2E9",
          200: "#8AE4D5",
          300: "#4ACFBC",
          400: "#1DB6A2",
          500: "#0C9888",
          600: "#097A6E",
          700: "#0A6158",
          800: "#0A4E47",
          900: "#09413C",
          950: "#022522",
        },

        /* ── Negative ramp ─────────────────────────────────────────── */
        rose: {
          50: "#FEF1F1",
          100: "#FDDDDD",
          200: "#FBBABB",
          300: "#F78F91",
          400: "#F26164",
          500: "#E8403F",
          600: "#D22A2A",
          700: "#AF2122",
          800: "#8F1F20",
          900: "#771F20",
          950: "#410B0C",
        },
        red: {
          50: "#FEF1F1",
          100: "#FDDDDD",
          200: "#FBBABB",
          300: "#F78F91",
          400: "#F26164",
          500: "#E8403F",
          600: "#D22A2A",
          700: "#AF2122",
          800: "#8F1F20",
          900: "#771F20",
          950: "#410B0C",
        },

        /* ── Informational ramp ────────────────────────────────────── */
        sky: {
          50: "#ECF6FE",
          100: "#D2EAFD",
          200: "#A7D5FA",
          300: "#71BBF5",
          400: "#3D9DEC",
          500: "#1A7FD6",
          600: "#1265B2",
          700: "#11518E",
          800: "#124374",
          900: "#123960",
          950: "#0A2138",
        },
        blue: {
          50: "#ECF6FE",
          100: "#D2EAFD",
          200: "#A7D5FA",
          300: "#71BBF5",
          400: "#3D9DEC",
          500: "#1A7FD6",
          600: "#1265B2",
          700: "#11518E",
          800: "#124374",
          900: "#123960",
          950: "#0A2138",
        },
        cyan: {
          50: "#E8F8FB",
          100: "#C7EFF6",
          200: "#92DFEE",
          300: "#54C8E0",
          400: "#22AACA",
          500: "#0E8CAC",
          600: "#0A718C",
          700: "#0A5B72",
          800: "#0B4A5C",
          900: "#0B3E4D",
          950: "#03222C",
        },

        /* ── Violet ramp ───────────────────────────────────────────── */
        violet: {
          50: "#F2F1FE",
          100: "#E5E2FD",
          200: "#CCC7FB",
          300: "#ADA4F8",
          400: "#8E82FF",
          500: "#6355E8",
          600: "#4E3FD1",
          700: "#4034AB",
          800: "#362C8B",
          900: "#2F2771",
          950: "#1B1643",
        },
        purple: {
          50: "#F2F1FE",
          100: "#E5E2FD",
          200: "#CCC7FB",
          300: "#ADA4F8",
          400: "#8E82FF",
          500: "#6355E8",
          600: "#4E3FD1",
          700: "#4034AB",
          800: "#362C8B",
          900: "#2F2771",
          950: "#1B1643",
        },
        indigo: {
          50: "#F2F1FE",
          100: "#E5E2FD",
          200: "#CCC7FB",
          300: "#ADA4F8",
          400: "#8E82FF",
          500: "#6355E8",
          600: "#4E3FD1",
          700: "#4034AB",
          800: "#362C8B",
          900: "#2F2771",
          950: "#1B1643",
        },

        /* ── Legacy brand aliases (kept for backwards compatibility) ─ */
        obsidian: {
          600: "#3C3C45",
          700: "#2E2E37",
          750: "#272730",
          800: "#232329",
          850: "#1B1B22",
          900: "#15151B",
          950: "#0A0A0E",
        },
        upay: {
          gold: "#FFB23D",
          amber: "#FF7A3D",
          flame: "#FF5A1F",
          hover: "#FF7A3D",
          glow: "rgba(255, 90, 31, 0.35)",
          navy: "#0A0A0E",
          "navy-dark": "#06060A",
          "navy-light": "#15151B",
          card: "#FFFFFF",
          "card-dark": "#15151B",
          canvas: "#F5F5F7",
          "canvas-dark": "#06060A",
          border: "#DDDDE2",
          "border-dark": "#232329",
          muted: "#70707B",
          "muted-dark": "#9A9AA5",
          teal: "#0C9888",
          emerald: "#13A968",
          rose: "#E8403F",
          cyan: "#0E8CAC",
          orange: "#FF5A1F",
          dark: "#06060A",
          blue: "#1A7FD6",
          green: "#13A968",
          red: "#E8403F",
        },
      },

      borderRadius: {
        "4xl": "28px",
        "5xl": "36px",
      },

      backgroundImage: {
        "flame-gradient":
          "linear-gradient(135deg, #FF4A00 0%, #FF5A1F 45%, #FF8A3D 100%)",
        "flame-glow": "linear-gradient(180deg, #FF8A3D 0%, #FF4A00 100%)",
        "flame-column":
          "linear-gradient(180deg, #FFFFFF 0%, #FFD6A8 12%, #FF8A3D 40%, #FF4A00 100%)",
        "dark-card-glass":
          "linear-gradient(135deg, rgba(30,30,38,0.86) 0%, rgba(16,16,21,0.92) 100%)",
        "sunset-glow":
          "radial-gradient(ellipse 70% 42% at 50% 0%, rgba(255, 74, 0, 0.30) 0%, rgba(6, 6, 10, 0.98) 72%)",
        "sunset-radial":
          "radial-gradient(circle at 50% 0%, rgba(255, 90, 31, 0.20) 0%, transparent 62%)",
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },

      boxShadow: {
        flame: "0 6px 22px -4px rgba(255, 90, 31, 0.42)",
        "flame-lg": "0 14px 40px -8px rgba(255, 74, 0, 0.52)",
        glass: "0 18px 48px -12px rgba(0, 0, 0, 0.62)",
        "glass-subtle": "0 8px 26px -10px rgba(0, 0, 0, 0.42)",
        "card-fx": "0 1px 2px rgba(10,10,14,0.05), 0 10px 28px -14px rgba(10,10,14,0.14)",
        "card-fx-dark": "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 44px -18px rgba(0,0,0,0.75)",
        "inset-hair": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },

      animation: {
        "fade-in": "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spin-slow": "spin 10s linear infinite",
        "scale-up": "scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "beam-flicker": "beamFlicker 4.5s ease-in-out infinite",
        "rise-in": "riseIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": {
            opacity: "1",
            filter: "drop-shadow(0 0 12px rgba(255,90,31,0.55))",
          },
          "50%": {
            opacity: "0.65",
            filter: "drop-shadow(0 0 3px rgba(255,90,31,0.18))",
          },
        },
        beamFlicker: {
          "0%, 100%": { opacity: "0.92", transform: "scaleX(1)" },
          "45%": { opacity: "1", transform: "scaleX(1.06)" },
          "70%": { opacity: "0.86", transform: "scaleX(0.97)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
