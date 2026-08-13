<script setup lang="ts">
import type { TaxInvoiceLineCreate } from '~/types/api'

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
    item_code: '000000',
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
    props.line ? { ...props.line, item_code: props.line.item_code ?? '000000' } : emptyLine()
  )
  if (dppOtherLocked.value) formState.use_dpp_other = true
})

watch(dppOtherLocked, (locked) => {
  if (locked) formState.use_dpp_other = true
})

const calculated = computed(() => calculateLine(formState))

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
              disabled
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField name="item_code" label="Kode">
              <USelect v-model="formState.item_code" :items="itemCodeOptions" class="w-full" />
            </UFormField>

            <UFormField name="item_name" label="Nama" required>
              <UInput v-model="formState.item_name" class="w-full" />
            </UFormField>

            <UFormField name="unit" label="Satuan" required>
              <USelect v-model="formState.unit" :items="unitOptions" class="w-full" />
            </UFormField>
          </div>
        </section>

        <USeparator />

        <section class="grid gap-3 sm:grid-cols-4">
          <UFormField name="unit_price" label="Harga Satuan" required>
            <UInput v-model.number="formState.unit_price" type="number" min="0" class="w-full" />
          </UFormField>

          <UFormField name="quantity" label="KUANTITAS" required>
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

          <UFormField name="discount" label="Potongan harga">
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
            label="DPP Nilai Lain/DPP"
            :description="dppOtherLocked ? 'Wajib untuk kode transaksi 04 dan 05' : undefined"
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
