<script setup lang="ts">
import type {
  TaxInputListResponse,
  TaxInputRead,
  TaxInvoiceLineType,
  TaxReturListResponse,
  TaxReturRead
} from '~/types/api'

/**
 * Buat / Ubah Retur Pajak Masukan, after "Membuat Retur Pajak Masukan" in the
 * user manual: pick the faktur by Nomor Faktur (or from the Pajak Masukan row
 * action), fill Nomor Retur / Tanggal Retur and the returned quantity per
 * Detail Transaksi, then Simpan Konsep or Submit (signing modal).
 */
const props = defineProps<{
  /** Masukan faktur to return (create). */
  invoiceId?: number
  /** Existing retur (view / edit draft). */
  returId?: number
}>()

const { apiFetch } = useApi()
const toast = useToast()

const isEdit = computed(() => props.returId !== undefined)

interface ReturRow {
  input_line_id: number
  line_type: TaxInvoiceLineType
  item_name: string
  item_code?: string | null
  unit: string
  unit_price: number
  original_quantity: number
  original_discount: number
  max_quantity: number
  use_dpp_other: boolean
  ppn_rate_percent: number
  ppnbm_rate_percent: number
  return_quantity: number
  return_discount: number
}

const invoice = ref<TaxInputRead | null>(null)
const retur = ref<TaxReturRead | null>(null)
const rows = ref<ReturRow[]>([])

const formState = reactive({
  invoice_number_query: '',
  return_number: '',
  return_date: new Date().toISOString().slice(0, 10),
  is_creditable: true
})

const saving = ref(false)
const searching = ref(false)
const submitIntent = ref<'draft' | 'issue'>('draft')
const submitError = ref<string | null>(null)
const signOpen = ref(false)
const signing = ref(false)
const pendingIssueId = ref<number | null>(null)

const readonly = computed(() => retur.value !== null && retur.value.status !== 'draft')
const invoiceDate = computed(() => invoice.value?.invoice_date ?? retur.value?.invoice_date ?? '')

const period = computed(() => {
  const [year, month] = formState.return_date.split('-')
  return month && year ? `${monthLabels[Number(month)]} ${year}` : ''
})

async function loadInvoice(id: number) {
  const found = await apiFetch<TaxInputRead>(`/api/v1/faktur-masukan/${id}`)
  invoice.value = found
  formState.invoice_number_query = formatInvoiceNumber(found.invoice_number) === '-' ? '' : formatInvoiceNumber(found.invoice_number)
  formState.is_creditable = found.credit_status === 'credited'
  if (formState.return_date < found.invoice_date) formState.return_date = found.invoice_date

  // Quantities already covered by issued returns of this faktur.
  const issued = await apiFetch<TaxReturListResponse>(
    `/api/v1/retur-pajak-masukan?input_invoice_id=${id}&status_faktur=APPROVED&size=100`
  )
  const returned = new Map<number, number>()
  for (const item of issued.items) {
    for (const line of item.lines) {
      returned.set(line.input_line_id, (returned.get(line.input_line_id) ?? 0) + line.return_quantity)
    }
  }
  rows.value = found.lines.map(line => ({
    input_line_id: line.id,
    line_type: line.line_type,
    item_name: line.item_name,
    item_code: line.item_code,
    unit: line.unit,
    unit_price: line.unit_price,
    original_quantity: line.quantity,
    original_discount: line.discount,
    max_quantity: Math.max(Math.round((line.quantity - (returned.get(line.id) ?? 0)) * 1000) / 1000, 0),
    use_dpp_other: line.use_dpp_other,
    ppn_rate_percent: line.ppn_rate_percent,
    ppnbm_rate_percent: line.ppnbm_rate_percent,
    return_quantity: 0,
    return_discount: 0
  }))
}

/** Cari: look the faktur up by its Nomor Faktur Pajak among eligible masukan fakturs. */
async function searchInvoice() {
  const query = formState.invoice_number_query.replace(/[^0-9]/g, '')
  if (!query) return
  searching.value = true
  submitError.value = null
  try {
    const result = await apiFetch<TaxInputListResponse>(
      `/api/v1/faktur-masukan?invoice_number=${query}&status_faktur=APPROVED&status_faktur=CREDITED&status_faktur=UNCREDITED&size=5`
    )
    const found = result.items[0]
    if (!found) {
      invoice.value = null
      rows.value = []
      submitError.value = 'Faktur pajak masukan dengan nomor tersebut tidak ditemukan atau belum dapat diretur.'
      return
    }
    await loadInvoice(found.id)
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal mencari faktur.')
  } finally {
    searching.value = false
  }
}

