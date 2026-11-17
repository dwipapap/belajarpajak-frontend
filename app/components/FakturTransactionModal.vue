<script setup lang="ts">
import type { TaxInvoiceLineCreate, TaxInvoiceLineType } from '~/types/api'
import type { ItemCodeOption } from '~/utils/faktur'

const props = defineProps<{
  /** Existing row when editing; null adds a new one. */
  line?: TaxInvoiceLineCreate | null
  /** Faktur-level kode transaksi — 04/05 force DPP Nilai Lain on every line. */
  transactionCode?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ save: [TaxInvoiceLineCreate] }>()

/** The form always picks a kode from the list, so it is never null in here. */
type LineFormState = Omit<TaxInvoiceLineCreate, 'item_code'> & { item_code: string }

function emptyLine(): LineFormState {
  return {
    line_type: 'barang',
    item_code: GENERAL_ITEM_CODE,
    item_name: '',
    unit: 'Unit',
    unit_price: 0,
    quantity: 1,
    discount: 0,
    use_dpp_other: false,
    ppn_rate_percent: 12,
    ppnbm_rate_percent: 0
  }
}

const formState = reactive<LineFormState>(emptyLine())

/** DPP Nilai Lain is not a choice for kode transaksi 04/05 — the backend forces it. */
const dppOtherLocked = computed(() => DPP_OTHER_CODES.includes(props.transactionCode ?? ''))

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(
    formState,
    props.line ? { ...props.line, item_code: props.line.item_code ?? GENERAL_ITEM_CODE } : emptyLine()
  )
  if (dppOtherLocked.value) formState.use_dpp_other = true
})

watch(dppOtherLocked, (locked) => {
  if (locked) formState.use_dpp_other = true
})

const calculated = computed(() => calculateLine(formState))

/** Searchable Kode Barang/Jasa, filtered by the chosen Tipe. */
const itemCodes = ref<Record<TaxInvoiceLineType, ItemCodeOption[]>>({ barang: [], jasa: [] })
onMounted(async () => {
  itemCodes.value = await loadItemCodeOptions()
})
const codeItems = computed(() => itemCodes.value[formState.line_type])

// Switching Tipe invalidates a code picked from the other list; fall back to 000000.
watch(() => formState.line_type, () => {
  if (!codeItems.value.some(item => item.value === formState.item_code)) {
    formState.item_code = GENERAL_ITEM_CODE
  }
})

function downloadCodes() {
  const rows = [['Tipe', 'Kode', 'Nama']]
  for (const type of ['barang', 'jasa'] as const) {
    for (const item of itemCodes.value[type]) {
      rows.push([lineTypeLabel[type], item.value, item.label.slice(item.value.length + 3)])
    }
  }
  const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'kode_barang_jasa.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function onSubmit() {
  emit('save', { ...formState })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.line ? 'Ubah Transaksi' : 'Tambah Transaksi'"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <UForm
        id="faktur-line-form"
        :state="formState"
        :validate="validateFakturLine"
        class="grid gap-4"
        @submit="onSubmit"
      >
        <section class="grid gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <UFormField name="line_type" label="Tipe Transaksi">
              <URadioGroup
                v-model="formState.line_type"
                :items="lineTypeOptions"
                orientation="horizontal"
              />
            </UFormField>
            <UButton
              icon="i-lucide-download"
              label="Unduh Kode"
              color="neutral"
              variant="soft"
              size="xs"
              @click="downloadCodes"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField name="item_code" label="Kode">
              <USelectMenu
                v-model="formState.item_code"
                :items="codeItems"
                value-key="value"
                placeholder="Pilih kode"
                search-input-placeholder="Cari kode atau nama..."
                class="w-full"
              />
            </UFormField>

            <UFormField name="item_name" label="Nama" required>
              <UInput v-model="formState.item_name" class="w-full" />
            </UFormField>

            <UFormField name="unit" label="Satuan" required>
              <USelectMenu v-model="formState.unit" :items="unitOptions" placeholder="Pilih satuan" class="w-full" />
            </UFormField>
          </div>
        </section>

        <USeparator />

        <section class="grid gap-3 sm:grid-cols-4">
          <UFormField name="unit_price" label="Harga Satuan" required>
            <UInput v-model.number="formState.unit_price" type="number" min="0" class="w-full" />
          </UFormField>

          <UFormField name="quantity" label="Kuantitas" required>
            <UInput
              v-model.number="formState.quantity"
              type="number"
              min="0"
              step="0.001"
              class="w-full"
            />
          </UFormField>

          <UFormField name="total_price" label="Total Harga">
            <UInput :model-value="formatCurrency(calculated.total_price)" disabled class="w-full" />
          </UFormField>

          <UFormField name="discount" label="Diskon">
            <UInput v-model.number="formState.discount" type="number" min="0" class="w-full" />
          </UFormField>
        </section>

        <USeparator />

        <section class="grid gap-3 sm:grid-cols-3">
          <UFormField name="dpp" label="DPP">
            <UInput :model-value="formatCurrency(calculated.dpp)" disabled class="w-full" />
          </UFormField>

          <UFormField
            name="dpp_other"
            label="DPP Nilai Lain"
            :description="dppOtherLocked ? 'Wajib untuk kode transaksi 04 dan 05' : 'Centang untuk memakai dasar 11/12 dari DPP'"
          >
            <div class="flex items-center gap-2">
              <UCheckbox v-model="formState.use_dpp_other" :disabled="dppOtherLocked" />
              <UInput
                :model-value="formatCurrency(calculated.dpp_other)"
                disabled
                class="w-full"
              />
            </div>
          </UFormField>

          <UFormField name="ppn_rate_percent" label="Tarif PPN">
            <USelect
              v-model="formState.ppn_rate_percent"
              :items="ppnRateOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField name="ppn" label="PPN">
            <UInput :model-value="formatCurrency(calculated.ppn)" disabled class="w-full" />
          </UFormField>

          <UFormField name="ppnbm_rate_percent" label="Tarif PPnBM (%)">
            <UInput
              v-model.number="formState.ppnbm_rate_percent"
              type="number"
              min="0"
              max="100"
              class="w-full"
            />
          </UFormField>

          <UFormField name="ppnbm" label="PPnBM">
            <UInput :model-value="formatCurrency(calculated.ppnbm)" disabled class="w-full" />
          </UFormField>
        </section>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="ghost" @click="open = false;" />
        <UButton type="submit" form="faktur-line-form" label="Simpan" class="bupot-primary-button" />
      </div>
    </template>
  </UModal>
</template>
