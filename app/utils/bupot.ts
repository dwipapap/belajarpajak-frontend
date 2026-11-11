// Shared labels/formatters for the e-Bupot modules (BP21, BP23, BP26, BPPU, ...).
import type { Bp21Status, Bp21TaxFacility, Bp26SptFlag } from '~/types/api'

export type BupotModule = 'bppu' | 'bpnr' | 'bp21' | 'bp26' | 'sp' | 'cy' | 'bpmp' | 'bp23'
export type BupotToolbarAction = 'create' | 'delete' | 'issue' | 'monitoring' | 'import' | 'bulk' | 'cancel' | 'refresh'
export const bupotCode: Record<BupotModule, string> = {
  bppu: 'BPU', bpnr: 'BPNR', bp21: 'BP21', bp26: 'BP26', sp: 'SP', cy: 'CY', bpmp: 'MP', bp23: 'BP23'
}
export function bupotTitle(module: BupotModule, status: Bp21Status): string {
  const phase = { draft: 'NOT ISSUED', issued: 'ISSUED', invalid: 'TIDAK VALID' }[status]
  return `EBUPOT ${bupotCode[module]} ${phase}`
}
export function bupotToolbarVisible(action: BupotToolbarAction, status: Bp21Status): boolean {
  if (action === 'refresh' || action === 'monitoring' || action === 'bulk') return true
  if (status === 'draft') return ['create', 'delete', 'issue', 'import'].includes(action)
  return status === 'issued' && action === 'cancel'
}

export const monthLabels = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

export const monthOptions = monthLabels
  .slice(1)
  .map((label, index) => ({ label, value: index + 1 }))

export const monthFilterOptions: { label: string, value: number | undefined }[] = [
  { label: 'Semua Masa', value: undefined },
  ...monthOptions
]

export const statusLabel = {
  draft: 'Belum Terbit',
  issued: 'Telah Terbit',
  invalid: 'Tidak Valid'
} satisfies Record<Bp21Status, string>

export const statusTabs = Object.entries(statusLabel).map(
  ([value, label]) => ({ label, value: value as Bp21Status })
)

export const statusColor = {
  draft: 'warning',
  issued: 'success',
  invalid: 'error'
} as const satisfies Record<Bp21Status, 'warning' | 'success' | 'error'>

export const facilityLabel = {
  none: 'Tanpa Fasilitas',
  dtp: 'DTP',
  skb: 'SKB',
  rate_0: 'Tarif 0%'
} satisfies Record<Bp21TaxFacility, string>

export const facilityFilterOptions: { label: string, value: Bp21TaxFacility | undefined }[] = [
  { label: 'Semua Fasilitas', value: undefined },
  { label: 'Tanpa Fasilitas', value: 'none' },
  { label: 'Ditanggung Pemerintah', value: 'dtp' },
  { label: 'Surat Keterangan Bebas', value: 'skb' },
  { label: 'Tarif 0%', value: 'rate_0' }
]

export const sptFlagLabel = {
  reported_in_spt: 'Sudah Masuk SPT',
  objection_in_progress: 'Keberatan Berjalan',
  objection_completed: 'Keberatan Selesai',
  objection_rejected_formal: 'Keberatan Ditolak Formal',
  objection_withdrawal_review: 'Peninjauan Pencabutan Keberatan',
  objection_withdrawal_accepted: 'Pencabutan Keberatan Diterima',
  spt_audited: 'SPT Diaudit',
  spt_legal_process: 'SPT Proses Hukum'
} satisfies Record<Bp26SptFlag, string>

export const sptFlagColumns: { label: string, value: Bp26SptFlag }[] = [
  { label: 'Dilaporkan Dalam SPT', value: 'reported_in_spt' },
  { label: 'Dalam Proses Keberatan', value: 'objection_in_progress' },
  { label: 'Selesai Proses Keberatan', value: 'objection_completed' },
  { label: 'Keberatan tidak memenuhi persyaratan (Tolak Formal)', value: 'objection_rejected_formal' },
  { label: 'Dalam Proses Reviu Pencabutan Permohonan Keberatan', value: 'objection_withdrawal_review' },
  { label: 'Pencabutan Keberatan Diterima', value: 'objection_withdrawal_accepted' },
  { label: 'SPT Telah/Sedang Diperiksa', value: 'spt_audited' },
  { label: 'SPT Dalam Penanganan Hukum', value: 'spt_legal_process' }
]

export function electronicSignatureLabel(status: string): string {
  return status === 'signed' ? 'Sudah Ditandatangani' : 'Belum Ditandatangani'
}

export const sptFlagFilterOptions: { label: string, value: Bp26SptFlag | undefined }[] = [
  { label: 'Semua Flag SPT', value: undefined },
  ...(Object.entries(sptFlagLabel) as [Bp26SptFlag, string][]).map(
    ([value, label]) => ({ label, value })
  )
]

