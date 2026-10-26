<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { A1A2ListResponse, A1A2Summary } from '~/types/api'

const props = defineProps<{
  form: 'A1' | 'A2'
  detailBase: string
  dataKey: string
}>()

const { apiFetch } = useApi()

const taxYear = ref<number>(new Date().getFullYear())

const { data: aggregate, status: listStatus, refresh: refreshList } = useAsyncData(
  props.dataKey,
  () => {
    const query = new URLSearchParams({ tax_year: String(taxYear.value) })
    return apiFetch<A1A2ListResponse>(`/api/v1/${props.form.toLowerCase()}?${query.toString()}`)
  },
  {
    default: () => ({ items: [], total: 0 }) as A1A2ListResponse,
    watch: [taxYear]
  }
)

const title = computed(() =>
  props.form === 'A1'
    ? 'BP A1 - Bukti Pemotongan A1 Masa Pajak Terakhir'
    : 'BP A2 - Bukti Pemotongan A2 Masa Pajak Terakhir'
)

const columns: TableColumn<A1A2Summary>[] = [
  { accessorKey: 'recipient_identity_number', header: 'Nomor Identitas WP' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'tax_year', header: 'Tahun' },
  { accessorKey: 'slips_count', header: 'Bulan Dilaporkan' },
  { accessorKey: 'annual_gross', header: 'Bruto Setahun (Rp)' },
  { accessorKey: 'annual_tax', header: 'PPh Setahun (Rp)' },
  { accessorKey: 'ter_category', header: 'Kategori TER' },
  { id: 'actions' }
]

function detailLink(identity: string) {
  return `${props.detailBase}/${identity}?tax_year=${taxYear.value}`
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <slot name="home-link" />
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>{{ title }}</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__title">{{ title }}</div>
        <p class="px-4 py-2 text-sm text-muted">
          Agregat tahunan read-only dari bukti potong bulanan (BPMP) yang telah terbit.
          {{ form === 'A1' ? 'Pegawai tetap pemotong non-negara.' : 'PNS/TNI/POLRI melalui APBN/APBD.' }}
        </p>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>{{ title }}</h1>
        </div>

        <div class="bupot-toolbar">
          <UInput v-model="taxYear" type="number" placeholder="Tahun Pajak" class="w-32" />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="listStatus === 'pending'"
            @click="() => refreshList()"
          />
        </div>

        <div class="bupot-table">
          <UTable :data="aggregate?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #annual_gross-cell="{ row }">Rp {{ formatCurrency(row.original.annual_gross) }}</template>
            <template #annual_tax-cell="{ row }">Rp {{ formatCurrency(row.original.annual_tax) }}</template>
            <template #ter_category-cell="{ row }">{{ row.original.ter_category ?? '-' }}</template>
            <template #actions-cell="{ row }">
              <UButton :to="detailLink(row.original.recipient_identity_number)" icon="i-lucide-eye" size="xs" label="Rincian" />
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</p></template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ aggregate?.total ?? 0 }} data</p>
        </div>
      </section>
    </div>
  </div>
</template>
