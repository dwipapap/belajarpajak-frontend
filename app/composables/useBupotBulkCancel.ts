import type { Ref } from 'vue'
import { bupotCode, type BupotModule } from '~/utils/bupot'

// Bulk "Batal" for the Telah Terbit tab: cancels each selected issued slip,
// which moves it to Tidak Valid.
export function useBupotBulkCancel(
  module: BupotModule,
  selectedIds: Ref<Set<number>>,
  refresh: () => Promise<unknown>
) {
  const { apiFetch } = useApi()
  const toast = useToast()
  const cancelling = ref(false)

  async function cancelSelected() {
    const ids = [...selectedIds.value]
    if (!ids.length || cancelling.value) return
    const code = bupotCode[module]
    if (!confirm(`Batalkan ${ids.length} eBupot ${code} yang dipilih?`)) return
    cancelling.value = true
    let cancelled = 0
    let lastError: unknown = null
    for (const id of ids) {
      try {
        await apiFetch(`/api/v1/${module}/${id}/cancel`, {
          method: 'POST',
          body: { reason: 'Dibatalkan oleh pemotong' }
        })
        cancelled += 1
      } catch (error) {
        lastError = error
      }
    }
    cancelling.value = false
    toast.add({
      title: `${cancelled} dari ${ids.length} eBupot ${code} dibatalkan`,
      description: lastError
        ? apiErrorMessage(lastError)
        : 'Dokumen dipindahkan ke tab Tidak Valid.',
      color: cancelled === ids.length ? 'warning' : 'error',
      icon: 'i-lucide-ban'
    })
    await refresh()
  }

  return { cancelling, cancelSelected }
}
