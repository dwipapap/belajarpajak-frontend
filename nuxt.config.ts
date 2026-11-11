// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  // Light only (DESIGN.md: no dark mode). Without this, Nuxt UI follows the
  // OS theme and renders its components dark under our light page shell.
  ui: {
    colorMode: false
  },

  // SPA mode: auth lives entirely client-side (JWT in memory + refresh token in
  // localStorage), so there is nothing useful to render on the server.
  ssr: false,

  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE in .env
      apiBase: 'http://localhost:8000'
    }
  }
})
