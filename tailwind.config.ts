import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./styles/**/*.{css}",              
    "./globals.css",                  
    "./node_modules/@shadcn/ui/**/*.{js,ts,jsx,tsx}", // ← INI WAJIB!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
