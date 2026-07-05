# Simulator Pajak — Frontend (Phase 1: Foundation)

Nuxt 4 + Nuxt UI 4 frontend for the multi-tenant **tax administration learning simulator**. Phase 1 delivers login, role-based routing, and three dashboard shells (admin, guru, siswa) backed by real API data.

The backend lives in a **separate repository**: `pajak-simulator-backend` (FastAPI). Start it first — see its README for the database bootstrap and seed credentials.

## Prerequisites

- Node.js LTS (≥ 20)
- Backend running on port 8000 (see backend README)

## Run (PowerShell, from the repo root)

```powershell
npm install
Copy-Item .env.example .env   # first time only
npm run dev
```

App: http://localhost:3000 — log in with the seed credentials from the backend README (password for all: `Password123!`). Quick picks:

| Role | Email |
|---|---|
| superadmin | `super@pajaksim.local` |
| admin | `admin@smkn1-pku.local` |
| guru | `guru1@smkn1-pku.local` |
| siswa | `siswa1@smkn1-pku.local` |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | `http://localhost:8000` | Backend base URL |

## Architecture notes

- **SPA mode** (`ssr: false`): auth is fully client-side in Phase 1, so SSR has nothing to render.
- **Token storage tradeoff**: access token in memory (`useState`), refresh token in `localStorage`. Acceptable for Phase 1 dev; switch to httpOnly cookies before production.
- **Silent session restore**: on boot, `auth.global.ts` middleware exchanges a stored refresh token for a new access token before deciding any redirect.
- **401 recovery**: the `useApi()` wrapper attempts one refresh + retry on 401, then logs out on failure.
- **Role guard**: pages declare `definePageMeta({ middleware: 'role', roles: [...] })`; wrong-role access redirects to the user's own dashboard.
- UI labels are **Bahasa Indonesia**; code and comments are English.

## Structure

```
app/
├── pages/            # login, index (role redirect), admin/, guru/, siswa/
├── layouts/          # default (sidebar + topbar), auth (centered card)
├── middleware/       # auth.global.ts, role.ts
├── composables/      # useAuth.ts, useApi.ts
└── types/            # api.ts (API contract types)
```

## Phase 1 scope & what's next

**Done:** login (with optional tenant code), silent refresh, role dashboards with live stats, admin user management (list, filter, paginate, create), guru class/student views, siswa class list, superadmin tenant switcher.

**Next phases:** faktur pajak simulasi, bupot PPh 21/23, kode billing, SPT simulasi, PDF generation, grading, reports.
