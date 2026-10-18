// Shared labels/options/formatters for the SPT Masa + kode billing modules.
import type {
  BillingStatus,
  SignerCapacity,
  TaxReturnKind,
  TaxReturnLineRead,
  TaxReturnType,
  TaxReturnStatus
} from '~/types/api'

/** SPT sidebar buckets — the same three the reference portal shows. */
export const sptStatusLabel = {
  draft: 'Konsep SPT',
  awaiting_payment: 'Menunggu Pembayaran',
  reported: 'Dilaporkan'
} satisfies Record<TaxReturnStatus, string>

export const sptStatusColor = {
  draft: 'warning',
  awaiting_payment: 'info',
  reported: 'success'
} as const satisfies Record<TaxReturnStatus, 'warning' | 'info' | 'success'>

export const sptStatusTabs: { label: string, value: TaxReturnStatus }[] = Object.entries(
  sptStatusLabel
).map(([value, label]) => ({ label, value: value as TaxReturnStatus }))

export const sptTypeLabel = {
  ppn: 'SPT Masa PPN',
  pph_unifikasi: 'SPT Masa PPh Unifikasi',
  pph21_26: 'SPT Masa PPh 21/26'
} satisfies Record<TaxReturnType, string>

export const sptKindLabel = {
  normal: 'Normal',
  pembetulan: 'Pembetulan'
} satisfies Record<TaxReturnKind, string>

export const signerCapacityLabel = {
  wajib_pajak: 'Wajib Pajak',
  kuasa_wajib_pajak: 'Kuasa Wajib Pajak'
} satisfies Record<SignerCapacity, string>

export const signerCapacityOptions: { label: string, value: SignerCapacity }[] = [
  { label: 'Wajib Pajak', value: 'wajib_pajak' },
  { label: 'Kuasa Wajib Pajak', value: 'kuasa_wajib_pajak' }
]

export const billingStatusLabel = {
  unpaid: 'Belum Dibayar',
  paid: 'Sudah Dibayar'
} satisfies Record<BillingStatus, string>

export const billingStatusColor = {
  unpaid: 'warning',
  paid: 'success'
} as const satisfies Record<BillingStatus, 'warning' | 'success'>

export const billingStatusTabs: { label: string, value: BillingStatus }[] = [
  { label: 'Belum Dibayar', value: 'unpaid' },
  { label: 'Sudah Dibayar', value: 'paid' }
]

/** Masa berlaku billing simulasi (PENG-4/PJ/2025: 14×24 jam). Tanpa cron — murni label. */
export const BILLING_EXPIRY_DAYS = 14

export function billingExpiresAt(createdAt: string | null): Date | null {
  if (!createdAt) return null
  const d = new Date(createdAt)
  d.setDate(d.getDate() + BILLING_EXPIRY_DAYS)
  return d
}

export function isBillingExpired(createdAt: string | null, status: BillingStatus): boolean {
  if (status !== 'unpaid') return false
  const exp = billingExpiresAt(createdAt)
  return exp !== null && new Date() > exp
}

/** KAP-KJS whitelist Layanan Mandiri (mirror backend MANDIRI_KJS; label manusia). */
export const mandiriKjsOptions: { label: string, value: string }[] = [
  { label: '411121-100 — PPN Masa / PPh 21 Setor Sendiri', value: '411121-100' },
  { label: '411124-100 — PPh 23', value: '411124-100' },
  { label: '411127-100 — PPh 26', value: '411127-100' },
  { label: '411128-100 — PPh Final 4(2)', value: '411128-100' },
  { label: '411122-100 — PPh 22', value: '411122-100' }
]

/** Pasal section codes of the SPT PPh Unifikasi Induk, in display order. */
export const pasalSections = [
  'pasal_4_2',
  'pasal_15',
  'pasal_22',
  'pasal_23',
  'pasal_26'
] as const

export const pasalLabel: Record<string, string> = {
  pasal_4_2: 'Pasal 4 Ayat 2',
  pasal_15: 'Pasal 15',
  pasal_22: 'Pasal 22',
  pasal_23: 'Pasal 23',
  pasal_26: 'Pasal 26'
}

/** Group PPh lines by pasal for the Induk B table. */
export function groupPphLines(lines: TaxReturnLineRead[]) {
  const grouped = new Map<string, TaxReturnLineRead[]>()
  for (const section of pasalSections) {
    grouped.set(section, [])
  }
  for (const line of lines) {
    grouped.get(line.section)?.push(line)
  }
  return grouped
}

/** Expandable KJS row label, as the real form shows "KJS:411124-100". */
export function kjsRowLabel(code: string) {
  return `KJS:${code}`
}

/** MMYYYY billing masa → "Oktober 2026". */
export function formatMasaPajak(masa: string) {
  const month = Number(masa.slice(0, 2))
  const year = masa.slice(2)
  return `${monthLabels[month] ?? masa} ${year}`
}

/** Wizard step titles, mirroring the reference portal's 3-step Buat Konsep SPT. */
export const sptWizardSteps: { label: string }[] = [
  { label: 'Pilih Jenis Pajak' },
  { label: 'Pilih Periode Pelaporan' },
  { label: 'Pilih Jenis SPT' }
]
