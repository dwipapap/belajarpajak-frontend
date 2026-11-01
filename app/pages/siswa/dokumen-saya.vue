<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  DokumenSayaJenis,
  DokumenSayaListResponse,
  DokumenSayaRow
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeJenis = ref<DokumenSayaJenis | undefined>(undefined)
const filterYear = ref<number | undefined>(undefined)

const { data: dokumen, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-dokumen-saya',
  () => {
    const query = new URLSearchParams({ page: '1', size: '100' })
    if (activeJenis.value) query.set('jenis', activeJenis.value)
    if (filterYear.value) query.set('tahun', String(filterYear.value))
    return apiFetch<DokumenSayaListResponse>(`/api/v1/dokumen-saya?${query.toString()}`)
  },
  { default: () => ({ items: [], total: 0 }), watch: [activeJenis, filterYear] }
)

const jenisTabs: { value: DokumenSayaJenis | undefined, label: string }[] = [
  { value: undefined, label: 'Semua' },
  { value: 'bpe_spt', label: 'BPE SPT' },
  { value: 'bukti_potong', label: 'Bukti Potong' },
  { value: 'kode_billing', label: 'Kode Billing' }
]

const jenisLabel: Record<DokumenSayaJenis, string> = {
  bpe_spt: 'BPE SPT',
  bukti_potong: 'Bukti Potong',
  kode_billing: 'Kode Billing'
}

const yearFilterOptions = [
  { label: 'Semua Tahun', value: undefined as number | undefined },
  ...Array.from({ length: 5 }, (_, index) => {
    const year = new Date().getFullYear() - index
    return { label: String(year), value: year as number | undefined }
  })
]

const columns: TableColumn<DokumenSayaRow>[] = [
  { accessorKey: 'jenis', header: 'Jenis' },
  { accessorKey: 'nomor', header: 'Nomor' },
  { accessorKey: 'tanggal', header: 'Tanggal' },
  { accessorKey: 'masa', header: 'Masa' },
  { accessorKey: 'uraian', header: 'Uraian' },
  { id: 'actions' }
]

function fileName(row: DokumenSayaRow) {
  const safe = row.nomor.replace(/[^A-Za-z0-9-]+/g, '-')
  return row.jenis === 'bpe_spt' ? `BPE-${safe}.pdf`
    : row.jenis === 'kode_billing' ? `BILLING_${safe}.pdf`
      : `BPE-SIM-${safe}.pdf`
}

async function download(row: DokumenSayaRow) {
  try {
    const blob = await apiFetch<Blob>(row.download_path, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName(row)
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh dokumen', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>Portal Saya</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Dokumen Saya</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">Dokumen Saya</div>
        <nav class="bupot-side__tabs" aria-label="Jenis dokumen">
          <button
            v-for="tab in jenisTabs"
            :key="tab.label"
            type="button"
            :class="{ active: activeJenis === tab.value }"
            @click="activeJenis = tab.value"
          >
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header"><h1>Dokumen Saya</h1></div>

        <p class="text-sm text-muted mb-3">
          Bukti penerimaan SPT (BPE), bukti potong terbit, dan kode billing milik sendiri. Unduh PDF per baris.
        </p>

        <div class="faktur-table__filters">
          <USelect v-model="filterYear" :items="yearFilterOptions" placeholder="Semua Tahun" size="xs" class="min-w-36" />
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refreshList()" />
        </div>

        <div class="faktur-table table-sticky-actions" tabindex="0" role="region" aria-label="Tabel dokumen, geser ke kanan untuk melihat semua kolom">
          <UTable :data="dokumen?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #jenis-cell="{ row }">{{ jenisLabel[row.original.jenis] }}</template>
            <template #tanggal-cell="{ row }">
              <span v-if="row.original.tanggal">{{ new Date(row.original.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}</span>
              <span v-else>—</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton icon="i-lucide-file-down" size="xs" variant="soft" label="Unduh" @click="download(row.original)" />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada dokumen.</p></template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ dokumen?.total ?? 0 }} data</p>
        </div>
      </section>
    </div>
  </div>
</template>
