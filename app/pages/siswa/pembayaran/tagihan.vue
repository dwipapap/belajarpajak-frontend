<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { TagihanListResponse, TagihanRead } from '~/types/api'
import { formatMasaPajak, kanalLabel } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const { data: list, status, refresh } = useAsyncData(
  'siswa-tagihan-list',
  () => apiFetch<TagihanListResponse>('/api/v1/tagihan'),
  { default: () => ({ items: [], total: 0, page: 1, size: 50 }) }
)

const busyId = ref<number | null>(null)
const angsukanN = ref<Record<number, number>>({})

async function buatBilling(row: TagihanRead) {
  busyId.value = row.id
  try {
    const billing = await apiFetch<{ id: number, code: string }>(`/api/v1/tagihan/${row.id}/buat-billing`, { method: 'POST' })
    toast.add({ title: 'Billing dibuat dari tagihan', description: `Kode ${billing.code} — bayar di Daftar Kode Billing.`, color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membuat billing', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busyId.value = null
  }
}

async function ajukanAngsuran(row: TagihanRead) {
  const n = angsukanN.value[row.id] ?? 3
  if (n < 2 || n > 12) {
    toast.add({ title: 'Jumlah cicilan 2–12', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  if (!row.billing_id) {
    toast.add({ title: 'Buat billing dulu', description: 'Angsuran diajukan atas kode billing tagihan.', color: 'warning', icon: 'i-lucide-triangle-alert' })
    return
  }
  busyId.value = row.id
  try {
    await apiFetch('/api/v1/angsuran', { method: 'POST', body: { billing_id: row.billing_id, n } })
    toast.add({ title: 'Angsuran diajukan', description: `${n} cicilan. Lihat jadwal di menu Angsuran.`, color: 'success', icon: 'i-lucide-check-circle' })
  } catch (error) {
    toast.add({ title: 'Gagal mengajukan angsuran', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busyId.value = null
  }
}

const columns: TableColumn<TagihanRead>[] = [
  { accessorKey: 'jenis', header: 'Jenis' },
  { accessorKey: 'kap_kjs', header: 'KAP-KJS' },
  { accessorKey: 'masa', header: 'Masa' },
  { accessorKey: 'amount', header: 'Nominal (Rp)' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/pembayaran">Pembayaran</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Tagihan Pajak</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main w-full">
        <div class="bupot-main__header">
          <div>
            <h1>Tagihan Pajak Saya</h1>
            <p class="text-sm text-muted">Ketetapan dari guru/admin. Buat billing untuk membayar, atau ajukan angsuran (cicilan 2–12×).</p>
          </div>
          <div class="bupot-actions">
            <UButton to="/siswa/pembayaran/angsuran" icon="i-lucide-calendar-clock" label="Lihat Angsuran" color="neutral" variant="soft" />
          </div>
        </div>
        <div class="faktur-table">
          <UTable :data="list?.items ?? []" :columns="columns" :loading="status === 'pending'">
            <template #masa-cell="{ row }">{{ formatMasaPajak(row.original.masa) }}</template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount) }}</template>
            <template #status-cell="{ row }">
              <UBadge :color="row.original.status === 'lunas' ? 'success' : 'warning'" variant="subtle">{{ row.original.status }}</UBadge>
              <span v-if="row.original.billing_id" class="ml-1 text-xs text-muted">billing #{{ row.original.billing_id }} {{ kanalLabel(null) === '—' ? '' : '' }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex flex-wrap items-center justify-end gap-1">
                <UButton
                  v-if="!row.original.billing_id && row.original.status !== 'lunas'"
                  icon="i-lucide-file-plus-2"
                  size="xs"
                  label="Buat Billing"
                  :loading="busyId === row.original.id"
                  @click="buatBilling(row.original)"
                />
                <template v-else-if="row.original.billing_id && row.original.status !== 'lunas'">
                  <UInputNumber v-model="angsukanN[row.original.id]" :min="2" :max="12" size="xs" class="w-24" placeholder="n (2–12)" />
                  <UButton icon="i-lucide-calendar-clock" size="xs" color="neutral" variant="soft" label="Ajukan Angsuran" :loading="busyId === row.original.id" @click="ajukanAngsuran(row.original)" />
                </template>
                <UButton v-else icon="i-lucide-check-circle" size="xs" color="success" variant="soft" label="Lunas" disabled />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada tagihan.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
