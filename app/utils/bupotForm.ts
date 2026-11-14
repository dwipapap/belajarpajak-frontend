// Shared pieces of the eBupot create forms (reference-portal field set).
import type { ComputedRef } from 'vue'

/** Jenis Dokumen options, in the reference portal's order. */
export const bupotDocumentTypes = [
  'Akta Perjanjian',
  'Akta Rapat Umum Pemegang Saham',
  'Bukti Pembayaran',
  'Dokumen Ketentuan Peraturan Perpajakan',
  'Dokumen Lainnya',
  'Dokumen Pemberian Fasilitas Lainnya',
  'Faktur Pajak',
  'Jasa Giro',
  'Kontrak',
  'Pengumuman',
  'Surat Keputusan',
  'Surat Pernyataan',
  'Surat Tagihan',
  'Trade Confirmation'
]

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/** One "Masa Pajak" dropdown: current month back `count` months, value `YYYY-MM`. */
export function masaPajakOptions(count = 15, from = new Date()) {
  const items: { label: string, value: string }[] = []
  let year = from.getFullYear()
  let month = from.getMonth() + 1
  for (let i = 0; i < count; i++) {
    items.push({
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      value: `${year}-${String(month).padStart(2, '0')}`
    })
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return items
}

/** Two-way binding between the single Masa Pajak dropdown and tax_month/tax_year. */
export function useMasaPajak(state: { tax_month: number, tax_year: number }) {
  const items = masaPajakOptions()
  const model = computed({
    get: () => `${state.tax_year}-${String(state.tax_month).padStart(2, '0')}`,
    set: (value: string) => {
      const [year, month] = value.split('-').map(Number)
      state.tax_year = year!
      state.tax_month = month!
    }
  })
  return { masaPajak: model, masaPajakItems: items }
}

/**
 * The backend needs class_id, but the reference form has no Kelas field:
 * pick the class automatically when the student has exactly one, and only
 * show the field otherwise.
 */
export function useAutoClass(
  state: { class_id?: number },
  classOptions: ComputedRef<{ value: number }[]>
) {
  watch(
    classOptions,
    (options) => {
      if (options.length === 1 && !state.class_id) state.class_id = options[0]!.value
    },
    { immediate: true }
  )
  return { showClassField: computed(() => classOptions.value.length !== 1) }
}

/**
 * Fasilitas choices per module, labelled as in the official portal. The value is
 * the stored `tax_facility`; `facilityCodeByChoice` is the catalog facility code
 * used to resolve rates (9 tanpa fasilitas, 4 DTP, 7 SKD, 8 lainnya).
 * SKD ("treaty") also reveals the Receipt Number field on BPNR/BP26.
 */
export type BupotFacilityChoice = 'none' | 'dtp' | 'treaty' | 'lainnya' | 'skb' | 'rate_0'

export const facilityCodeByChoice: Record<BupotFacilityChoice, string> = {
  none: '9',
  dtp: '4',
  treaty: '7',
  lainnya: '8',
  skb: '8',
  rate_0: '9'
}

/** BPPU / SP / CY / BP23 (and BP21). */
export const bupotFacilityChoices: { label: string, value: BupotFacilityChoice }[] = [
  { label: 'Tanpa Fasilitas', value: 'none' },
  { label: 'PPh Ditanggung Pemerintah (DTP)', value: 'dtp' },
  { label: 'Fasilitas Lainnya', value: 'lainnya' }
]

/** BPNR / BP26. */
export const bupotFacilityChoicesNonResident: { label: string, value: BupotFacilityChoice }[] = [
  { label: 'Tanpa Fasilitas', value: 'none' },
  { label: 'Surat Keterangan Domisili (SKD)', value: 'treaty' },
  { label: 'Fasilitas Lainnya', value: 'lainnya' }
]
