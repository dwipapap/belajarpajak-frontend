<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PbkCreate, PbkListResponse, PbkRead } from '~/types/api'
import { formatMasaPajak } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const { data: list, status, refresh } = useAsyncData(
  'siswa-pbk-list',
  () => apiFetch<PbkListResponse>('/api/v1/pbk'),
  { default: () => ({ items: [], total: 0, page: 1, size: 50 }) }
)

const formState = reactive({ dari_kap: '', ke_kap: '', amount: undefined as number | undefined, tax_month: new Date().getMonth() + 1, tax_year: new Date().getFullYear(), alasan: '' })
const saving = ref(false)

const masaValue = computed(() => `${String(formState.tax_month).padStart(2, '0')}${formState.tax_year}`)

function validate(state: typeof formState) {
  const errors: { name: string, message: string }[] = []
  if (!state.dari_kap) errors.push({ name: 'dari_kap', message: 'KAP asal wajib diisi' })
  if (!state.ke_kap) errors.push({ name: 'ke_kap', message: 'KAP tujuan wajib diisi' })
  if (state.dari_kap && state.ke_kap && state.dari_kap === state.ke_kap) errors.push({ name: 'ke_kap', message: 'KAP tujuan harus berbeda dari asal' })
  if (!state.amount || Number(state.amount) <= 0) errors.push({ name: 'amount', message: 'Nominal harus lebih dari 0' })
  if (!state.alasan?.trim()) errors.push({ name: 'alasan', message: 'Alasan wajib diisi' })
  return errors
}

async function onSubmit() {
  saving.value = true
  try {
    const body: PbkCreate = { dari_kap: formState.dari_kap.trim(), ke_kap: formState.ke_kap.trim(), amount: Number(formState.amount), masa: masaValue.value, alasan: formState.alasan.trim() }
    await apiFetch('/api/v1/pbk', { method: 'POST', body })
    toast.add({ title: 'Permohonan PbK dikirim', description: 'Status: diajukan. Menunggu persetujuan guru.', color: 'success', icon: 'i-lucide-check-circle' })
    formState.dari_kap = ''
    formState.ke_kap = ''
    formState.amount = undefined
    formState.alasan = ''
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal mengajukan PbK', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

const statusColor = (s: string) => s === 'disetujui' ? 'success' : s === 'ditolak' ? 'error' : 'warning'
const statusText = (s: string) => s === 'disetujui' ? 'Disetujui' : s === 'ditolak' ? 'Ditolak' : 'Diajukan'

const columns: TableColumn<PbkRead>[] = [
  { accessorKey: 'created_at', header: 'Tanggal' },
  { accessorKey: 'dari_kap', header: 'Dari KAP' },
  { accessorKey: 'ke_kap', header: 'Ke KAP' },
  { accessorKey: 'masa', header: 'Masa' },
  { accessorKey: 'amount', header: 'Nominal (Rp)' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'alasan', header: 'Alasan' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/pembayaran">Pembayaran</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Pemindahbukuan</strong>
    </div>

    <UForm :state="formState" :validate="validate" class="bupot-form mb-4" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <h1>PERMOHONAN PEMINDAHBUKUAN (PBK)</h1>
          <p class="text-sm text-muted">Pindahkan setoran antar KAP, mis. salah setor. Persetujuan oleh guru.</p>
        </div>
        <div class="bupot-form__actions">
          <UButton type="submit" icon="i-lucide-send" label="Ajukan PbK" class="bupot-primary-button" :loading="saving" />
        </div>
      </div>
      <section class="bupot-section">
        <div class="bupot-grid">
          <UFormField name="dari_kap" label="Dari KAP" required><UInput v-model="formState.dari_kap" placeholder="cth. 411124" class="w-full" /></UFormField>
          <UFormField name="ke_kap" label="Ke KAP" required><UInput v-model="formState.ke_kap" placeholder="cth. 411128" class="w-full" /></UFormField>
          <UFormField name="tax_month" label="Masa (bulan)" required><USelect v-model="formState.tax_month" :items="monthOptions" class="w-full" /></UFormField>
          <UFormField name="tax_year" label="Tahun" required><UInput v-model="formState.tax_year" type="number" class="w-full" /></UFormField>
          <UFormField name="amount" label="Nominal (Rp)" required><UInput v-model="formState.amount" type="number" min="1" class="w-full" /></UFormField>
          <UFormField name="alasan" label="Alasan" required><UInput v-model="formState.alasan" placeholder="cth. Salah setor KAP" class="w-full" /></UFormField>
        </div>
      </section>
    </UForm>

    <div class="bupot-shell">
      <section class="bupot-main w-full">
        <div class="bupot-main__header"><h1>Riwayat Pemindahbukuan</h1></div>
        <div class="faktur-table">
          <UTable :data="list?.items ?? []" :columns="columns" :loading="status === 'pending'">
            <template #created_at-cell="{ row }">{{ row.original.created_at ? new Date(row.original.created_at).toLocaleDateString('id-ID') : '—' }}</template>
            <template #masa-cell="{ row }">{{ formatMasaPajak(row.original.masa) }}</template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount) }}</template>
            <template #status-cell="{ row }"><UBadge :color="statusColor(row.original.status)" variant="subtle">{{ statusText(row.original.status) }}</UBadge></template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada permohonan PbK.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
