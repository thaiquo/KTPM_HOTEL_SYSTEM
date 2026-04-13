/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        "primary-light": "var(--color-primary-light)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        border: "var(--color-border)",
        "text-muted": "var(--color-text-muted)",
      },
      fontFamily: {
        sans: ["var(--font-family-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto"],
        serif: ["var(--font-family-serif)"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px rgba(0, 0, 0, 0.08)",
        base: "0 2px 4px rgba(0, 0, 0, 0.1)",
        md: "0 4px 8px rgba(0, 0, 0, 0.12)",
        lg: "0 8px 16px rgba(0, 0, 0, 0.15)",
        xl: "0 12px 24px rgba(0, 0, 0, 0.18)",
        "2xl": "0 20px 40px rgba(0, 0, 0, 0.2)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--color-foreground)",
            a: {
              color: "var(--color-primary)",
              "&:hover": {
                color: "var(--color-primary-dark)",
              },
            },
          },
        },
      },
    },
  },
  plugins: [],
}
