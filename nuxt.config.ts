// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  // SPA mode: auth lives entirely client-side (JWT in memory + refresh token in
  // localStorage), so there is nothing useful to render on the server in Phase 1.
  ssr: false,

  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE in .env
      apiBase: 'http://localhost:8000'
    }
  }
})
