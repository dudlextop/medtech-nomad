import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        surface: "hsl(var(--surface))",
        "surface-soft": "hsl(var(--surface-soft))",
        "brand-hover": "hsl(var(--brand-hover))",
        "brand-soft": "hsl(var(--brand-soft))",
        "ink-soft": "hsl(var(--ink-soft))"
      },
      fontFamily: {
        sans: ["Aptos", "SF Pro Text", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "ui-monospace", "Menlo", "monospace"]
      },
      boxShadow: {
        panel: "0 14px 34px rgba(17, 19, 28, 0.06)",
        hero: "0 28px 80px rgba(17, 19, 28, 0.10)",
        search: "0 20px 48px rgba(17, 19, 28, 0.12)",
        offer: "0 18px 46px rgba(17, 19, 28, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
