// Shared labels/options/formatters for the e-Faktur modules.
// Status labels, month options and formatCurrency live in utils/bupot.ts and are
// reused here — a faktur has the same draft/issued/invalid lifecycle as a bupot.
import type {
  BuyerIdentityType,
  TaxInvoiceKind,
  TaxInvoiceLineCreate,
  TaxInvoiceLineType
} from '~/types/api'

export const transactionCodeOptions: { label: string, value: string }[] = [
  { label: '01 - Kepada Selain Pemungut PPN', value: '01' },
  { label: '02 - Kepada Pemungut PPN Instansi Pemerintah', value: '02' },
  { label: '03 - Kepada Pemungut PPN Selain Instansi Pemerintah', value: '03' },
  { label: '04 - DPP Nilai Lain', value: '04' },
  { label: '05 - Besaran Tertentu', value: '05' },
  {
    label: '06 - Kepada Orang Pribadi Pemegang Paspor Luar Negeri (16E UU PPN)',
    value: '06'
  },
  {
    label: '07 - Penyerahan dengan Fasilitas PPN atau PPN dan PPnBM Tidak Dipungut/Ditanggung Pemerintah',
    value: '07'
  },
  {
    label: '08 - Penyerahan dengan Fasilitas Dibebaskan PPN atau PPN dan PPnBM',
    value: '08'
  },
  {
    label: '09 - Penyerahan Aktiva yang Menurut Tujuan Semula Tidak Diperjualbelikan (16D UU PPN)',
    value: '09'
  },
  { label: '10 - Penyerahan Lainnya', value: '10' }
]

export const transactionCodeLabel: Record<string, string> = Object.fromEntries(
  transactionCodeOptions.map(item => [item.value, item.label])
)

export const transactionCodeFilterOptions: { label: string, value: string | undefined }[] = [
  { label: 'Pilih Kode Transaksi', value: undefined },
  ...transactionCodeOptions
]

/**
 * Kode transaksi whose DPP is always the "nilai lain" base (11/12 of the price).
 * Mirrors DPP_OTHER_CODES in the backend router — the API re-forces this, the
 * UI only reflects it so the checkbox can't look wrong.
 */
export const DPP_OTHER_CODES = ['04', '05']

export const invoiceKindOptions: { label: string, value: TaxInvoiceKind }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Pengganti', value: 'pengganti' },
  { label: 'Dibatalkan', value: 'dibatalkan' }
]

export const invoiceKindLabel = {
  normal: 'Normal',
  pengganti: 'Pengganti',
  dibatalkan: 'Dibatalkan'
} satisfies Record<TaxInvoiceKind, string>

export const lineTypeOptions: { label: string, value: TaxInvoiceLineType }[] = [
  { label: 'Barang', value: 'barang' },
  { label: 'Jasa', value: 'jasa' }
]

export const lineTypeLabel = {
  barang: 'Barang',
  jasa: 'Jasa'
} satisfies Record<TaxInvoiceLineType, string>

export const buyerIdentityOptions: { label: string, value: BuyerIdentityType }[] = [
  { label: 'Nomor Identitas WP', value: 'npwp' },
  { label: 'NIK', value: 'nik' },
  { label: 'Paspor', value: 'paspor' },
  { label: 'Identitas Lain', value: 'identitas_lain' }
]

/** Paspor / Identitas Lain are the identities that need a document number. */
export const DOCUMENT_NUMBER_IDENTITIES: BuyerIdentityType[] = ['paspor', 'identitas_lain']

export const countryOptions = [
  { label: 'Indonesia', value: 'ID' },
  { label: 'Singapura', value: 'SG' },
  { label: 'Malaysia', value: 'MY' },
  { label: 'Jepang', value: 'JP' },
  { label: 'Amerika Serikat', value: 'US' },
  { label: 'Belanda', value: 'NL' }
]

export const unitOptions = [
  'Bulan',
  'Tahun',
  'Hari',
  'Jam',
  'Unit',
  'Buah',
  'Paket',
  'Kg',
  'Liter',
  'Meter'
]

export const itemCodeOptions = [
  { label: '000000 - Barang/Jasa Lainnya', value: '000000' },
  { label: '010000 - Barang Kena Pajak Umum', value: '010000' },
  { label: '020000 - Bahan Bangunan', value: '020000' },
  { label: '030000 - Kendaraan Bermotor', value: '030000' },
  { label: '040000 - Hasil Pertanian', value: '040000' },
  { label: '050000 - Jasa Konstruksi', value: '050000' },
  { label: '060000 - Jasa Angkutan Barang', value: '060000' },
  { label: '070000 - Jasa Sewa', value: '070000' },
  { label: '080000 - Jasa Perawatan dan Perbaikan', value: '080000' },
  { label: '090000 - Jasa Konsultasi', value: '090000' }
]

