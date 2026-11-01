# AGENTS.md — pajak-simulator-frontend

Agent-facing engineering guide for this repository. Read this before writing code.
Strategic/design context lives in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md); this file covers everything else.

## 1. What this project is

**PajakSim** (display name: **"Sistem Pembelajaran Pajak Online"**, operated by *Konsultan Bisnis Sudarno*) is a multi-tenant **tax administration learning simulator** for Indonesian schools (SMK), universities, and training institutions. Students (siswa) practice creating simulated tax documents with dummy data: e-Bupot BP21/BP23/BP26/BPPU/BPNR/SP/CY, BPMP (Bulanan Pegawai Tetap) → BP A1/A2, Bukti Potong Saya, e-Faktur Keluaran/Masukan, SPT Masa PPN + PPh Unifikasi + PPh 21/26, and Pembayaran (kode billing with NTPN/kanal, Layanan Mandiri, Deposit Pajak, Pemindahbukuan, Tagihan SKP/STP, Angsuran). Teachers (guru) monitor, grade, and decide Pbk/Tagihan. Admins manage users and classes per institution (tenant). The superadmin manages institutions (period, quotas, first admin) and tax tariffs.

Roadmap and fidelity gaps vs the reference portal: `../docs/AUDIT_FIDELITAS_ALUR.md` and `../plans/README.md` (workspace root, outside this repo).

### The key design idea

The UI deliberately **mimics the look, layout, and workflow of Indonesia's national tax administration portal** so that skills learned here transfer 1:1 to the real system. Fidelity to that reference system's UX (top menubar of tax modules, side-tab status navigation, dense formal tables, issue/cancel document lifecycle) is a product requirement, not a styling preference.

**Branding rule (absolute):** never use the real system's name, logo, or trademarks anywhere user-visible or in code identifiers — no "Coretax", no "DJP", no Kemenkeu logos or crests. The stand-in brand is:

| Context | Name to use |
|---|---|
| App display title (topbar, `<title>`, login) | Sistem Pembelajaran Pajak Online |
| Internal/product name (code, keys, docs) | PajakSim (`pajaksim.*` storage keys, `pajaksim` slugs) |
| Operator brand (login page) | Konsultan Bisnis Sudarno |
| Logo | Generic `i-lucide-landmark` crest, navy + gold |

Generic tax terms that also exist in the real system (BP21, BP23, BP26, BPPU, BPNR, SP, CY, eBupot, e-Faktur, SPT, NPWP, NITKU, DPP, PPh, KAP-KJS, faktur, billing) are domain vocabulary, not branding — use them freely.

## 2. Tech stack

- **Nuxt 4** (`app/` directory convention) + **Nuxt UI 4** + Tailwind CSS 4, TypeScript.
- **SPA mode** (`ssr: false` in `nuxt.config.ts`): auth is fully client-side, nothing useful to render on the server. Do not re-enable SSR casually — `localStorage` access and in-memory tokens assume client.
- Backend is a **separate sibling repository**: `../backend` in the workspace (GitHub `belajarpajak-backend`; older docs call it `pajak-simulator-backend`), FastAPI + PostgreSQL. This repo never talks to the database; everything goes through the REST API.
- Icons: Lucide via `@iconify-json/lucide` (`i-lucide-*`).

## 3. Commands (Linux/macOS bash or Windows PowerShell — same npm scripts)

```bash
npm install               # deps (postinstall runs `nuxt prepare`)
npm run dev               # dev server on http://localhost:3000
npm run typecheck         # vue-tsc — run before finishing any task
npm run build             # production build
```

