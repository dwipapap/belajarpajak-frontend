# Simulator Pajak — Frontend

Nuxt 4 + Nuxt UI 4 frontend for the multi-tenant **tax administration learning simulator**. The app covers authentication, role-based dashboards, admin management, tariff management, and national tax portal-inspired BP21/BP26 e-Bupot simulator screens.

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

- **SPA mode** (`ssr: false`): auth is fully client-side, so SSR has nothing useful to render.
- **Token storage tradeoff**: access token in memory (`useState`), refresh token in `localStorage`. Acceptable for current development; switch to httpOnly cookies before production.
- **Silent session restore**: on boot, `auth.global.ts` middleware exchanges a stored refresh token for a new access token before deciding any redirect.
- **401 recovery**: the `useApi()` wrapper attempts one refresh + retry on 401, then logs out on failure.
- **Role guard**: pages declare `definePageMeta({ middleware: 'role', roles: [...] })`; wrong-role access redirects to the user's own dashboard.
- **Document module UX**: BP21/BP26 screens intentionally mimic the workflow structure of the national tax portal while using PajakSim branding only.
- UI labels are **Bahasa Indonesia**; code and comments are English.

## Structure

```
app/
├── pages/            # login, index, admin, guru, siswa, bp21/bp26 module pages
├── layouts/          # default authenticated shell
├── middleware/       # auth.global.ts, role.ts
├── composables/      # useAuth.ts, useApi.ts
├── components/       # shared BP21/BP26 guru monitor
├── utils/            # bupot labels, options, formatters, validation
└── types/            # api.ts (API contract types)
```

## Current feature coverage

- Login with optional tenant code, silent refresh, and automatic 401 recovery.
- Role dashboards for superadmin/admin/guru/siswa.
- Admin user management and superadmin tenant switcher.
- Admin tax tariff management page for PTKP and Pasal 17 progressive brackets.
- Guru BP21/BP26 monitoring and review workflow.
- Siswa BP21/BP26 list, create, issue, and document lifecycle views.
- Formal PajakSim UI shell with module menubar and document status tabs.

## Scope & what's next

**Done:** foundation, BP21/BP26 simulated e-Bupot, basic grading/review, PTKP/progressive tariff management.

**Next phases:** faktur pajak simulasi, bupot PPh 23, kode billing, SPT simulasi, PDF generation, expanded reports.
