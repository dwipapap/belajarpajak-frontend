# AGENTS.md — pajak-simulator-frontend

Agent-facing engineering guide for this repository. Read this before writing code.
Strategic/design context lives in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md); this file covers everything else.

## 1. What this project is

**PajakSim** (display name: **"Sistem Pembelajaran Pajak Online"**, operated by *Konsultan Bisnis Sudarno*) is a multi-tenant **tax administration learning simulator** for Indonesian schools (SMK), universities, and training institutions. Students (siswa) practice creating simulated tax documents — bukti potong (BP21/BP26), and later e-faktur, kode billing, SPT — with dummy data. Teachers (guru) monitor and grade. Admins manage users and classes per institution (tenant).

### The key design idea

The UI deliberately **mimics the look, layout, and workflow of Indonesia's national tax administration portal** so that skills learned here transfer 1:1 to the real system. Fidelity to that reference system's UX (top menubar of tax modules, side-tab status navigation, dense formal tables, issue/cancel document lifecycle) is a product requirement, not a styling preference.

**Branding rule (absolute):** never use the real system's name, logo, or trademarks anywhere user-visible or in code identifiers — no "Coretax", no "DJP", no Kemenkeu logos or crests. The stand-in brand is:

| Context | Name to use |
|---|---|
| App display title (topbar, `<title>`, login) | Sistem Pembelajaran Pajak Online |
| Internal/product name (code, keys, docs) | PajakSim (`pajaksim.*` storage keys, `pajaksim` slugs) |
| Operator brand (login page) | Konsultan Bisnis Sudarno |
| Logo | Generic `i-lucide-landmark` crest, navy + gold |

Generic tax terms that also exist in the real system (BP21, BP26, eBupot, SPT, NPWP, NITKU, DPP, PPh, KAP-KJS, faktur) are domain vocabulary, not branding — use them freely.

## 2. Tech stack

- **Nuxt 4** (`app/` directory convention) + **Nuxt UI 4** + Tailwind CSS 4, TypeScript.
- **SPA mode** (`ssr: false` in `nuxt.config.ts`): auth is fully client-side, nothing useful to render on the server. Do not re-enable SSR casually — `localStorage` access and in-memory tokens assume client.
- Backend is a **separate sibling repository**: `../pajak-simulator-backend` (FastAPI + PostgreSQL). This repo never talks to the database; everything goes through the REST API.
- Icons: Lucide via `@iconify-json/lucide` (`i-lucide-*`).

## 3. Commands (Windows / PowerShell)

```powershell
npm install               # deps (postinstall runs `nuxt prepare`)
npm run dev               # dev server on http://localhost:3000
npm run typecheck         # vue-tsc — run before finishing any task
npm run build             # production build
```

- Backend must run on port 8000 first (see backend repo README). Repo-root `../dev.ps1` starts both.
- Config: only one env var, `NUXT_PUBLIC_API_BASE` (default `http://localhost:8000`), read via `useRuntimeConfig().public.apiBase`. Never hardcode the API origin.
- There is no test runner or linter configured in this repo yet; `npm run typecheck` is the quality gate.
- Seed logins (password `Password123!`): `super@pajaksim.local`, `admin@smkn1-pku.local`, `guru1@smkn1-pku.local`, `siswa1@smkn1-pku.local`.

## 4. Directory map

```
app/
├── app.vue                     # UApp wrapper, Indonesian locale, <title>
├── app.config.ts               # Nuxt UI theme: primary=indigo, neutral=slate
├── assets/css/main.css         # Tailwind/Nuxt UI imports + shared .bupot-* page shell classes
├── components/
│   └── BupotGuruMonitor.vue    # Generic guru review table, prop `module: 'bp21' | 'bp26'`
├── composables/
│   ├── useAuth.ts              # login/refresh/logout, token state, roleHome() helper
│   └── useApi.ts               # apiFetch() wrapper + apiErrorMessage() helper
├── layouts/default.vue         # Authenticated shell: branded topbar + module menubar
├── middleware/
│   ├── auth.global.ts          # Silent session restore, unauthenticated → /login
│   └── role.ts                 # Per-page guard via definePageMeta({ roles })
├── pages/
│   ├── login.vue               # layout:false, full custom login screen
│   ├── index.vue               # Redirects to roleHome()
│   ├── admin/index.vue         # Admin dashboard: stats, users table, create-user form
│   ├── guru/index.vue          # Guru dashboard; guru/bp21|bp26 use BupotGuruMonitor
│   └── siswa/                  # Siswa dashboard + bp21/bp26 list & create pages
├── types/
│   ├── api.ts                  # ALL API contract types — mirrors backend Pydantic schemas
│   └── page-meta.d.ts          # Types the custom `roles` field on definePageMeta
└── utils/bupot.ts              # Shared labels, options, formatters, form validation
```