if (props.returId !== undefined) {
  const { data } = await useAsyncData(
    `siswa-retur-masukan-${props.returId}`,
    () => apiFetch<TaxReturRead>(`/api/v1/retur-pajak-masukan/${props.returId}`)
  )
  if (data.value) {
    retur.value = data.value
    formState.return_number = data.value.return_number
    formState.return_date = data.value.return_date
    formState.is_creditable = data.value.is_creditable
    formState.invoice_number_query = formatInvoiceNumber(data.value.invoice_number) === '-' ? '' : formatInvoiceNumber(data.value.invoice_number)
    rows.value = data.value.lines.map(line => ({
      input_line_id: line.input_line_id,
      line_type: line.line_type,
      item_name: line.item_name,
      item_code: line.item_code,
      unit: line.unit,
      unit_price: line.unit_price,
      original_quantity: line.original_quantity,
      original_discount: line.original_discount,
      max_quantity: line.max_return_quantity,
      use_dpp_other: line.use_dpp_other,
      ppn_rate_percent: line.ppn_rate_percent,
      ppnbm_rate_percent: line.ppnbm_rate_percent,
      return_quantity: line.return_quantity,
      return_discount: line.return_discount
    }))
  }
} else if (props.invoiceId !== undefined) {
  try {
    await loadInvoice(props.invoiceId)
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal memuat faktur pajak masukan.')
  }
}

const calculated = computed(() =>
  rows.value.map(row =>
    calculateLine({
      unit_price: row.unit_price,
      quantity: row.return_quantity,
      discount: row.return_discount,
      use_dpp_other: row.use_dpp_other,
      ppn_rate_percent: row.ppn_rate_percent,
      ppnbm_rate_percent: row.ppnbm_rate_percent
    })
  )
)
const totals = computed(() =>
  calculated.value.reduce(
    (acc, item) => ({
      total_price: acc.total_price + item.total_price,
      dpp: acc.dpp + item.dpp,
      dpp_other: acc.dpp_other + item.dpp_other,
      ppn: acc.ppn + item.ppn,
      ppnbm: acc.ppnbm + item.ppnbm
    }),
    { total_price: 0, dpp: 0, dpp_other: 0, ppn: 0, ppnbm: 0 }
  )
)
const totalReturnDiscount = computed(() => rows.value.reduce((sum, row) => sum + Number(row.return_discount || 0), 0))
const showDppOther = computed(() => totals.value.dpp_other > 0)
const showPpnbm = computed(() => rows.value.some(row => Number(row.ppnbm_rate_percent) > 0))

function validate() {
  const errors: { name: string, message: string }[] = []
  if (!invoice.value && !retur.value) {
    errors.push({ name: 'invoice_number_query', message: 'Pilih faktur pajak yang akan diretur' })
  }
  if (!formState.return_number.trim()) errors.push({ name: 'return_number', message: 'Nomor retur wajib diisi' })
  if (!formState.return_date) {
    errors.push({ name: 'return_date', message: 'Tanggal retur wajib diisi' })
  } else if (invoiceDate.value && formState.return_date < invoiceDate.value) {
    errors.push({ name: 'return_date', message: 'Tanggal retur tidak boleh lebih awal dari tanggal faktur pajak' })
  }
  if (!rows.value.some(row => Number(row.return_quantity) > 0)) {
    errors.push({ name: 'lines', message: 'Isi jumlah retur pada minimal satu detail transaksi' })
  }
  for (const row of rows.value) {
    if (Number(row.return_quantity) > row.max_quantity) {
      errors.push({ name: 'lines', message: `Jumlah retur "${row.item_name}" melebihi sisa ${formatQuantity(row.max_quantity)}` })
    }
    if (Number(row.return_discount) > row.original_discount) {
      errors.push({ name: 'lines', message: `Diskon retur "${row.item_name}" melebihi diskon faktur` })
    }
  }
  return errors
}

function linesPayload() {
  return rows.value.map(row => ({
    input_line_id: row.input_line_id,
    return_quantity: Number(row.return_quantity || 0),
    return_discount: Number(row.return_discount || 0)
  }))
}

