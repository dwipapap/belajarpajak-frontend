<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

// Monitoring / Bulk Process menus of the Pajak Keluaran & Masukan lists.
// Only "Download CSV by Period" has a backend; the rest are shown disabled.
const props = defineProps<{
  apiBase: string
  filename: string
  taxMonth?: number
  taxYear?: number
}>()

const { downloadCsv } = useFakturExport(
  props.apiBase,
  () => ({ month: props.taxMonth, year: props.taxYear }),
  props.filename
)

const monitoringItems: DropdownMenuItem[] = [
  { label: 'XML', icon: 'i-lucide-file-code', disabled: true }
]

const bulkItems = computed<DropdownMenuItem[]>(() => [
  { label: 'Submit by Period', icon: 'i-lucide-send', disabled: true },
  { label: 'Download CSV by Period', icon: 'i-lucide-file-spreadsheet', onSelect: () => downloadCsv() },
  { label: 'Download PDF by Period', icon: 'i-lucide-file-text', disabled: true }
])
</script>

<template>
  <UDropdownMenu :items="monitoringItems">
    <UButton
      icon="i-lucide-info"
      trailing-icon="i-lucide-chevron-down"
      label="Monitoring"
      class="bupot-primary-button"
    />
  </UDropdownMenu>
  <UDropdownMenu :items="bulkItems">
    <UButton
      icon="i-lucide-layers"
      trailing-icon="i-lucide-chevron-down"
      label="Bulk Process"
      class="bupot-primary-button"
    />
  </UDropdownMenu>
</template>
