import type { MaybeRefOrGetter } from 'vue'
import type { ObjekPajak } from '~/types/api'

/** Form fields the catalog selection fills in. Optional ones are skipped when absent. */
export interface ObjekPajakFormState {
  tax_object_code: string
  tax_object_name?: string
  income_type?: string
  tax_type?: string
  tax_nature?: 'final' | 'non_final'
  rate_percent: number
  kap_kjs: string
}

const TAX_TYPE_BY_PASAL: Record<string, string> = {
  'Pasal 4 Ayat 2': 'PPh 4(2)',
  'Pasal 15': 'PPh 15',
  'Pasal 21': 'PPh 21',
  'Pasal 22': 'PPh 22',
  'Pasal 23': 'PPh 23',
  'Pasal 26': 'PPh 26'
}

/** "Jenis Pajak" label of a catalog pasal, e.g. "Pasal 23" -> "PPh 23". */
export function taxTypeFromPasal(pasal: string): string {
  return TAX_TYPE_BY_PASAL[pasal] ?? pasal
}

/**
 * Official tax-object catalog for one slip type, resolved for a facility code.
 * Refetches when the facility changes and auto-fills the form state (name, Jenis
 * Pajak, sifat, tarif, KAP) from the selected object.
 */
export function useObjekPajak(
  slipType: string,
  state: ObjekPajakFormState,
  facilityCode: MaybeRefOrGetter<string>
) {
  const { apiFetch } = useApi()

  const { data, status } = useAsyncData(
    `objek-pajak-${slipType}`,
    () => apiFetch<ObjekPajak[]>('/api/v1/referensi/objek-pajak', {
      query: { jenis: slipType, fasilitas: toValue(facilityCode) }
    }),
    { default: () => [] as ObjekPajak[], watch: [() => toValue(facilityCode)] }
  )

  const items = computed(() =>
    data.value.map(item => ({ label: `${item.kode} - ${item.nama}`, value: item.kode }))
  )
  const selected = computed(() => data.value.find(item => item.kode === state.tax_object_code))

  // A facility change can drop the chosen object from the list: clear it.
  watch(data, (list) => {
    if (list.length && state.tax_object_code && !list.some(item => item.kode === state.tax_object_code)) {
      state.tax_object_code = ''
    }
  })

  watch(
    selected,
    (obj) => {
      if (!obj) return
      if ('tax_object_name' in state) state.tax_object_name = obj.nama.slice(0, 150)
      if ('income_type' in state) state.income_type = obj.nama.slice(0, 150)
      if ('tax_type' in state) state.tax_type = taxTypeFromPasal(obj.pasal)
      if ('tax_nature' in state && obj.sifat) {
        state.tax_nature = obj.sifat.toLowerCase() === 'final' ? 'final' : 'non_final'
      }
      if (obj.tarif !== null) state.rate_percent = obj.tarif
      state.kap_kjs = obj.kap_kjs
    },
    { immediate: true }
  )

  const taxTypeLabel = computed(() => selected.value ? taxTypeFromPasal(selected.value.pasal) : '')
  const natureLabel = computed(() => state.tax_nature === 'final' ? 'Final' : 'Tidak Final')
  /** Tarif is typed by the student only when the catalog marks it manual. */
  const rateEditable = computed(() => !!selected.value && (selected.value.tarif_manual || selected.value.tarif === null))

  return { items, selected, loading: computed(() => status.value === 'pending'), taxTypeLabel, natureLabel, rateEditable }
}
