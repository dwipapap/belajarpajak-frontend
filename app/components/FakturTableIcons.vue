<script setup lang="ts">
// Table icons of the Pajak Keluaran / Masukan lists: Refresh, three exports and
// Setel Ulang Filter. Refresh, CSV and reset work; Excel and PDF are disabled.
const props = defineProps<{
  loading?: boolean
  apiBase: string
  filename: string
  taxMonth?: number
  taxYear?: number
}>()

defineEmits<{ refresh: [], reset: [] }>()

const { downloadCsv } = useFakturExport(
  props.apiBase,
  () => ({ month: props.taxMonth, year: props.taxYear }),
  props.filename
)
</script>

<template>
  <div class="bupot-toolbar">
    <UTooltip text="Refresh">
      <UButton
        icon="i-lucide-refresh-cw"
        color="info"
        variant="soft"
        aria-label="Refresh"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </UTooltip>
    <UTooltip text="Ekspor ke CSV">
      <UButton
        icon="i-lucide-file"
        color="neutral"
        variant="solid"
        aria-label="Ekspor ke CSV"
        @click="downloadCsv()"
      />
    </UTooltip>
    <UTooltip text="Ekspor ke Excel (belum tersedia di simulator)">
      <span>
        <UButton
          icon="i-lucide-file-spreadsheet"
          color="success"
          variant="solid"
          aria-label="Ekspor ke Excel"
          disabled
        />
      </span>
    </UTooltip>
    <UTooltip text="Ekspor ke PDF (belum tersedia di simulator)">
      <span>
        <UButton
          icon="i-lucide-file-text"
          color="error"
          variant="solid"
          aria-label="Ekspor ke PDF"
          disabled
        />
      </span>
    </UTooltip>
    <UTooltip text="Setel Ulang Filter">
      <UButton
        icon="i-lucide-filter-x"
        color="neutral"
        variant="soft"
        aria-label="Setel Ulang Filter"
        @click="$emit('reset')"
      />
    </UTooltip>
  </div>
</template>
