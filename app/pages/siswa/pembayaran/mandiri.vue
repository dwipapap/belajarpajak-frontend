<script setup lang="ts">
import type { BillingCreate, BillingRead } from '~/types/api'
import { mandiriKjsOptions } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const formState = reactive({
  kap_kjs: '411124-100',
  tax_month: new Date().getMonth() + 1,
  tax_year: new Date().getFullYear(),
  amount: 0 as number | undefined,
  uraian: ''
})

const saving = ref(false)
const submitError = ref<string | null>(null)

function validateMandiri(state: typeof formState) {
  const errors: { name: string, message: string }[] = []
  if (!mandiriKjsOptions.some(o => o.value === state.kap_kjs)) {
    errors.push({ name: 'kap_kjs', message: 'Pilih KAP-KJS yang tersedia' })
  }
  if (!state.tax_month || state.tax_month < 1 || state.tax_month > 12) {
    errors.push({ name: 'tax_month', message: 'Pilih masa pajak 1–12' })
  }
  if (!state.tax_year || state.tax_year < 2020 || state.tax_year > 2100) {
    errors.push({ name: 'tax_year', message: 'Tahun 2020–2100' })
  }
  if (!state.amount || Number(state.amount) <= 0) {
    errors.push({ name: 'amount', message: 'Nominal harus lebih dari 0' })
  }
  if ((state.uraian || '').length > 200) {
    errors.push({ name: 'uraian', message: 'Uraian maksimal 200 karakter' })
  }
  return errors
}

const masaPreview = computed(() => {
  const m = String(formState.tax_month || '').padStart(2, '0')
  return `${m}${formState.tax_year || ''}`
})

async function onSubmit() {
  saving.value = true
  submitError.value = null
  try {
    const body: BillingCreate = {
      kap_kjs: formState.kap_kjs,
      masa_pajak: masaPreview.value,
      amount: Number(formState.amount),
      uraian: formState.uraian?.trim() ? formState.uraian.trim() : null
    }
    const created = await apiFetch<BillingRead>('/api/v1/billings', { method: 'POST', body })
    toast.add({
      title: 'Kode billing dibuat',
      description: `${created.code} — berlaku 14 hari (simulasi).`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/siswa/pembayaran')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal membuat kode billing.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/pembayaran">Pembayaran</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Layanan Mandiri Kode Billing</strong>
    </div>

    <UForm :state="formState" :validate="validateMandiri" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <h1>LAYANAN MANDIRI KODE BILLING</h1>
          <p class="text-sm text-muted">Satu kode, satu KAP-KJS, satu masa, satu nominal. Berlaku 14 hari (simulasi PENG-4/PJ/2025).</p>
        </div>
        <div class="bupot-form__actions">
          <UButton to="/siswa/pembayaran" icon="i-lucide-arrow-left" color="neutral" variant="ghost">
            Kembali
          </UButton>
          <UButton type="submit" icon="i-lucide-plus" label="Buat Kode Billing" class="bupot-primary-button" :loading="saving" />
        </div>
      </div>

      <UAlert v-if="submitError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="submitError" />

      <section class="bupot-section">
        <header><h2>Detail Setoran</h2></header>
        <div class="bupot-grid">
          <UFormField name="kap_kjs" label="KAP-KJS" required>
            <USelect v-model="formState.kap_kjs" :items="mandiriKjsOptions" class="w-full" />
          </UFormField>
          <UFormField name="tax_month" label="Masa (bulan)" required>
            <USelect v-model="formState.tax_month" :items="monthOptions" class="w-full" />
          </UFormField>
          <UFormField name="tax_year" label="Tahun Pajak" required>
            <UInput v-model="formState.tax_year" type="number" class="w-full" />
          </UFormField>
          <UFormField name="amount" label="Nominal (Rp)" required>
            <UInput v-model="formState.amount" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField name="uraian" label="Uraian (opsional, maks 200)">
            <UInput v-model="formState.uraian" maxlength="200" placeholder="cth. Setoran mandiri PPh 23" class="w-full" />
          </UFormField>
          <UFormField name="masa_pajak" label="Masa Pajak (MMYYYY)">
            <UInput :model-value="masaPreview" disabled class="w-full" />
          </UFormField>
        </div>
      </section>
    </UForm>
  </div>
</template>