export const ppnRateOptions = [
  { label: '12%', value: 12 },
  { label: '11%', value: 11 },
  { label: '0%', value: 0 }
]

export const pageSizeOptions = [10, 25, 50, 100]

/** Display a stored 16-digit Nomor Faktur as 010.000-26.00000001. */
export function formatInvoiceNumber(digits: string | null | undefined) {
  if (!digits) return '-'
  if (digits.length !== 16) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}-${digits.slice(6, 8)}.${digits.slice(8)}`
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}

export function formatInvoiceDate(iso: string | null | undefined) {
  if (!iso) return '-'
  const [year, month, day] = iso.split('-')
  return `${day}-${month}-${year}`
}

export interface CalculatedLine {
  total_price: number
  dpp: number
  dpp_other: number
  ppn: number
  ppnbm: number
}

/**
 * Preview of one Detail Transaksi row, mirroring the backend tax engine so the
 * modal can show live figures. The saved values always come from the API
 * response — this is display only.
 */
export function calculateLine(
  line: Pick<
    TaxInvoiceLineCreate,
    'unit_price' | 'quantity' | 'discount' | 'use_dpp_other' | 'ppn_rate_percent' | 'ppnbm_rate_percent'
  >
): CalculatedLine {
  const totalPrice = Math.round(Number(line.unit_price || 0) * Number(line.quantity || 0))
  const dpp = Math.max(totalPrice - Number(line.discount || 0), 0)
  const dppOther = line.use_dpp_other ? Math.round((dpp * 11) / 12) : 0
  const ppnBase = line.use_dpp_other ? dppOther : dpp

  return {
    total_price: totalPrice,
    dpp,
    dpp_other: dppOther,
    ppn: Math.round((ppnBase * Number(line.ppn_rate_percent || 0)) / 100),
    ppnbm: Math.round((dpp * Number(line.ppnbm_rate_percent || 0)) / 100)
  }
}

/** Client-side validation for the Buat/Ubah Faktur form. UX only — the API re-validates. */
export function validateFakturCreate(state: {
  transaction_code?: string
  invoice_date?: string
  invoice_kind?: TaxInvoiceKind
  tax_month?: number
  tax_year?: number
  buyer_identity_number?: string
  buyer_name?: string
  buyer_address?: string
  buyer_idtku?: string
  lines?: unknown[]
}) {
  const errors: { name: string, message: string }[] = []
  if (!state.transaction_code) {
    errors.push({ name: 'transaction_code', message: 'Pilih kode transaksi' })
  }
  if (!state.invoice_date) errors.push({ name: 'invoice_date', message: 'Isi tanggal faktur' })
  if (!state.invoice_kind) errors.push({ name: 'invoice_kind', message: 'Pilih jenis faktur' })
  if (!state.tax_month) errors.push({ name: 'tax_month', message: 'Pilih masa pajak' })
  if (!state.tax_year) errors.push({ name: 'tax_year', message: 'Isi tahun pajak' })
  if (!state.buyer_identity_number) {
    errors.push({ name: 'buyer_identity_number', message: 'Nomor identitas WP wajib diisi' })
  }
  if (!state.buyer_name) errors.push({ name: 'buyer_name', message: 'Nama pembeli wajib diisi' })
  if (!state.buyer_address) errors.push({ name: 'buyer_address', message: 'Alamat wajib diisi' })
  if (!state.buyer_idtku) errors.push({ name: 'buyer_idtku', message: 'IDTKU wajib diisi' })
  if (!state.lines?.length) {
    errors.push({ name: 'lines', message: 'Tambahkan minimal satu detail transaksi' })
  }
  return errors
}

/** Validation for one Detail Transaksi row inside the Tambah Transaksi modal. */
export function validateFakturLine(state: {
  item_name?: string
  unit?: string
  unit_price?: number
  quantity?: number
}) {
  const errors: { name: string, message: string }[] = []
  if (!state.item_name) errors.push({ name: 'item_name', message: 'Nama wajib diisi' })
  if (!state.unit) errors.push({ name: 'unit', message: 'Satuan wajib diisi' })
  if (!state.unit_price || Number(state.unit_price) <= 0) {
    errors.push({ name: 'unit_price', message: 'Harga satuan harus lebih dari 0' })
  }
  if (!state.quantity || Number(state.quantity) <= 0) {
    errors.push({ name: 'quantity', message: 'Kuantitas harus lebih dari 0' })
  }
  return errors
}
