import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5425FF",
        secondary: "#24FF00",
        gray: {
          dark: "#6A6A6A",
          light: "#F2F2F2",
          lighter: "#F3F3F3",
          border: "#BFBFBF",
        },
        green: {
          light: "#E9FEE6",
        },
      },
      fontFamily: {
        pixelify: ["Pixelify Sans", "cursive"],
        figtree: ["Figtree", "sans-serif"],
        silkscreen: ["Silkscreen", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;


