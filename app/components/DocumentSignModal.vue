<script setup lang="ts">
/** Tanda Tangan Dokumen — shared signing modal mirroring the reference portal.

 * Jenis Penandatanganan: single option "Tanda Tangan Pembayar Pajak".
 * Penyedia Penandatanganan: single option "Kode Otorisasi (simulasi)".
 * ID Penandatanganan: read-only, the current user's username (NISN/NIK) or name.
 * Kata Sandi Penandatanganan: sent as `kode_otorisasi` (min 6 characters).
 *
 * Emits `confirm({ signer_name, kode_otorisasi })`; the caller performs the
 * actual /issue or /bulk-issue request.
 */

export interface DocumentSignConfirm {
  signer_name?: string
  kode_otorisasi: string
}

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    /** Overrides the read-only signing ID (defaults to the logged-in user). */
    signerId?: string
    /** True while the caller is performing the issue request. */
    loading?: boolean
  }>(),
  { signerId: undefined, loading: false }
)

const emit = defineEmits<{
  confirm: [payload: DocumentSignConfirm]
}>()

const auth = useAuth()

const signingType = ref('Tanda Tangan Pembayar Pajak')
const signingProvider = ref('Kode Otorisasi (simulasi)')
const signerName = ref('')
const kodeOtorisasi = ref('')
const error = ref<string | null>(null)

const signerIdDisplay = computed(
  () => props.signerId ?? auth.user.value?.username ?? auth.user.value?.full_name ?? ''
)

watch(open, (value) => {
  if (value) {
    signerName.value = auth.user.value?.full_name ?? ''
    kodeOtorisasi.value = ''
    error.value = null
  }
})

function confirm() {
  if (kodeOtorisasi.value.trim().length < 6) {
    error.value = 'Kata Sandi Penandatanganan minimal 6 karakter.'
    return
  }
  error.value = null
  emit('confirm', {
    signer_name: signerName.value.trim() || undefined,
    kode_otorisasi: kodeOtorisasi.value
  })
}
</script>

<template>
  <UModal v-model:open="open" title="Tanda Tangan Dokumen">
    <template #body>
      <p class="text-sm text-muted mb-3">
        Penandatangan simulasi + Kode Otorisasi simulasi. Bukan tanda tangan resmi.
      </p>
      <UFormField name="signing_type" label="Jenis Penandatanganan" required>
        <USelect
          v-model="signingType"
          :items="['Tanda Tangan Pembayar Pajak']"
          class="w-full"
        />
      </UFormField>
      <UFormField name="signing_provider" label="Penyedia Penandatanganan" required class="mt-3">
        <USelect
          v-model="signingProvider"
          :items="['Kode Otorisasi (simulasi)']"
          class="w-full"
        />
      </UFormField>
      <UFormField name="signer_id" label="ID Penandatanganan" class="mt-3">
        <UInput :model-value="signerIdDisplay" readonly class="w-full" />
      </UFormField>
      <UFormField name="signer_name" label="Nama penandatangan" required class="mt-3">
        <UInput v-model="signerName" class="w-full" />
      </UFormField>
      <UFormField name="kode_otorisasi" label="Kata Sandi Penandatanganan" required class="mt-3">
        <UInput
          v-model="kodeOtorisasi"
          type="password"
          placeholder="Minimal 6 karakter"
          class="w-full"
        />
      </UFormField>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="error"
        class="mt-3"
      />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Batal" @click="open = false;" />
        <UButton
          label="Konfirmasi Tanda Tangan"
          icon="i-lucide-pen-line"
          :loading="loading"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
