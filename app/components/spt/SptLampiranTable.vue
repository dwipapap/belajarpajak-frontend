<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SptLampiranListResponse, SptLampiranRow } from '~/types/api'
import { sptLampiranTitle } from '~/utils/spt'

/** Generic SPT lampiran table: read-only rows from source documents. */

const props = defineProps<{ sptId: number, kode: string }>()

const { apiFetch } = useApi()

const page = ref(1)
const pageSize = ref(20)
const filterNama = ref('')
const filterNomor = ref('')

const isPphRows = computed(() => props.kode.startsWith('daftar') || props.kode.startsWith('lampiran'))
const title = computed(() => sptLampiranTitle[props.kode] ?? props.kode.toUpperCase())

const { data, status, refresh } = useAsyncData(
  `siswa-spt-lampiran-${props.sptId}-${props.kode}`,
  () => {
    const query = new URLSearchParams({
      page: String(page.value),
      size: String(pageSize.value)
    })
    return apiFetch<SptLampiranListResponse>(`/api/v1/spt/${props.sptId}/lampiran/${props.kode}?${query.toString()}`)
  },
  { watch: [page, pageSize] }
)

watch([filterNama, filterNomor], () => {
  page.value = 1
})

const filtered = computed(() => {
  const nama = filterNama.value.trim().toLowerCase()
  const nomor = filterNomor.value.trim().toLowerCase()
  return (data.value?.items ?? []).filter((row) => {
    if (nama && !row.nama.toLowerCase().includes(nama)) return false
    if (nomor && !(row.nomor_dokumen ?? '').toLowerCase().includes(nomor)) return false
    return true
  })
})

function money(value: number) {
  return formatCurrency(value)
}

function formatTanggal(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ppnColumns: TableColumn<SptLampiranRow>[] = [
  { accessorKey: 'nama', header: 'Nama Pembeli / Penjual' },
  { accessorKey: 'identitas', header: 'NPWP / NIK / Paspor' },
  { accessorKey: 'nomor_dokumen', header: 'Nomor Dokumen' },
  { accessorKey: 'tanggal_dokumen', header: 'Tanggal Dokumen' },
  { accessorKey: 'dpp', header: 'DPP (Rp)' },
  { accessorKey: 'ppn', header: 'PPN (Rp)' },
  { accessorKey: 'ppnbm', header: 'PPnBM (Rp)' }
]

const pphColumns: TableColumn<SptLampiranRow>[] = [
  { accessorKey: 'nama', header: 'Nama' },
  { accessorKey: 'identitas', header: 'NIK / NPWP' },
  { accessorKey: 'nomor_dokumen', header: 'Nomor Bukti Potong' },
  { accessorKey: 'tanggal_dokumen', header: 'Tanggal' },
  { accessorKey: 'kjs', header: 'KJS' },
  { accessorKey: 'pph', header: 'PPh (Rp)' }
]

defineExpose({ refresh })
</script>

<template>
  <section class="spt-detail__section">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2>{{ title }}</h2>
      <div class="flex items-center gap-1">
        <UButton icon="i-lucide-plus" size="xs" color="neutral" variant="soft" label="Tambah" disabled />
        <UButton icon="i-lucide-trash-2" size="xs" color="neutral" variant="soft" label="Hapus" disabled />
        <UButton icon="i-lucide-upload" size="xs" color="neutral" variant="soft" label="Impor Data" disabled />
        <UBadge color="neutral" variant="subtle">Segera hadir</UBadge>
      </div>
    </div>

    <div class="mb-3 flex flex-wrap gap-2">
      <UInput v-model="filterNama" placeholder="Saring nama…" size="xs" class="min-w-48" />
      <UInput v-model="filterNomor" placeholder="Saring nomor dokumen…" size="xs" class="min-w-48" />
      <UButton icon="i-lucide-refresh-cw" size="xs" color="info" variant="soft" :loading="status === 'pending'" @click="refresh()" />
    </div>

    <div class="faktur-table" tabindex="0" role="region" :aria-label="`Tabel ${title}, geser ke kanan untuk melihat semua kolom`">
      <UTable :data="filtered" :columns="isPphRows ? pphColumns : ppnColumns" :loading="status === 'pending'">
        <template #tanggal_dokumen-cell="{ row }">{{ formatTanggal(row.original.tanggal_dokumen) }}</template>
        <template #dpp-cell="{ row }">{{ money(row.original.dpp) }}</template>
        <template #ppn-cell="{ row }">{{ money(row.original.ppn) }}</template>
        <template #ppnbm-cell="{ row }">{{ money(row.original.ppnbm) }}</template>
        <template #pph-cell="{ row }">{{ money(row.original.pph) }}</template>
        <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada data pada lampiran ini.</p></template>
      </UTable>
    </div>

    <div class="bupot-footer">
      <p>Total: {{ data?.total ?? 0 }} data</p>
      <div class="flex items-center gap-3">
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
        <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
      </div>
    </div>
  </section>
</template>