export const terCategoryLabel: Record<string, string> = {
  A: 'TER A',
  B: 'TER B',
  C: 'TER C'
}

export const calculationMethodLabel: Record<string, string> = {
  ter: 'SIM-TER',
  progresif: 'Progresif',
  flat: 'Flat',
  flat_x2: 'Flat x2 (tanpa NPWP)',
  treaty: 'Treaty',
  nol_skb: 'Nol (SKB)'
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatPeriod(row: { tax_month: number, tax_year: number }) {
  return `${monthLabels[row.tax_month]} ${row.tax_year}`
}

/** Client-side validation shared by the BP21/BP23/BP26 create forms. */
// SP (setor sendiri) / CY (digunggung): no counterparty, DPP entered directly.
export function validateSetorCreate(state: {
  class_id?: number
  tax_month?: number
  tax_year?: number
  dpp?: number
  document_number?: string
  document_nitku?: string
}) {
  const errors: { name: string, message: string }[] = []
  if (!state.class_id) errors.push({ name: 'class_id', message: 'Pilih kelas' })
  if (!state.tax_month) errors.push({ name: 'tax_month', message: 'Pilih masa pajak' })
  if (!state.tax_year) errors.push({ name: 'tax_year', message: 'Isi tahun pajak' })
  if (!state.dpp || Number(state.dpp) <= 0) {
    errors.push({ name: 'dpp', message: 'Dasar Pengenaan Pajak harus lebih dari 0' })
  }
  if (!state.document_number) {
    errors.push({ name: 'document_number', message: 'Nomor dokumen referensi wajib diisi' })
  }
  const nitku = (state.document_nitku || '').trim()
  if (nitku && !/^\d{22}$/.test(nitku)) {
    errors.push({ name: 'document_nitku', message: 'NITKU harus 22 digit bila diisi' })
  }
  return errors
}

export function validateBupotCreate(state: {
  class_id?: number
  tax_month?: number
  tax_year?: number
  recipient_identity_number?: string
  recipient_name?: string
  gross_income?: number
  document_number?: string
  withholder_npwp?: string
  withholder_nitku?: string
  recipient_nitku?: string
  document_nitku?: string
  tax_facility?: string
  ter_category?: string | null
}) {
  const errors: { name: string, message: string }[] = []
  if (!state.class_id) errors.push({ name: 'class_id', message: 'Pilih kelas' })
  if (!state.tax_month) errors.push({ name: 'tax_month', message: 'Pilih masa pajak' })
  if (!state.tax_year) errors.push({ name: 'tax_year', message: 'Isi tahun pajak' })
  const ident = (state.recipient_identity_number || '').trim()
  if (!ident) {
    errors.push({ name: 'recipient_identity_number', message: 'Nomor identitas wajib diisi' })
  } else if (!/^\d{16}$/.test(ident) && ident !== '0000000000000000') {
    // BP23 tanpa NPWP memakai 16 nol; BP26 TIN/paspor ditoleransi bila bukan 16 digit?
    // Untuk belajar: ingatkan format 16 digit, kecuali 16 nol khusus BP23.
    errors.push({ name: 'recipient_identity_number', message: 'Harus 16 digit (NPWP 16 / NIK)' })
  }
  if (!state.recipient_name) errors.push({ name: 'recipient_name', message: 'Nama wajib diisi' })
  if (!state.gross_income || Number(state.gross_income) <= 0) {
    errors.push({ name: 'gross_income', message: 'Penghasilan bruto harus lebih dari 0' })
  }
  if (!state.document_number) {
    errors.push({ name: 'document_number', message: 'Nomor dokumen referensi wajib diisi' })
  }
  const nitkuFields: ['withholder_nitku' | 'recipient_nitku' | 'document_nitku', string | undefined][] = [
    ['withholder_nitku', state.withholder_nitku],
    ['recipient_nitku', state.recipient_nitku],
    ['document_nitku', state.document_nitku]
  ]
  for (const [name, value] of nitkuFields) {
    const text = (value || '').trim()
    if (text && !/^\d{22}$/.test(text)) {
      errors.push({ name, message: 'NITKU harus 22 digit bila diisi' })
    }
  }
  const npwp = (state.withholder_npwp || '').trim()
  if (npwp && !/^\d{15,16}$/.test(npwp)) {
    errors.push({ name: 'withholder_npwp', message: 'NPWP pemotong harus 15 atau 16 digit' })
  }
  if ('ter_category' in state && state.tax_month !== undefined && Number(state.tax_month) !== 12 && !state.ter_category) {
    errors.push({ name: 'ter_category', message: 'Untuk Masa Jan–Nov pilih kategori TER (A/B/C)' })
  }
  if (state.tax_facility === 'skb' && !state.document_number) {
    errors.push({ name: 'document_number', message: 'SKB wajib mencantumkan nomor dokumen SKB' })
  }
  return errors
}