- Backend must run on port 8000 first (see `../backend/README.md`). There is no combined launcher script in the workspace; start the backend, then `npm run dev`.
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
│   ├── DocumentGuruMonitor.vue # Generic guru review table, prop `module` (bp21/bp23/bp26/bppu/bpnr/sp/cy/faktur-keluaran/faktur-masukan/spt)
│   ├── FakturKeluaranForm.vue  # Siswa e-Faktur Keluaran create/edit form
│   ├── FakturMasukanForm.vue   # Siswa e-Faktur Masukan create/edit form
│   ├── FakturTransactionModal.vue # Line-item editor shared by faktur forms
│   ├── A1A2List.vue / A1A2Detail.vue # Shared read-only BP A1/A2 views (siswa + guru)
│   ├── AdminInstanceManager.vue # Superadmin tenant manager: dossier (quota, countdown, admin reset, history) + period calendar
│   └── AdminBulkCreateUsers.vue # Admin bulk user creation
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
│   ├── ganti-password.vue      # Change-password for all roles
│   ├── admin/index.vue         # Admin dashboard (users, bulk create); superadmin dashboard (AdminInstanceManager)
│   ├── admin/kelas.vue         # Admin Kelola Kelas: create, enroll, archive
│   ├── admin/tarif-pajak.vue   # Superadmin-only PTKP + progresif management
│   ├── admin/audit.vue         # Admin/superadmin audit-log viewer
│   ├── guru/index.vue          # Guru dashboard: Perlu dinilai + Perlu Perhatian (Pbk/tagihan/angsuran/deposit)
│   ├── guru/bp21|bp23|bp26|bppu|bpnr|sp|cy|bpmp/ # DocumentGuruMonitor thin pages
│   ├── guru/a1|a2/             # Read-only A1/A2 per identity
│   ├── guru/e-faktur/          # Guru e-Faktur monitor (index + keluaran + masukan)
│   ├── guru/spt/index.vue      # Guru SPT monitor
│   ├── guru/pbk|tagihan|angsuran|deposit.vue # Guru payment-side review (decide Pbk, issue tagihan, class deposit recap)
│   └── siswa/                  # Siswa dashboard + bp21/bp23/bp26/bppu/bpnr/sp/cy/bpmp + a1/a2 + bukti-potong-saya
│                               #   + e-faktur keluaran/masukan + spt + pembayaran (index, mandiri, deposit, pbk, tagihan, angsuran)
├── types/
│   ├── api.ts                  # ALL API contract types — mirrors backend Pydantic schemas
│   └── page-meta.d.ts          # Types the custom `roles` field on definePageMeta
└── utils/
    ├── bupot.ts                # Shared e-Bupot labels, options, formatters, validation
    ├── faktur.ts               # Shared e-Faktur labels, formatters, validation
    └── spt.ts                  # Shared SPT labels, status maps, helpers
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
| auth | `POST /auth/login` (`{identifier, password}` — email for admin/guru/superadmin, NIK/NISN username for siswa; expired/inactive tenant → 403), `POST /auth/refresh`, `GET /auth/me`, `POST /auth/change-password` |
| tenants | `GET/POST /tenants`, `PATCH /tenants/{id}`, `POST /tenants/{id}/deactivate\|activate`, `GET /tenants/{id}/summary` (dossier), `GET /tenants/{id}/export`, `DELETE /tenants/{id}` — superadmin only. Create also mints the first admin; period = `berlaku_dari`/`berlaku_sampai` |
| users | `GET /users?role=&page=&size=`, `POST /users`, `POST /users/bulk`, `PATCH /users/{id}` — admin scoped to own tenant |
| classes | `GET /classes`, `GET /classes/{id}`, `POST /classes`, `POST /classes/{id}/enrollments`, `DELETE /classes/{id}/enrollments/{siswa_id}`, `PATCH /classes/{id}/archive` (superadmin may read across tenants) |
| a1 / a2 | `GET /a1`, `GET /a1/{identity}` (same for `/a2`) — read-only yearly aggregate of issued BPMP |
| dashboard | `GET /dashboard/summary` — role-shaped counts |
| bp21 / bp23 / bp26 / bppu / bpmp / bpnr / sp / cy | Same 17-endpoint set via `make_slip_router` + `GET /{t}/{id}/pdf` (BPE-SIM): `GET /{t}`, `GET /{t}/summary`, `GET/PATCH /{t}/{id}`, `POST /{t}`, `DELETE /{t}/{id}`, `POST /{t}/{id}/issue` (signer + Kode Otorisasi simulasi, required for **every** slip type incl. BPMP, min 6 chars; same for `bulk-issue`; `SIM-` number), `POST /{t}/{id}/cancel`, `POST /{t}/{id}/invalidate`, `PATCH /{t}/{id}/spt-flag`, `PATCH /{t}/{id}/review` (guru grading), `POST /{t}/import-xml` (plus converter aliases) + `GET /{t}/import-template`, `POST /{t}/bulk-issue`, `GET /{t}/export-csv`, `GET /{t}/export-xml`. BP21 adds `ter_category` A/B/C + `calculation_method` |
| faktur-keluaran | `GET /faktur-keluaran`, `GET /faktur-keluaran/summary`, `POST /faktur-keluaran`, `GET/PATCH/DELETE /faktur-keluaran/{id}`, `POST /faktur-keluaran/{id}/issue`, `POST /faktur-keluaran/{id}/cancel`, `PATCH /faktur-keluaran/{id}/review`, line CRUD `/{id}/lines` |
| faktur-masukan | `GET /faktur-masukan`, `POST /faktur-masukan`, `POST /faktur-masukan/{id}/credit\|uncredit`, `POST /faktur-masukan/bulk-credit\|bulk-uncredit\|bulk-delete`, `POST /faktur-masukan/{id}/cancel` (admin-only), `PATCH /faktur-masukan/{id}/review` |
| spt | `GET /spt`, `GET /spt/summary`, `POST /spt`, `GET /spt/{id}`, `POST /spt/{id}/posting`, `POST /spt/{id}/pernyataan`, `POST /spt/{id}/submit?metode=billing\|deposit` (body `{passphrase}`), `POST /spt/{id}/pembetulan`, `GET /spt/{id}/billing`, `PATCH /spt/{id}/review` — types `ppn` / `pph_unifikasi` / `pph_21_26` (BPMP aggregate) / `pph21_26` (SIM-TER/progresif) |
| billings | `GET /billings`, `GET /billings/{id}`, `GET /billings/{id}/pdf`, `POST /billings/{id}/pay` (kanal → NTPN + No BPN), `POST /billings` (mandiri: KAP whitelist incl. 411618 deposit top-up + MMYYYY + amount + uraian, `spt_id=NULL`). Multi-detail via `BillingLine` per KJS |
| deposit | `GET /deposit` (own saldo + mutasi, syncs paid top-ups first), `POST /deposit/sinkron`, `GET /deposit/tenant` (guru/admin recap) |
| pbk | `POST /pbk`, `GET /pbk`, `POST /pbk/{id}/setujui`, `POST /pbk/{id}/tolak` (guru/admin/superadmin decide) |
| tagihan | `POST /tagihan` (guru/admin issue SKP/STP), `GET /tagihan`, `GET /tagihan/{id}`, `POST /tagihan/{id}/buat-billing`, `POST /tagihan/{id}/lunaskan-dari-billing` |
| angsuran | `POST /angsuran` (siswa, 2–12 cicilan), `GET /angsuran`, `GET /angsuran/{id}`, `POST /angsuran/{id}/batal`, `POST /angsuran/cicilan/{cicilan_id}/pay` |
| audit-logs | `GET /audit-logs` — admin/superadmin only |
| tarif-pajak | `GET/POST /tarif-pajak/ptkp`, `PATCH/DELETE /tarif-pajak/ptkp/{id}`, `GET/POST /tarif-pajak/progresif`, `PATCH/DELETE /tarif-pajak/progresif/{id}` — write superadmin only |

