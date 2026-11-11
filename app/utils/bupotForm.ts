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
 * "Nama Fasilitas" on BPNR/BP26. The treaty (SKD/P3B) choice reveals the
 * treaty fields; it maps to tax_facility "none" plus treaty data.
 */
export type BupotFacilityChoice = 'none' | 'treaty' | 'skb' | 'dtp'
export const bupotFacilityChoices: { label: string, value: BupotFacilityChoice }[] = [
  { label: 'Tanpa Fasilitas', value: 'none' },
  { label: 'SKD WPLN / P3B (Tax Treaty)', value: 'treaty' },
  { label: 'Surat Keterangan Bebas (SKB)', value: 'skb' },
  { label: 'PPh Ditanggung Pemerintah (DTP)', value: 'dtp' }
]
