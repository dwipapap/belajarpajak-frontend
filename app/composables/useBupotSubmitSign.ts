import type { DocumentSignConfirm } from '~/components/DocumentSignModal.vue'
import type { BupotModule } from '~/utils/bupot'

// Submit on an eBupot create form: the draft is already saved, then the
// Tanda Tangan Dokumen modal opens and issuing happens on confirm. Closing
// the modal keeps the document as a draft (Belum Terbit).
export function useBupotSubmitSign(module: BupotModule, label: string) {
  const { apiFetch } = useApi()
  const toast = useToast()
  const signOpen = ref(false)
  const signing = ref(false)
  const pendingId = ref<number | null>(null)
  const listPath = `/siswa/${module}`

  function openSign(id: number) {
    pendingId.value = id
    signOpen.value = true
  }

  async function confirmSign(payload: DocumentSignConfirm) {
    if (pendingId.value === null) return
    signing.value = true
    try {
      await apiFetch(`/api/v1/${module}/${pendingId.value}/issue`, {
        method: 'POST',
        body: payload
      })
      pendingId.value = null
      signOpen.value = false
      toast.add({
        title: `${label} diterbitkan`,
        description: 'Dokumen masuk ke tab Telah Terbit.',
        color: 'success',
        icon: 'i-lucide-send'
      })
      await navigateTo(listPath)
    } catch (error) {
      toast.add({
        title: `Gagal menerbitkan ${label}`,
        description: apiErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    } finally {
      signing.value = false
    }
  }

  watch(signOpen, async (open) => {
    if (open || pendingId.value === null) return
    pendingId.value = null
    toast.add({
      title: `Konsep ${label} disimpan`,
      description: 'Belum ditandatangani; dokumen ada di tab Belum Terbit.',
      color: 'warning',
      icon: 'i-lucide-save'
    })
    await navigateTo(listPath)
  })

  return { signOpen, signing, openSign, confirmSign }
}