async function onSubmit() {
  saving.value = true
  submitError.value = null
  try {
    const saved = retur.value
      ? await apiFetch<TaxReturRead>(`/api/v1/retur-pajak-masukan/${retur.value.id}`, {
          method: 'PATCH',
          body: {
            return_number: formState.return_number,
            return_date: formState.return_date,
            is_creditable: formState.is_creditable,
            lines: linesPayload()
          }
        })
      : await apiFetch<TaxReturRead>('/api/v1/retur-pajak-masukan', {
          method: 'POST',
          body: {
            input_invoice_id: invoice.value!.id,
            return_number: formState.return_number,
            return_date: formState.return_date,
            is_creditable: formState.is_creditable,
            lines: linesPayload()
          }
        })
    if (submitIntent.value === 'issue') {
      pendingIssueId.value = saved.id
      signOpen.value = true
      return
    }
    toast.add({
      title: 'Retur Pajak Masukan tersimpan sebagai konsep',
      description: 'Dokumen masuk ke status CREATED.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/siswa/e-faktur/retur-masukan')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan retur.')
  } finally {
    saving.value = false
  }
}

async function confirmSign(payload: { signer_name?: string, kode_otorisasi: string }) {
  if (pendingIssueId.value === null) return
  signing.value = true
  submitError.value = null
  try {
    await apiFetch<TaxReturRead>(`/api/v1/retur-pajak-masukan/${pendingIssueId.value}/issue`, {
      method: 'POST',
      body: { signer_name: payload.signer_name, kode_otorisasi: payload.kode_otorisasi }
    })
    toast.add({
      title: 'Retur Pajak Masukan dikirim',
      description: 'Retur terlihat oleh penjual di Retur Pajak Keluaran.',
      color: 'success',
      icon: 'i-lucide-send'
    })
    signOpen.value = false
    pendingIssueId.value = null
    await navigateTo('/siswa/e-faktur/retur-masukan')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal mengirim retur.')
  } finally {
    signing.value = false
  }
}

const openSections = reactive({ document: true, detail: true })
const invoiceInfo = computed(() => invoice.value ?? retur.value)
</script>

<template>
  <div class="bupot-create">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur">e-Faktur</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur/retur-masukan">Retur Pajak Masukan</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>{{ readonly ? 'Lihat Retur' : isEdit ? 'Ubah Retur' : 'Buat Retur' }}</strong>
    </div>

    <UForm :state="formState" :validate="validate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ invoiceInfo?.seller_name ?? '' }}</p>
          <h1>{{ readonly ? 'Retur Pajak Masukan' : isEdit ? 'Ubah Retur Pajak Masukan' : 'Buat Retur Pajak Masukan' }}</h1>
        </div>
        <div class="bupot-form__actions">
          <UButton to="/siswa/e-faktur/retur-masukan" icon="i-lucide-arrow-left" color="neutral" variant="ghost">
            {{ readonly ? 'Kembali' : 'Batal' }}
          </UButton>
          <template v-if="!readonly">
            <UButton
              type="submit"
              icon="i-lucide-save"
              label="Simpan Konsep"
              color="neutral"
              :loading="saving && submitIntent === 'draft'"
              @click="submitIntent = 'draft';"
            />
            <UButton
              type="submit"
              icon="i-lucide-send"
              label="Submit"
              class="bupot-primary-button"
              :loading="saving && submitIntent === 'issue'"
              @click="submitIntent = 'issue';"
            />
          </template>
        </div>
      </div>

      <UAlert v-if="submitError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="submitError" />

      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.document = !openSections.document">
          <UIcon :name="openSections.document ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
          Dokumen Transaksi
        </button>
        <div v-if="openSections.document" class="bupot-grid">
          <UFormField name="invoice_number_query" label="Nomor Faktur Pajak" required>
            <div class="flex gap-2">
              <UInput
                v-model="formState.invoice_number_query"
                placeholder="Nomor Faktur Pajak"
                :disabled="isEdit || invoiceId !== undefined"
                class="w-full"
                @keyup.enter.prevent="searchInvoice"
              />
              <UButton
                v-if="!isEdit && invoiceId === undefined"
                label="Cari"
                icon="i-lucide-search"
                :loading="searching"
                @click="searchInvoice"
              />
            </div>
          </UFormField>

          <UFormField name="invoice_date" label="Tanggal Faktur Pajak">
            <UInput :model-value="invoiceDate ? formatInvoiceDate(invoiceDate) : ''" disabled class="w-full" />
          </UFormField>

          <UFormField name="seller_npwp" label="NPWP/TIN Penjual">
            <UInput :model-value="invoiceInfo?.seller_npwp ?? ''" disabled class="w-full" />
          </UFormField>

          <UFormField name="seller_name" label="Nama Penjual">
            <UInput :model-value="invoiceInfo?.seller_name ?? ''" disabled class="w-full" />
          </UFormField>

          <UFormField name="return_number" label="Nomor Retur" required>
            <UInput v-model="formState.return_number" placeholder="Nomor Retur" :disabled="readonly" class="w-full" />
          </UFormField>

          <UFormField name="return_date" label="Tanggal Retur" description="Tidak boleh lebih awal dari tanggal faktur pajak" required>
            <UInput v-model="formState.return_date" type="date" :min="invoiceDate || undefined" :disabled="readonly" class="w-full" />
          </UFormField>

          <UFormField name="period" label="Masa Pelaporan">
            <UInput :model-value="period" disabled class="w-full" />
          </UFormField>

          <UFormField name="is_creditable" label="Dapat Dikreditkan" required>
            <URadioGroup
              v-model="formState.is_creditable"
              :items="[{ label: 'Tidak', value: false }, { label: 'Ya', value: true }]"
              orientation="horizontal"
              :disabled="readonly"
            />
          </UFormField>
        </div>
      </section>

      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.detail = !openSections.detail">
          <UIcon :name="openSections.detail ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
          Detail Transaksi
        </button>
        <div v-if="openSections.detail">
          <div class="faktur-table">
            <table class="w-full">
              <thead>
                <tr>
                  <th class="p-2 text-left">Tipe</th>
                  <th class="p-2 text-left">Nama</th>
                  <th class="p-2 text-left">Kode</th>
                  <th class="p-2 text-right">Kuantitas</th>
                  <th class="p-2 text-left">Satuan</th>
                  <th class="p-2 text-right">Harga Satuan</th>
                  <th class="p-2 text-right">Diskon</th>
                  <th class="p-2 text-right">Tarif PPN</th>
                  <th class="p-2 text-right">Jumlah Retur</th>
                  <th class="p-2 text-right">Diskon Retur</th>
                  <th class="p-2 text-right">Total Harga Retur</th>
                  <th class="p-2 text-right">DPP Retur</th>
                  <th v-if="showDppOther" class="p-2 text-right">DPP Nilai Lain Retur</th>
                  <th class="p-2 text-right">PPN Retur</th>
                  <th v-if="showPpnbm" class="p-2 text-right">PPnBM Retur</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rows.length">
                  <td colspan="15" class="py-8 text-center text-sm text-muted">
                    Cari nomor faktur pajak untuk menampilkan detail transaksi.
                  </td>
                </tr>
                <tr v-for="(row, index) in rows" :key="row.input_line_id" class="border-t border-default">
                  <td class="p-2">{{ lineTypeLabel[row.line_type] }}</td>
                  <td class="p-2">{{ row.item_name }}</td>
                  <td class="p-2">{{ row.item_code }}</td>
                  <td class="p-2 text-right">{{ formatQuantity(row.original_quantity) }}</td>
                  <td class="p-2">{{ row.unit }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(row.unit_price) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(row.original_discount) }}</td>
                  <td class="p-2 text-right">{{ row.ppn_rate_percent }}%</td>
                  <td class="p-2 text-right">
                    <UInput
                      v-model.number="row.return_quantity"
                      type="number"
                      min="0"
                      :max="row.max_quantity"
                      step="0.001"
                      size="xs"
                      class="w-28"
                      :disabled="readonly"
                    />
                    <p class="text-xs text-muted">maks. {{ formatQuantity(row.max_quantity) }}</p>
                  </td>
                  <td class="p-2 text-right">
                    <UInput
                      v-model.number="row.return_discount"
                      type="number"
                      min="0"
                      :max="row.original_discount"
                      size="xs"
                      class="w-28"
                      :disabled="readonly || row.original_discount === 0"
                    />
                  </td>
                  <td class="p-2 text-right">{{ formatCurrency(calculated[index]?.total_price ?? 0) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(calculated[index]?.dpp ?? 0) }}</td>
                  <td v-if="showDppOther" class="p-2 text-right">{{ formatCurrency(calculated[index]?.dpp_other ?? 0) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(calculated[index]?.ppn ?? 0) }}</td>
                  <td v-if="showPpnbm" class="p-2 text-right">{{ formatCurrency(calculated[index]?.ppnbm ?? 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-default font-semibold">
                  <td class="p-2 text-right" colspan="9">Total Retur</td>
                  <td class="p-2 text-right">{{ formatCurrency(totalReturnDiscount) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(totals.total_price) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(totals.dpp) }}</td>
                  <td v-if="showDppOther" class="p-2 text-right">{{ formatCurrency(totals.dpp_other) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(totals.ppn) }}</td>
                  <td v-if="showPpnbm" class="p-2 text-right">{{ formatCurrency(totals.ppnbm) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </UForm>

    <DocumentSignModal v-model:open="signOpen" :loading="signing" @confirm="confirmSign" />
  </div>
</template>