## 5. Auth & tenancy architecture

- **Tokens:** access JWT in memory (`useState('auth.accessToken')`), refresh JWT in `localStorage` key `pajaksim.refresh_token`. Known Phase-1 tradeoff; switch to httpOnly cookies before production.
- **Boot:** `auth.global.ts` runs `auth.init()` on first navigation — exchanges a stored refresh token for a fresh access token, then loads `/auth/me`. Unauthenticated → `/login`; authenticated users hitting `/login` → their dashboard.
- **Roles:** `superadmin | admin | guru | siswa`, single role per user. `roleHome(role)` in `useAuth.ts` maps role → landing path (`/admin`, `/guru`, `/siswa`; superadmin shares `/admin`).
- **Page guard:** `definePageMeta({ middleware: 'role', roles: ['siswa'] })`. Wrong role → redirect to own dashboard, no error page. Every non-login page must declare this.
- **Tenancy:** isolation is enforced **server-side only**. The frontend never filters by tenant and must never be trusted to — do not add client-side tenant filtering logic; the API already scopes every query.

## 6. API access pattern

All authenticated calls go through `useApi().apiFetch<T>(path, options)`:

- Prefixes `apiBase`, injects the Bearer token.
- On 401: one silent refresh + one retry; on failure clears the session and redirects to `/login`.
- Errors surface to users via `apiErrorMessage(error, fallback)` (extracts FastAPI's `{ detail }`), shown in a `useToast()` toast (`color: 'error'`, `icon: 'i-lucide-circle-alert'`).

Data fetching in pages uses `useAsyncData` with a unique string key per role/page (`'siswa-bp21-list'`), a `default` factory for zero-state, and `watch: [...]` on filter refs. Reset `page` to 1 when a filter changes.

### API surface (prefix `/api/v1`)

| Area | Endpoints |
|---|---|
| auth | `POST /auth/login` (`{email, password, tenant_slug?}`), `POST /auth/refresh`, `GET /auth/me` |
| tenants | `GET/POST /tenants`, `PATCH /tenants/{id}` — superadmin only |
| users | `GET /users?role=&page=&size=`, `POST /users`, `PATCH /users/{id}` — admin scoped to own tenant |
| classes | `GET /classes`, `GET /classes/{id}`, `POST /classes`, `POST /classes/{id}/enrollments` |
| dashboard | `GET /dashboard/summary` — role-shaped counts |
| bp21 | `GET /bp21` (filters: `status,page,size,...`), `GET /bp21/summary`, `GET/PATCH /bp21/{id}`, `POST /bp21` , `POST /bp21/{id}/issue`, `PATCH /bp21/{id}/review` (guru grading) |
| bp26 | Everything bp21 has, plus: `DELETE /bp26/{id}`, `POST /bp26/{id}/cancel`, `PATCH /bp26/{id}/spt-flag`, `POST /bp26/import-xml` + `GET /bp26/import-template`, `POST /bp26/bulk-issue`, `GET /bp26/export-csv`, `GET /bp26/export-xml` |

Response conventions: lists are `Paginated<T>` (`{ items, total, page, size }`), errors are `{ detail: string }`.

## 7. Conventions

- **Language split:** UI strings in **Bahasa Indonesia** (Masa Pajak, Kata Sandi, Keluar, Belum Terbit...); code, comments, commit messages in **English**. Locale is `id` (set in `app.vue` via `@nuxt/ui/locale`).
- **Types first:** every backend request/response shape lives in `app/types/api.ts`, mirroring the backend Pydantic schemas field-for-field (snake_case preserved). When the backend adds a field, update this file — pages must not use `any` or ad-hoc shapes.
- **Auto-imports:** Nuxt auto-imports composables (`useAuth`, `useApi`), utils (`roleHome`, everything in `utils/bupot.ts`), and components. Do not add manual imports for those; do import types explicitly (`import type { ... } from '~/types/api'`).
- **Shared before new:** label maps (`statusLabel`, `statusColor`, `facilityLabel`), month options, `formatCurrency` (Intl `id-ID`), `formatPeriod`, and `validateBupotCreate` live in `utils/bupot.ts`. Reuse them; extend there rather than redefining in pages.
- **Form validation:** Nuxt UI `UForm` `:validate` functions returning `{ name, message }[]`, messages in Indonesian. Client validation is UX only — the backend re-validates everything.
- **Document lifecycle:** slips are `draft → issued` (via `/issue`, assigns `withholding_number`) or `invalid`. Status labels: draft = "Belum Terbit", issued = "Telah Terbit", invalid = "Tidak Valid"; colors warning/success/error.
- **Money:** integers in Rupiah, formatted with `formatCurrency` — never float arithmetic on amounts in the frontend; DPP/PPh math is backend-owned, the UI displays what the API returns.
- **Tables:** Nuxt UI `UTable` with `TableColumn<T>[]` accessor columns and an `actions` column; server-side pagination via `page`/`size` params.
- **Styling:** Nuxt UI components + the shared `.bupot-*` classes in `main.css` for the document-module page shell (breadcrumb, side panel with identity block + status tabs, main table panel, create-form sections). Colors in **OKLCH only** — see [DESIGN.md](DESIGN.md) for the palette and rules. Scoped styles per component; no new global CSS unless it is a shared page shell like `.bupot-*`.

## 8. Recipe: adding a new document module (e.g. BP15, faktur)

Follow the BP21/BP26 pattern exactly — the reference implementation is `pages/siswa/bp21/`:

1. **Types:** add `XxxRead`, `XxxCreate`, `XxxStatus`, `XxxListResponse = Paginated<XxxRead>`, `XxxSummary` to `types/api.ts`, mirroring the backend schema. Alias shared shapes (like `Bp26Status = Bp21Status`) instead of duplicating.
2. **Siswa list page** `pages/siswa/xxx/index.vue`: `definePageMeta({ middleware: 'role', roles: ['siswa'] })`, `.bupot-page`/`.bupot-shell` layout, side status tabs from `statusTabs` + summary counts, `UTable` list, issue action with success/error toasts.
3. **Siswa create page** `pages/siswa/xxx/create.vue`: `.bupot-create` form sections, `validateBupotCreate` (extend in `utils/bupot.ts` if fields differ), submit → toast → navigate back to list.
4. **Guru monitor:** if the module fits the shared row shape, reuse `BupotGuruMonitor` with a new `module` prop value and a thin page in `pages/guru/xxx/index.vue`; otherwise generalize the component, don't fork it.
5. **Navigation:** add the entry in `layouts/default.vue` `moduleItems` (with `modulePath('xxx')`) and to the `active` route check of its parent group.
6. Shared labels/formatters go to `utils/bupot.ts`; shared CSS to the `.bupot-*` block in `main.css`.

## 9. Gotchas

- `pages/login.vue` uses `definePageMeta({ layout: false })` and builds its own full-screen layout — there is no `layouts/auth.vue`.
- The `roles` key on `definePageMeta` is a custom field typed in `types/page-meta.d.ts`; keep that declaration in sync if the meta shape changes.
- Placeholder nav items in `layouts/default.vue` (SPT, Pembayaran, Buku Besar, Layanan WP, Manajemen Akses) intentionally have no `to` — they mirror the reference system's menu for realism and become real as phases ship. Don't delete them; wire them up when their module lands.
- Some UI labels intentionally mix English ("Create eBupot BP21", "NOT ISSUED") because the reference system does — match the reference, not style purity, on document-module screens.
- `useAsyncData` keys must be unique app-wide; prefix with the role and module (`guru-bp26-list`).
- Windows dev environment: PowerShell commands, CRLF-tolerant tooling; don't write POSIX-only npm scripts.
- Never commit `.env`; `.env.example` documents every variable.

## 10. Design & docs pointers

- [PRODUCT.md](PRODUCT.md) — register, users, brand personality, anti-references, design principles.
- [DESIGN.md](DESIGN.md) — visual system: OKLCH palette, typography, elevation, component specs, do's/don'ts. Machine-readable tokens in its YAML frontmatter; extended tokens in `.impeccable/design.json`.
- [README.md](README.md) — human-facing setup/runbook.
- Root-level spec history: `../KICKSTART_SPEC.md` (Phase 1 scope; later phases: faktur, kode billing, SPT, PDF, grading, reports).
