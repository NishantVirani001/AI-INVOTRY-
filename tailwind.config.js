/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base surfaces — cool graphite (dark) / cool paper (light), not warm cream
        graphite: {
          950: "#101216",
          900: "#15181E",
          800: "#1C2027",
          700: "#252A33",
          600: "#323844",
          500: "#4A5160",
        },
        paper: {
          100: "#F5F6F4",
          200: "#ECEEEA",
          300: "#DFE2DC",
        },
        // Signature accent — hazard/signage yellow, used sparingly
        signal: {
          DEFAULT: "#F5C518",
          dim: "#B99411",
          soft: "#FCE9A8",
        },
        // Functional stock-state colors (these carry real meaning, not decoration)
        stock: {
          in: "#33C481",
          low: "#F2A93B",
          out: "#F0525B",
          info: "#4C8DFF",
        },
      },
      fontFamily: {
        display: ["'Big Shoulders Display'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        "hazard-stripe":
          "repeating-linear-gradient(135deg, currentColor 0, currentColor 6px, transparent 6px, transparent 12px)",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        tag: "3px",
      },
    },
  },
  plugins: [],
};
