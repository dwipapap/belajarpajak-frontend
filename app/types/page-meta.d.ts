import type { Role } from './api'

declare module '#app' {
  interface PageMeta {
    /** Roles allowed by the `role` middleware. Empty/absent = any authenticated user. */
    roles?: Role[]
  }
}

export {}
