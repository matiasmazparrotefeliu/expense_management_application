// Next.js requires PostCSS plugins declared by NAME (string) — it resolves
// and loads them itself. Function-style exports (the old Vite config) are
// rejected at build time with "Malformed PostCSS Configuration".
export default {
  plugins: ['tailwindcss', 'autoprefixer'],
};