Response conventions: lists are `Paginated<T>` (`{ items, total, page, size }`), errors are `{ detail: string }`.

## 7. Conventions

- **Language split:** UI strings in **Bahasa Indonesia** (Masa Pajak, Kata Sandi, Keluar, Belum Terbit...); code, comments, commit messages in **English**. Locale is `id` (set in `app.vue` via `@nuxt/ui/locale`).
- **Types first:** every backend request/response shape lives in `app/types/api.ts`, mirroring the backend Pydantic schemas field-for-field (snake_case preserved). When the backend adds a field, update this file — pages must not use `any` or ad-hoc shapes.
- **Auto-imports:** Nuxt auto-imports composables (`useAuth`, `useApi`), utils (`roleHome`, everything in `utils/bupot.ts`), and components. Do not add manual imports for those; do import types explicitly (`import type { ... } from '~/types/api'`).
- **Shared before new:** label maps (`statusLabel`, `statusColor`, `facilityLabel`), month options, `formatCurrency` (Intl `id-ID`), `formatPeriod`, and `validateBupotCreate` live in `utils/bupot.ts`; faktur helpers in `utils/faktur.ts`; SPT helpers in `utils/spt.ts`. Reuse them; extend there rather than redefining in pages.
- **Form validation:** Nuxt UI `UForm` `:validate` functions returning `{ name, message }[]`, messages in Indonesian. Client validation is UX only — the backend re-validates everything.
- **Document lifecycle:** slips are `draft → issued` (via `/issue`, assigns `withholding_number`) or `invalid`. Status labels: draft = "Belum Terbit", issued = "Telah Terbit", invalid = "Tidak Valid"; colors warning/success/error.
- **Money:** integers in Rupiah, formatted with `formatCurrency` — never float arithmetic on amounts in the frontend; DPP/PPh math is backend-owned, the UI displays what the API returns.
- **Tables:** Nuxt UI `UTable` with `TableColumn<T>[]` accessor columns and an `actions` column; server-side pagination via `page`/`size` params.
- **Styling:** Nuxt UI components + the shared `.bupot-*` classes in `main.css` for the document-module page shell (breadcrumb, side panel with identity block + status tabs, main table panel, create-form sections). Colors in **OKLCH only** — see [DESIGN.md](DESIGN.md) for the palette and rules. Scoped styles per component; no new global CSS unless it is a shared page shell like `.bupot-*`.

