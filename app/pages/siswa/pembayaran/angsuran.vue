<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AngsuranListResponse, AngsuranRead, CicilanRead } from '~/types/api'
import { kanalLabel, kanalOptions } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const { data: list, status, refresh } = useAsyncData(
  'siswa-angsuran-list',
  () => apiFetch<AngsuranListResponse>('/api/v1/angsuran'),
  { default: () => ({ items: [], total: 0, page: 1, size: 50 }) }
)

const expanded = ref<Record<number, boolean>>({})
const cicilanKanal = ref<Record<number, string>>({})
const busyCicilan = ref<number | null>(null)
const busyBatal = ref<number | null>(null)

function toggle(id: number) {
  expanded.value[id] = !expanded.value[id]
}

async function bayarCicilan(c: CicilanRead) {
  busyCicilan.value = c.id
  try {
    await apiFetch(`/api/v1/angsuran/cicilan/${c.id}/pay`, {
      method: 'POST',
      body: { kanal: cicilanKanal.value[c.id] || 'teller' }
    })
    toast.add({ title: `Cicilan ke-${c.ke} lunas`, description: `Via ${kanalLabel(cicilanKanal.value[c.id] || 'teller')}.`, color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membayar cicilan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busyCicilan.value = null
  }
}

async function batalkan(a: AngsuranRead) {
  busyBatal.value = a.id
  try {
    await apiFetch(`/api/v1/angsuran/${a.id}/batal`, { method: 'POST' })
    toast.add({ title: 'Angsuran dibatalkan', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membatalkan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busyBatal.value = null
  }
}

const columns: TableColumn<AngsuranRead>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'billing_id', header: 'Billing' },
  { accessorKey: 'n_cicilan', header: 'Jumlah Cicilan' },
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
      <strong>Angsuran</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main w-full">
        <div class="bupot-main__header">
          <div>
            <h1>Pengajuan Angsuran</h1>
            <p class="text-sm text-muted">Cicilan 2–12× atas kode billing. Klik baris untuk melihat jadwal.</p>
          </div>
        </div>
        <div class="faktur-table">
          <UTable :data="list?.items ?? []" :columns="columns" :loading="status === 'pending'">
            <template #status-cell="{ row }"><UBadge :color="row.original.status === 'lunas' ? 'success' : row.original.status === 'batal' ? 'error' : 'warning'" variant="subtle">{{ row.original.status }}</UBadge></template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton icon="i-lucide-calendar-days" size="xs" color="neutral" variant="soft" :label="expanded[row.original.id] ? 'Tutup' : 'Jadwal'" @click="toggle(row.original.id)" />
                <UButton v-if="row.original.status !== 'lunas' && row.original.status !== 'batal'" icon="i-lucide-x" size="xs" color="error" variant="soft" label="Batalkan" :loading="busyBatal === row.original.id" @click="batalkan(row.original)" />
              </div>
            </template>
            <template #expanded="{ row }">
              <div v-if="expanded[row.original.id]" class="p-3">
                <table class="spt-table">
                  <thead><tr><th>Cicilan</th><th>Jatuh Tempo</th><th class="text-right">Nominal (Rp)</th><th>Status</th><th>Kanal</th><th /></tr></thead>
                  <tbody>
                    <tr v-for="c in row.original.cicilan" :key="c.id">
                      <td>Ke-{{ c.ke }}</td>
                      <td>{{ c.jatuh_tempo }}</td>
                      <td class="text-right">{{ formatCurrency(c.amount) }}</td>
                      <td><UBadge :color="c.status === 'dibayar' ? 'success' : 'warning'" variant="subtle">{{ c.status }}</UBadge></td>
                      <td>{{ kanalLabel(c.kanal) }}</td>
                      <td class="text-right">
                        <div v-if="c.status !== 'dibayar'" class="flex items-center justify-end gap-1">
                          <USelect v-model="cicilanKanal[c.id]" :items="kanalOptions" size="xs" class="w-36" placeholder="Kanal" />
                          <UButton size="xs" color="success" label="Bayar" :loading="busyCicilan === c.id" @click="bayarCicilan(c)" />
                        </div>
                        <span v-else class="text-xs text-muted">{{ c.paid_at ? new Date(c.paid_at).toLocaleDateString('id-ID') : '' }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada pengajuan angsuran.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
