// Shared labels/formatters for the e-Bupot modules (BP21, BP26, ...).
import type { Bp21Status, Bp21TaxFacility } from '~/types/api'

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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatPeriod(row: { tax_month: number, tax_year: number }) {
  return `${monthLabels[row.tax_month]} ${row.tax_year}`
}

/** Client-side validation shared by the BP21/BP26 create forms. */
export function validateBupotCreate(state: {
  class_id?: number
  tax_month?: number
  tax_year?: number
  recipient_identity_number?: string
  recipient_name?: string
  gross_income?: number
  document_number?: string
}) {
  const errors: { name: string, message: string }[] = []
  if (!state.class_id) errors.push({ name: 'class_id', message: 'Pilih kelas' })
  if (!state.tax_month) errors.push({ name: 'tax_month', message: 'Pilih masa pajak' })
  if (!state.tax_year) errors.push({ name: 'tax_year', message: 'Isi tahun pajak' })
  if (!state.recipient_identity_number) {
    errors.push({ name: 'recipient_identity_number', message: 'Nomor identitas wajib diisi' })
  }
  if (!state.recipient_name) errors.push({ name: 'recipient_name', message: 'Nama wajib diisi' })
  if (!state.gross_income || Number(state.gross_income) <= 0) {
    errors.push({ name: 'gross_income', message: 'Penghasilan bruto harus lebih dari 0' })
  }
  if (!state.document_number) {
    errors.push({ name: 'document_number', message: 'Nomor dokumen referensi wajib diisi' })
  }
  return errors
}
