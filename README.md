# Simulator Pajak — Frontend

Nuxt 4 + Nuxt UI 4 frontend for the multi-tenant **tax administration learning simulator**. The app covers authentication, role-based dashboards, institution/user/class management, tariff management, national tax portal-inspired e-Bupot BP21/BP23/BP26/BPPU/BPNR/SP/CY + BPMP → BP A1/A2 screens, Bukti Potong Saya, e-Faktur Keluaran/Masukan, SPT Masa (PPN + PPh Unifikasi + PPh 21/26), and Pembayaran (kode billing, Layanan Mandiri, Deposit, Pemindahbukuan, Tagihan, Angsuran).

The backend lives in a **separate repository**: `../backend` in the workspace (GitHub `belajarpajak-backend`, FastAPI). Start it first. See its README for the database bootstrap and seed credentials.

## Prerequisites

- Node.js LTS (≥ 20)
- Backend running on port 8000 (see backend README)

## Run (from the repo root)

```bash
npm install
cp .env.example .env          # first time only (PowerShell: Copy-Item .env.example .env)
npm run dev
```

App: http://localhost:3000. Log in with the seed credentials from the backend README (password for all: `Password123!`). The login field accepts an email or, for siswa, the NIK/NISN username (seed siswa1 = `0012345678`). Quick picks:

| Role | Login |
|---|---|
| superadmin | `super@pajaksim.local` |
| admin | `admin@smkn1-pku.local` |
| guru | `guru1@smkn1-pku.local` |
| siswa | `siswa1@smkn1-pku.local` or `0012345678` |

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
- **Role-shaped menu**: siswa/guru/admin get the tax-module menubar (admin also gets *Kelas*; *Manajemen Akses* is hidden for siswa). The superadmin gets a platform menu (Dasbor, Tarif Pajak, Log Audit).
- **Document module UX**: all document and payment screens intentionally mimic the workflow structure of the national tax portal while using PajakSim branding only.
- UI labels are **Bahasa Indonesia**; code and comments are English.

## Structure

```
app/
├── pages/            # login, index, ganti-password
│                     # admin: index, kelas, tarif-pajak, audit
│                     # guru: index, bp21/23/26, bppu, bpnr, sp, cy, bpmp, a1, a2, e-faktur, spt, pbk, tagihan, angsuran, deposit
│                     # siswa: index, bp21/23/26, bppu, bpnr, sp, cy, bpmp, a1, a2, bukti-potong-saya,
│                     #        e-faktur keluaran+masukan, spt, pembayaran (index, mandiri, deposit, pbk, tagihan, angsuran)
├── layouts/          # default authenticated shell (topbar + module menubar)
├── middleware/       # auth.global.ts, role.ts
├── composables/      # useAuth.ts, useApi.ts
├── components/       # DocumentGuruMonitor (generic), FakturKeluaranForm, FakturMasukanForm, FakturTransactionModal,
│                     # A1A2List, A1A2Detail, AdminInstanceManager, AdminBulkCreateUsers
├── utils/            # bupot.ts + faktur.ts + spt.ts labels, options, formatters, validation
└── types/            # api.ts (API contract types)
```

## Current feature coverage

- Login with one identifier (email or NIK/NISN), silent refresh, automatic 401 recovery, expired-institution lockout.
- Role dashboards for superadmin/admin/guru/siswa + change-password page. Siswa dashboard has a *Langkah belajar* guide; guru dashboard has *Perlu dinilai* and *Perlu Perhatian* queues.
- Superadmin institution manager: create institution + first admin, dossier (quotas, countdown, admin reset, history), active-period calendar, export/delete. Tariff management (PTKP + Pasal 17) and audit-log viewer.
- Admin user management (single + bulk) and *Kelola Kelas* (create, enroll, archive).
- Guru document monitoring via `DocumentGuruMonitor` (bp21/bp23/bp26/bppu/bpnr/sp/cy/bpmp, e-faktur keluaran/masukan, spt) with score + feedback review; payment-side review of Pbk, Tagihan, Angsuran, and class deposits.
- Siswa e-Bupot BP21/BP23/BP26/BPPU/BPNR/SP/CY: list, create, issue (signer + Kode Otorisasi simulasi), cancel own, BPE-SIM PDF, import/export, bulk issue. BP21 supports SIM-TER A/B/C (Jan–Nov) vs progresif Desember.
- Siswa BPMP (monthly permanent-employee slips) and read-only BP A1/A2 yearly aggregates. Known issue: the BPMP page does not send a Kode Otorisasi yet, so issuing fails (bug B1 in `../docs/AUDIT_FIDELITAS_ALUR.md`).
- Siswa Bukti Potong Saya: aggregate of issued slips across e-Bupot types with BPE download.
- Siswa e-Faktur Keluaran/Masukan: list, create, detail `[id]`, issue (NSFP 17 digit) / credit, lifecycle views.
- Siswa SPT Masa: 3-step wizard (jenis → periode → Normal/Pembetulan), detail `[id]` with stepper (posting → pernyataan → Bayar dan Lapor via billing or deposit → pembetulan) for PPN, PPh Unifikasi, PPh 21/26.
- Siswa Pembayaran: Daftar Kode Billing (pay with kanal → NTPN, multi-detail, PDF), Layanan Mandiri Kode Billing, Deposit Pajak (top-up + mutasi), Pemindahbukuan, Tagihan (SKP/STP → buat billing), Angsuran (2–12 cicilan).

## Scope & what's next

**Done:** everything listed above.

**Next (see `../plans/README.md`, plans 007–011):** signature modal for Upload Faktur, prepopulated Pajak Masukan, tabbed SPT form (Induk + Lampiran), BPE SPT + Portal Saya → Dokumen Saya, SPT Tahunan Orang Pribadi. Deferred by the operator: Ganti Peran / impersonate + Profil WP. Later: Retur / Dokumen Lain, Buku Besar, LMS layer (modules/assignments, gradebook, rapor).
