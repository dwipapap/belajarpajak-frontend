<script setup lang="ts">
import type { DepositRead } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const { data: deposit, status, refresh } = useAsyncData(
  'siswa-deposit',
  () => apiFetch<DepositRead>('/api/v1/deposit'),
  { default: () => ({ saldo: 0, mutasi: [] as DepositRead['mutasi'] }) }
)

const syncing = ref(false)

async function sinkronkan() {
  syncing.value = true
  try {
    await apiFetch('/api/v1/deposit/sinkron', { method: 'POST' })
    toast.add({ title: 'Deposit disinkronkan', description: 'Saldo diperbarui dari pembayaran billing mandiri 411618.', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal sinkronisasi', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    syncing.value = false
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
      <strong>Deposit Pajak</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main w-full">
        <div class="bupot-main__header">
          <div>
            <h1>Deposit Pajak Saya</h1>
            <p class="text-sm text-muted">Saldo prabayar untuk melunasi SPT kurang bayar tanpa kode billing.</p>
          </div>
          <div class="bupot-actions">
            <UButton icon="i-lucide-refresh-cw" label="Sinkronkan" color="info" variant="soft" :loading="syncing || status === 'pending'" @click="sinkronkan" />
          </div>
        </div>

        <UCard class="mb-4">
          <template #header><strong>Saldo Deposit</strong></template>
          <p class="text-3xl font-extrabold">Rp {{ formatCurrency(deposit?.saldo ?? 0) }}</p>
          <p class="mt-2 text-sm text-muted">
            Cara top-up: buat <NuxtLink to="/siswa/pembayaran/mandiri" class="underline">Billing Mandiri</NuxtLink>
            dengan KAP <span class="font-mono font-semibold">411618-100</span> (Deposit Pajak), bayar billing tersebut,
            lalu tekan <strong>Sinkronkan</strong> agar saldo bertambah.
          </p>
        </UCard>

        <h2 class="mb-2 font-bold">Riwayat Mutasi</h2>
        <div class="faktur-table">
          <UTable :data="deposit?.mutasi ?? []" :loading="status === 'pending'" :columns="[
            { accessorKey: 'created_at', header: 'Tanggal' },
            { accessorKey: 'jenis', header: 'Jenis' },
            { accessorKey: 'amount', header: 'Nominal (Rp)' },
            { accessorKey: 'note', header: 'Keterangan' }
          ]">
            <template #created_at-cell="{ row }">
              {{ row.original.created_at ? new Date(row.original.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' }}
            </template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount) }}</template>
            <template #note-cell="{ row }">{{ row.original.note || `ref ${row.original.ref_type ?? '-'}#${row.original.ref_id ?? '-'}` }}</template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada mutasi deposit.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
