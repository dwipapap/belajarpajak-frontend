import type { AssignmentDocType, Me, ModuleCatalogItem, TaxReturnType } from '~/types/api'

export const ALL_MODULE_KEYS = [
  'faktur_keluaran',
  'faktur_masukan',
  'retur',
  'bppu',
  'bp21',
  'bp26',
  'bpnr',
  'bpmp',
  'sp',
  'cy',
  'spt_ppn',
  'spt_pph_unifikasi',
  'spt_pph21_26',
  'deposit',
  'pbk',
  'tagihan',
  'angsuran',
  'tugas',
] as const

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number]

export const MODULE_GROUPS = [
  'e-Faktur',
  'eBupot',
  'SPT',
  'Pembayaran',
  'Kelas',
] as const

export const FALLBACK_MODULE_CATALOG: ModuleCatalogItem[] = [
  { key: 'faktur_keluaran', label: 'e-Faktur — Faktur Pajak Keluaran', group: 'e-Faktur', depends_on: [], dependency_hint: null },
  { key: 'faktur_masukan', label: 'e-Faktur — Faktur Pajak Masukan', group: 'e-Faktur', depends_on: [], dependency_hint: null },
  { key: 'retur', label: 'e-Faktur — Retur Faktur Pajak', group: 'e-Faktur', depends_on: ['faktur_masukan'], dependency_hint: 'Retur Faktur Pajak butuh modul Faktur Pajak Masukan' },
  { key: 'bppu', label: 'e-Bupot Unifikasi — BPPU (PPh 22/23/4(2)/15)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'bp21', label: 'e-Bupot 21/26 — BP21 (Tidak Final / Final)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'bp26', label: 'e-Bupot 21/26 — BP26 (Wajib Pajak Luar Negeri)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'bpnr', label: 'e-Bupot Unifikasi — BPNR (Non Residen)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'bpmp', label: 'e-Bupot 21/26 — BPMP (Pegawai Tetap Bulanan & A1/A2)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'sp', label: 'e-Bupot Unifikasi — Setoran Sendiri (SP)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'cy', label: 'e-Bupot Unifikasi — Pemungutan Pihak Lain (CY)', group: 'eBupot', depends_on: [], dependency_hint: null },
  { key: 'spt_ppn', label: 'SPT Masa PPN', group: 'SPT', depends_on: ['faktur_keluaran', 'faktur_masukan'], dependency_hint: 'SPT Masa PPN butuh modul Faktur Pajak Keluaran atau Faktur Pajak Masukan' },
  { key: 'spt_pph_unifikasi', label: 'SPT Masa PPh Unifikasi', group: 'SPT', depends_on: ['bppu', 'bpnr', 'sp', 'cy', 'bp26'], dependency_hint: 'SPT Masa PPh Unifikasi butuh minimal satu modul e-Bupot Unifikasi (BPPU/BPNR/SP/CY/BP26)' },
  { key: 'spt_pph21_26', label: 'SPT Masa PPh 21/26', group: 'SPT', depends_on: ['bp21', 'bpmp'], dependency_hint: 'SPT Masa PPh 21/26 butuh modul BP21 atau BPMP' },
  { key: 'deposit', label: 'Pembayaran — Deposit Pajak', group: 'Pembayaran', depends_on: [], dependency_hint: null },
  { key: 'pbk', label: 'Pembayaran — Pemindahbukuan (Pbk)', group: 'Pembayaran', depends_on: [], dependency_hint: null },
  { key: 'tagihan', label: 'Pembayaran — Daftar Tagihan Pajak', group: 'Pembayaran', depends_on: [], dependency_hint: null },
  { key: 'angsuran', label: 'Pembayaran — Permohonan Angsuran', group: 'Pembayaran', depends_on: [], dependency_hint: null },
  { key: 'tugas', label: 'Kelas — Tugas & Penilaian Otomatis', group: 'Kelas', depends_on: [], dependency_hint: null },
]

export const EBUPOT_KEYS: string[] = ['bppu', 'bp21', 'bp26', 'bpnr', 'bpmp', 'sp', 'cy']
export const EFAKTUR_KEYS: string[] = ['faktur_keluaran', 'faktur_masukan', 'retur']
export const SPT_KEYS: string[] = ['spt_ppn', 'spt_pph_unifikasi', 'spt_pph21_26']

/**
 * Returns true if the given module key is enabled for the user.
 * Superadmin or users without `enabled_modules` populated default to all enabled.
 */
export function isModuleEnabled(user: Me | null | undefined, key: string): boolean {
  if (!user) return true
  if (user.role === 'superadmin') return true
  if (!user.enabled_modules) return true
  return user.enabled_modules.includes(key)
}

export function isAnyModuleEnabled(user: Me | null | undefined, keys: string[]): boolean {
  if (!user) return true
  if (user.role === 'superadmin') return true
  if (!user.enabled_modules) return true
  return keys.some((k) => user.enabled_modules!.includes(k))
}

