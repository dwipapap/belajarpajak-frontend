<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { A1A2Detail, A1A2MonthlyRow } from '~/types/api'

const props = defineProps<{
  form: 'A1' | 'A2'
  identity: string
  taxYear: number
  dataKey: string
  backLink: string
}>()

const { apiFetch } = useApi()

const { data: detail } = useAsyncData(
  props.dataKey,
  () => apiFetch<A1A2Detail>(
    `/api/v1/${props.form.toLowerCase()}/${props.identity}?tax_year=${props.taxYear}`
  )
)

const title = computed(() => `Rincian ${props.form} — ${props.identity}`)

const columns: TableColumn<A1A2MonthlyRow>[] = [
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'gross_income', header: 'Bruto (Rp)' },
  { accessorKey: 'income_tax', header: 'PPh (Rp)' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <slot name="home-link" />
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink :to="backLink">BP {{ form }}</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>{{ title }}</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>{{ title }}</h1>
          <UButton :to="backLink" icon="i-lucide-arrow-left" label="Kembali" color="neutral" variant="soft" />
        </div>

        <div v-if="detail" class="bupot-section">
          <div class="bupot-grid">
            <p><strong>Nama:</strong> {{ detail.recipient_name }}</p>
            <p><strong>Tahun:</strong> {{ detail.tax_year }}</p>
            <p><strong>Bruto setahun:</strong> Rp {{ formatCurrency(detail.annual_gross) }}</p>
            <p><strong>PPh setahun:</strong> Rp {{ formatCurrency(detail.annual_tax) }}</p>
            <p><strong>Kategori TER:</strong> {{ detail.ter_category ?? '-' }}</p>
          </div>
        </div>

        <div class="bupot-table">
          <UTable :data="detail?.rows ?? []" :columns="columns">
            <template #tax_month-cell="{ row }">{{ monthLabels[row.original.tax_month] }}</template>
            <template #gross_income-cell="{ row }">Rp {{ formatCurrency(row.original.gross_income) }}</template>
            <template #income_tax-cell="{ row }">Rp {{ formatCurrency(row.original.income_tax) }}</template>
            <template #withholding_number-cell="{ row }">{{ row.original.withholding_number || '-' }}</template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</p></template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
