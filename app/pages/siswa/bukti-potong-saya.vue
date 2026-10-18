<script setup lang="ts">
import type { Bp21ListResponse, Bp21Read, Bp23ListResponse, Bp23Read, Bp26ListResponse, Bp26Read, BppuListResponse, BppuRead, BpnrListResponse, BpnrRead, SpListResponse, SpRead, CyListResponse, CyRead } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()

const filterYear = ref<number | undefined>(undefined)
const filterMonth = ref<number | undefined>(undefined)

function issuedQuery() {
  const q = new URLSearchParams({ status: 'issued', page: '1', size: '100' })
  if (filterMonth.value !== undefined) q.set('tax_month', String(filterMonth.value))
  if (filterYear.value) q.set('tax_year', String(filterYear.value))
  return q.toString()
}

const { data: bp21, refresh: refresh21 } = useAsyncData(
  'siswa-bukti-saya-bp21',
  () => apiFetch<Bp21ListResponse>(`/api/v1/bp21?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as Bp21ListResponse, watch: [filterMonth, filterYear] }
)
const { data: bp23, refresh: refresh23 } = useAsyncData(
  'siswa-bukti-saya-bp23',
  () => apiFetch<Bp23ListResponse>(`/api/v1/bp23?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as Bp23ListResponse, watch: [filterMonth, filterYear] }
)
const { data: bp26, refresh: refresh26 } = useAsyncData(
  'siswa-bukti-saya-bp26',
  () => apiFetch<Bp26ListResponse>(`/api/v1/bp26?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as Bp26ListResponse, watch: [filterMonth, filterYear] }
)
const { data: bppu, refresh: refreshBppu } = useAsyncData(
  'siswa-bukti-saya-bppu',
  () => apiFetch<BppuListResponse>(`/api/v1/bppu?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as BppuListResponse, watch: [filterMonth, filterYear] }
)
const { data: bpnr, refresh: refreshBpnr } = useAsyncData(
  'siswa-bukti-saya-bpnr',
  () => apiFetch<BpnrListResponse>(`/api/v1/bpnr?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as BpnrListResponse, watch: [filterMonth, filterYear] }
)
const { data: sp, refresh: refreshSp } = useAsyncData(
  'siswa-bukti-saya-sp',
  () => apiFetch<SpListResponse>(`/api/v1/sp?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as SpListResponse, watch: [filterMonth, filterYear] }
)
const { data: cy, refresh: refreshCy } = useAsyncData(
  'siswa-bukti-saya-cy',
  () => apiFetch<CyListResponse>(`/api/v1/cy?${issuedQuery()}`),
  { default: () => ({ items: [], total: 0, page: 1, size: 100 }) as CyListResponse, watch: [filterMonth, filterYear] }
)

type Row = { kind: 'BP21' | 'BP23' | 'BP26' | 'BPPU' | 'BPNR' | 'SP' | 'CY', id: number, period: string, number: string | null, name: string, tax: number, signer: string | null }

const rows = computed<Row[]>(() => [
  ...(bp21.value.items as Bp21Read[]).map(i => ({
    kind: 'BP21' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: (i as never as { signer_name: string | null }).signer_name || null
  })),
  ...(bp23.value.items as Bp23Read[]).map(i => ({
    kind: 'BP23' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: (i as never as { signer_name: string | null }).signer_name || null
  })),
  ...(bp26.value.items as Bp26Read[]).map(i => ({
    kind: 'BP26' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: i.signer_name || null
  })),
  ...(bppu.value.items as BppuRead[]).map(i => ({
    kind: 'BPPU' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: (i as never as { signer_name: string | null }).signer_name || null
  })),
  ...(bpnr.value.items as BpnrRead[]).map(i => ({
    kind: 'BPNR' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: i.signer_name || null
  })),
  ...(sp.value.items as SpRead[]).map(i => ({
    kind: 'SP' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: (i as never as { signer_name: string | null }).signer_name || null
  })),
  ...(cy.value.items as CyRead[]).map(i => ({
    kind: 'CY' as const, id: i.id, period: formatPeriod(i), number: i.withholding_number,
    name: i.recipient_name, tax: i.income_tax, signer: (i as never as { signer_name: string | null }).signer_name || null
  }))
])

async function download(kind: Row['kind'], id: number) {
  try {
    const path = `/api/v1/${kind.toLowerCase()}/${id}/pdf`
    const blob = await apiFetch<Blob>(path, { responseType: 'blob' } as never)
    window.open(URL.createObjectURL(blob), '_blank')
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh BPE', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function refreshAll() {
  await Promise.all([refresh21(), refresh23(), refresh26(), refreshBppu(), refreshBpnr(), refreshSp(), refreshCy()])
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Bukti Potong Saya</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main" style="width: 100%">
        <div class="bupot-main__header">
          <h1>BUKTI POTONG SAYA (SIMULASI)</h1>
          <div class="bupot-actions">
            <USelect v-model="filterMonth" :items="monthFilterOptions" class="w-40" />
            <UInput v-model="filterYear" type="number" placeholder="Tahun" class="w-32" />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
          </div>
        </div>

        <p class="text-sm text-muted mb-3">
          Agregat dokumen Telah Terbit milik sendiri (BP21/BP23/BP26/BPPU/BPNR/SP/CY). Unduh BPE-SIM PDF per baris.
        </p>

        <div class="bupot-table">
          <UTable :data="rows" :columns="[{ accessorKey: 'kind', header: 'Jenis' }, { accessorKey: 'period', header: 'Masa' }, { accessorKey: 'number', header: 'Nomor' }, { accessorKey: 'name', header: 'Nama' }, { accessorKey: 'tax', header: 'PPh (Rp)' }, { accessorKey: 'signer', header: 'Penandatangan' }, { id: 'actions' }]">
            <template #tax-cell="{ row }">Rp {{ formatCurrency(row.original.tax) }}</template>
            <template #actions-cell="{ row }">
              <UButton icon="i-lucide-file-down" label="BPE" size="xs" variant="soft" @click="download(row.original.kind, row.original.id)" />
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Belum ada bukti terbit.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