export function docTypeToModuleKey(docType: AssignmentDocType | string): string {
  if (docType === 'spt_pph_21_26' || docType === 'spt_pph21_26') return 'spt_pph21_26'
  return docType
}

export function sptReturnTypeToModuleKey(returnType: TaxReturnType | string): string {
  if (returnType === 'ppn') return 'spt_ppn'
  if (returnType === 'pph_unifikasi') return 'spt_pph_unifikasi'
  if (returnType === 'pph_21_26' || returnType === 'pph21_26') return 'spt_pph21_26'
  return returnType
}

/**
 * Check if a route path is permitted for the given user's enabled modules.
 * Returns true if allowed, false if blocked by a disabled module.
 */
export function isRouteAllowedForUser(path: string, user: Me | null | undefined): boolean {
  if (!user || user.role === 'superadmin') return true
  if (!user.enabled_modules) return true

  // Slip modules
  for (const key of ['bppu', 'bp21', 'bp26', 'bpnr', 'bpmp', 'sp', 'cy']) {
    if (
      path === `/siswa/${key}` ||
      path.startsWith(`/siswa/${key}/`) ||
      path === `/guru/${key}` ||
      path.startsWith(`/guru/${key}/`)
    ) {
      return isModuleEnabled(user, key)
    }
  }

  // A1 & A2 are gated by bpmp
  if (
    path === '/siswa/a1' ||
    path.startsWith('/siswa/a1/') ||
    path === '/siswa/a2' ||
    path.startsWith('/siswa/a2/') ||
    path === '/guru/a1' ||
    path.startsWith('/guru/a1/') ||
    path === '/guru/a2' ||
    path.startsWith('/guru/a2/')
  ) {
    return isModuleEnabled(user, 'bpmp')
  }

  // Bukti potong saya -> allowed if any eBupot module is enabled
  if (path === '/siswa/bukti-potong-saya' || path.startsWith('/siswa/bukti-potong-saya/')) {
    return isAnyModuleEnabled(user, EBUPOT_KEYS)
  }

  // e-Faktur sub-routes
  if (
    path === '/siswa/e-faktur/keluaran' ||
    path.startsWith('/siswa/e-faktur/keluaran/') ||
    path === '/guru/e-faktur/keluaran' ||
    path.startsWith('/guru/e-faktur/keluaran/')
  ) {
    return isModuleEnabled(user, 'faktur_keluaran')
  }
  if (
    path === '/siswa/e-faktur/masukan' ||
    path.startsWith('/siswa/e-faktur/masukan/') ||
    path === '/guru/e-faktur/masukan' ||
    path.startsWith('/guru/e-faktur/masukan/')
  ) {
    return isModuleEnabled(user, 'faktur_masukan')
  }
  if (
    path === '/siswa/e-faktur/retur' ||
    path.startsWith('/siswa/e-faktur/retur/') ||
    path === '/guru/e-faktur/retur' ||
    path.startsWith('/guru/e-faktur/retur/')
  ) {
    return isModuleEnabled(user, 'retur')
  }
  if (path === '/siswa/e-faktur' || path === '/guru/e-faktur') {
    return isAnyModuleEnabled(user, EFAKTUR_KEYS)
  }

  // SPT routes -> allowed if any spt_* module is enabled
  if (
    path === '/siswa/spt' ||
    path.startsWith('/siswa/spt/') ||
    path === '/guru/spt' ||
    path.startsWith('/guru/spt/')
  ) {
    return isAnyModuleEnabled(user, SPT_KEYS)
  }

  // Pembayaran sub-routes (note: /siswa/pembayaran and /siswa/pembayaran/mandiri are Kode Billing -> always on)
  if (
    path === '/siswa/pembayaran/deposit' ||
    path.startsWith('/siswa/pembayaran/deposit/') ||
    path === '/guru/deposit' ||
    path.startsWith('/guru/deposit/')
  ) {
    return isModuleEnabled(user, 'deposit')
  }
  if (
    path === '/siswa/pembayaran/pbk' ||
    path.startsWith('/siswa/pembayaran/pbk/') ||
    path === '/guru/pbk' ||
    path.startsWith('/guru/pbk/')
  ) {
    return isModuleEnabled(user, 'pbk')
  }
  if (
    path === '/siswa/pembayaran/tagihan' ||
    path.startsWith('/siswa/pembayaran/tagihan/') ||
    path === '/guru/tagihan' ||
    path.startsWith('/guru/tagihan/')
  ) {
    return isModuleEnabled(user, 'tagihan')
  }
  if (
    path === '/siswa/pembayaran/angsuran' ||
    path.startsWith('/siswa/pembayaran/angsuran/') ||
    path === '/guru/angsuran' ||
    path.startsWith('/guru/angsuran/')
  ) {
    return isModuleEnabled(user, 'angsuran')
  }

  // Tugas routes
  if (
    path === '/siswa/tugas' ||
    path.startsWith('/siswa/tugas/') ||
    path === '/guru/tugas' ||
    path.startsWith('/guru/tugas/')
  ) {
    return isModuleEnabled(user, 'tugas')
  }

  return true
}