## 8. Recipe: adding a new document module (e.g. BPPU, retur)

Follow the BP21/BP23/BP26 pattern exactly — the reference implementation is `pages/siswa/bp21/`:

1. **Types:** add `XxxRead`, `XxxCreate`, `XxxStatus`, `XxxListResponse = Paginated<XxxRead>`, `XxxSummary` to `types/api.ts`, mirroring the backend schema. Alias shared shapes (like `Bp23Status = Bp21Status`) instead of duplicating.
2. **Siswa list page** `pages/siswa/xxx/index.vue`: `definePageMeta({ middleware: 'role', roles: ['siswa'] })`, `.bupot-page`/`.bupot-shell` layout, side status tabs from `statusTabs` + summary counts, `UTable` list, issue action with success/error toasts.
3. **Siswa create page** `pages/siswa/xxx/create.vue`: `.bupot-create` form sections, `validateBupotCreate` (extend in `utils/bupot.ts` if fields differ; faktur uses `utils/faktur.ts`, SPT uses `utils/spt.ts`), submit → toast → navigate back to list.
4. **Guru monitor:** if the module fits the shared row shape, reuse `DocumentGuruMonitor` with a new `module` prop value and a thin page in `pages/guru/xxx/index.vue`; otherwise generalize the component, don't fork it.
5. **Navigation:** add the entry in `layouts/default.vue` `moduleItems` (with `modulePath('xxx')`) and to the `active` route check of its parent group.
6. Shared labels/formatters go to `utils/bupot.ts` (or `faktur.ts` / `spt.ts` for those domains); shared CSS to the `.bupot-*` block in `main.css`.

## 9. Gotchas

- `pages/login.vue` uses `definePageMeta({ layout: false })` and builds its own full-screen layout — there is no `layouts/auth.vue`.
- The `roles` key on `definePageMeta` is a custom field typed in `types/page-meta.d.ts`; keep that declaration in sync if the meta shape changes.
- Placeholder nav items in `layouts/default.vue` intentionally have `disabled: true` + `badge: 'Segera hadir'`. They mirror the reference system's menu for realism and become real as phases ship. Still placeholders (as of 2026-11-01): e-Faktur Retur / Dokumen Lain / Prepopulated; eBUPOT Dokumen yang Dipersamakan; SPT Formulir Pajak / Pencatatan / Dasbor Kompensasi / Pengungkapan Ketidakbenaran; Pembayaran Restitusi / Imbalan Bunga / PPh DTP PDAM; Buku Besar; Layanan WP (Profil WP, Permohonan); Manajemen Akses (hidden for siswa). Everything else is wired, so don't delete the remaining placeholders; wire them up when their module lands.
- The superadmin sees a separate platform menu (Dasbor, Tarif Pajak, Log Audit) instead of the tax-module menubar; admin gets an extra **Kelas** entry.
- Some UI labels intentionally mix English ("Create eBupot BP21", "NOT ISSUED") because the reference system does. Match the reference, not style purity, on document-module screens. Note: the 2026-11-01 UX pass (`bdcda8e`) translated several of these headings; whether to restore them is open decision D1 in `../docs/AUDIT_FIDELITAS_ALUR.md`.
- `useAsyncData` keys must be unique app-wide; prefix with the role and module (`guru-bp26-list`, `siswa-faktur-keluaran-list`, `siswa-spt-list`).
- Developers use both Linux and Windows. Keep npm scripts cross-platform (no POSIX-only or PowerShell-only syntax) and tooling CRLF-tolerant.
- Never commit `.env`; `.env.example` documents every variable.

## 10. Design & docs pointers

- [PRODUCT.md](PRODUCT.md) — register, users, brand personality, anti-references, design principles.
- [DESIGN.md](DESIGN.md) — visual system: OKLCH palette, typography, elevation, component specs, do's/don'ts. Machine-readable tokens in its YAML frontmatter; extended tokens in `.impeccable/design.json`.
- [README.md](README.md) — human-facing setup/runbook.
- Historical spec: `KICKSTART_SPEC.md` (Phase 1 scope) if present at repo root; later phases already shipped (faktur, BP23, kode billing, SPT, PDF, grading, BPMP/A1/A2, pembayaran lanjutan). See current coverage above.
- Next work: `../plans/README.md` (plans 007–011) and `../docs/AUDIT_FIDELITAS_ALUR.md`.
