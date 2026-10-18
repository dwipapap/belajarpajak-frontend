# Simulator Pajak — Frontend

Nuxt 4 + Nuxt UI 4 frontend for the multi-tenant **tax administration learning simulator**. The app covers authentication, role-based dashboards, admin management, tariff management, national tax portal-inspired e-Bupot BP21/BP23/BP26/BPPU/BPNR/SP/CY screens, Bukti Potong Saya, e-Faktur Keluaran/Masukan, SPT Masa (PPN + PPh Unifikasi + PPh 21/26), and billing/payment views.

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
- **Document module UX**: BP21/BP23/BP26/BPPU/BPNR/SP/CY, Bukti Potong Saya, e-Faktur Keluaran/Masukan, SPT, and billing screens intentionally mimic the workflow structure of the national tax portal while using PajakSim branding only.
- UI labels are **Bahasa Indonesia**; code and comments are English.

## Structure

```
app/
├── pages/            # login, index, ganti-password, admin (index/tarif-pajak/audit), guru (index/bp21/bp23/bp26/e-faktur/spt), siswa (index/bp21/bp23/bp26/e-faktur keluaran+masukan/spt/pembayaran)
├── layouts/          # default authenticated shell
├── middleware/       # auth.global.ts, role.ts
├── composables/      # useAuth.ts, useApi.ts
├── components/       # DocumentGuruMonitor (generic), FakturKeluaranForm, FakturMasukanForm, FakturTransactionModal, AdminInstanceManager, AdminBulkCreateUsers
├── utils/            # bupot.ts + faktur.ts + spt.ts labels, options, formatters, validation
└── types/            # api.ts (API contract types)
```

## Current feature coverage

- Login with optional tenant code, silent refresh, and automatic 401 recovery.
- Role dashboards for superadmin/admin/guru/siswa + change-password page.
- Admin user management (incl. bulk-create), tenant/instance manager, and audit-log viewer.
- Admin tax tariff management page for PTKP and Pasal 17 progressive brackets.
- Guru document monitoring via generic `DocumentGuruMonitor` (bp21/bp23/bp26/e-faktur keluaran/masukan/spt) with score + feedback review workflow.
- Siswa BP21/BP23/BP26/BPPU/BPNR/SP/CY list, create, issue (signer + Kode Otorisasi simulasi), BPE-SIM PDF, import/export, and document lifecycle views. BP21 supports SIM-TER A/B/C (Jan–Nov) vs progresif Desember with method label.
- Siswa Bukti Potong Saya: aggregate issued across all 7 e-Bupot types with BPE download.
- Siswa SPT Masa list, create, detail `[id]` (posting/pernyataan/submit/pembetulan/billing linkage) for PPN, PPh Unifikasi, PPh 21/26.
- Siswa e-Faktur Keluaran/Masukan list, create, detail `[id]`, issue/credit, and lifecycle views.
- Siswa SPT Masa list, create, detail `[id]` (posting/pernyataan/submit/pembetulan/billing linkage).
- Siswa Pembayaran (Daftar Kode Billing): unpaid/paid tabs, PDF view, pay action, link to SPT, uraian + badge Mandiri/Kedaluwarsa (14 hari simulasi).
- Siswa Layanan Mandiri Kode Billing (`pembayaran/mandiri`): form KAP-KJS + masa + nominal + uraian → kode 15-digit.
- Formal PajakSim UI shell with module menubar and document status tabs.

## Scope & what's next

**Done:** foundation, BP21/BP23/BP26/BPPU/BPNR/SP/CY simulated e-Bupot (SIM-TER, signer, BPE-SIM, Bukti Potong Saya), e-Faktur Keluaran/Masukan, SPT Masa PPN + PPh Unifikasi + PPh 21/26, kode billing + pay + PDF, basic grading/review, PTKP/progressive tariff management, audit trail viewer.

**Next phases:** retur / dokumen lain / prepopulated, SPT Tahunan OP/Badan, billing mandiri + Buku Besar, Profil WP, LMS (gradebook, bank soal, ujian, rapor, notifikasi), expanded reports.
