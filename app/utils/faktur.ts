// Shared labels/options/formatters for the e-Faktur modules.
// Status labels, month options and formatCurrency live in utils/bupot.ts and are
// reused here — a faktur has the same draft/issued/invalid lifecycle as a bupot.
import type {
  BuyerIdentityType,
  TaxInputCreditStatus,
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
  { label: 'Normal', value: 'normal' }
  // 'pengganti' is intentionally not offered: the backend rejects it (item 6).
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

export const creditStatusLabel: Record<TaxInputCreditStatus, string> = {
  not_credited: 'Belum Dikreditkan',
  credited: 'Dikreditkan'
}

export const creditStatusColor: Record<TaxInputCreditStatus, 'warning' | 'success'> = {
  not_credited: 'warning',
  credited: 'success'
}

export const creditTabs: { label: string, value: TaxInputCreditStatus }[] = [
  { label: 'Belum Dikreditkan', value: 'not_credited' },
  { label: 'Dikreditkan', value: 'credited' }
]

/** Display a stored 17-digit Nomor Faktur as 01.00-26.00000000001 (PER-11/PJ/2025). */
export function formatInvoiceNumber(digits: string | null | undefined) {
  if (!digits) return '-'
  if (digits.length === 17) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits.slice(4, 6)}.${digits.slice(6)}`
  if (digits.length === 16) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}-${digits.slice(6, 8)}.${digits.slice(8)}` // fallback read-only legacy
  return digits
}
// Example: 01002600000000001 -> 01.00-26.00000000001

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
 * ROUND_HALF_UP division of two non-negative integers — mirrors the backend's
 * ``Decimal.quantize(..., rounding=ROUND_HALF_UP)`` so a preview never disagrees
 * with the stored figures.
 */
function roundHalfUpDivide(num: bigint, den: bigint): bigint {
  if (num < 0n) return 0n
  const q = num / den
  const rem = num % den
  return rem * 2n >= den ? q + 1n : q
}

const percentToBasis = (percent: number) => Math.round(Number(percent) * 100)

/**
 * Preview of one Detail Transaksi row, mirroring the backend tax engine so the
 * modal can show live figures. The saved values always come from the API
 * response — this is display only. All money math stays on integers (BigInt),
 * never ``Number`` arithmetic, so large rupiah amounts and fractional rates
 * round exactly like the server.
 */
export function calculateLine(
  line: Pick<
    TaxInvoiceLineCreate,
    'unit_price' | 'quantity' | 'discount' | 'use_dpp_other' | 'ppn_rate_percent' | 'ppnbm_rate_percent'
  >
): CalculatedLine {
  const qtyMilli = BigInt(Math.round(Number(line.quantity || 0) * 1000))
  const total = roundHalfUpDivide(BigInt(line.unit_price || 0) * qtyMilli, 1000n)

  let dpp = total - BigInt(line.discount || 0)
  if (dpp < 0n) dpp = 0n

  let dppOther = 0n
  let ppnBase = dpp
  if (line.use_dpp_other) {
    dppOther = roundHalfUpDivide(dpp * 11n, 12n) // 11/12 of DPP
    ppnBase = dppOther
  }

  const ppn = roundHalfUpDivide(ppnBase * BigInt(percentToBasis(line.ppn_rate_percent || 0)), 10000n)
  const ppnbm = roundHalfUpDivide(dpp * BigInt(percentToBasis(line.ppnbm_rate_percent || 0)), 10000n)

  return {
    total_price: Number(total),
    dpp: Number(dpp),
    dpp_other: Number(dppOther),
    ppn: Number(ppn),
    ppnbm: Number(ppnbm)
  }
}

/**
 * Runnable self-check for the preview arithmetic (the repo has no JS test
 * runner). Run via `npm run check:faktur`; it throws unless every case matches
 * the backend engine.
 */
export function selfCheckFakturPreview(): void {
  const expect = (label: string, actual: CalculatedLine, want: CalculatedLine) => {
    for (const key of ['total_price', 'dpp', 'dpp_other', 'ppn', 'ppnbm'] as const) {
      if (actual[key] !== want[key]) {
        throw new Error(`${label}.${key}: got ${actual[key]}, want ${want[key]}`)
      }
    }
  }

  expect(
    'fractional quantity',
    calculateLine({ unit_price: 1_000_000, quantity: 2.5, discount: 0, use_dpp_other: false, ppn_rate_percent: 12, ppnbm_rate_percent: 0 }),
    { total_price: 2_500_000, dpp: 2_500_000, dpp_other: 0, ppn: 300_000, ppnbm: 0 }
  )
  expect(
    'DPP Nilai Lain (11/12)',
    calculateLine({ unit_price: 1_000_000, quantity: 1, discount: 0, use_dpp_other: true, ppn_rate_percent: 12, ppnbm_rate_percent: 20 }),
    { total_price: 1_000_000, dpp: 1_000_000, dpp_other: 916_667, ppn: 110_000, ppnbm: 200_000 }
  )
  expect(
    'large amount',
    calculateLine({ unit_price: 9_999_999_999, quantity: 3, discount: 0, use_dpp_other: false, ppn_rate_percent: 12, ppnbm_rate_percent: 0 }),
    { total_price: 29_999_999_997, dpp: 29_999_999_997, dpp_other: 0, ppn: 3_600_000_000, ppnbm: 0 }
  )
}

/** Client-side validation for the Buat/Ubah Faktur form. UX only — the API re-validates. */
export function validateFakturCreate(state: {
  transaction_code?: string
  invoice_date?: string
  invoice_kind?: TaxInvoiceKind
  tax_month?: number
  tax_year?: number
  buyer_identity_type?: BuyerIdentityType
  buyer_identity_number?: string
  buyer_document_number?: string
  buyer_name?: string
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

  // Identity mirrors the server authority (item 10).
  const idNumber = state.buyer_identity_number || ''
  const identityType = state.buyer_identity_type
  if (identityType === 'nik') {
    if (!/^\d{16}$/.test(idNumber)) {
      errors.push({ name: 'buyer_identity_number', message: 'NIK wajib 16 digit angka' })
    }
  } else if (identityType === 'npwp') {
    const cleaned = idNumber.replace(/[.\-]/g, '')
    if (!/^\d{15,16}$/.test(cleaned)) {
      errors.push({ name: 'buyer_identity_number', message: 'Nomor NPWP tidak valid' })
    }
  } else if (identityType === 'paspor' || identityType === 'identitas_lain') {
    if (!idNumber) {
      errors.push({ name: 'buyer_identity_number', message: 'Nomor identitas wajib diisi' })
    }
    if (!state.buyer_document_number) {
      errors.push({ name: 'buyer_document_number', message: 'Nomor dokumen wajib diisi' })
    }
  } else if (!idNumber) {
    errors.push({ name: 'buyer_identity_number', message: 'Nomor identitas WP wajib diisi' })
  }

  if (!state.buyer_name) errors.push({ name: 'buyer_name', message: 'Nama pembeli wajib diisi' })
  if (!state.lines?.length) {
    errors.push({ name: 'lines', message: 'Tambahkan minimal satu detail transaksi' })
  }
  return errors
}

export const validateFakturMasukanCreate = validateFakturCreate

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
  } else {
    const [, frac = ''] = String(state.quantity).split('.')
    if (frac.length > 3) {
      errors.push({ name: 'quantity', message: 'Kuantitas maksimal 3 digit pecahan' })
    }
  }
  return errors
}
