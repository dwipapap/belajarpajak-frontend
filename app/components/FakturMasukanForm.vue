<script setup lang="ts">
import type { SchoolClass, TaxInputLineCreate, TaxInputRead } from '~/types/api'

const props = defineProps<{ invoiceId?: number }>()
const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()
const route = useRoute()

const isEdit = computed(() => props.invoiceId !== undefined)

const { data: classes } = useAsyncData('siswa-faktur-masukan-form-classes', () => apiFetch<SchoolClass[]>('/api/v1/classes'), { default: () => [] as SchoolClass[] })
const classOptions = computed(() => classes.value.map(item => ({ label: `${item.name} (${item.academic_year})`, value: item.id })))

const today = new Date().toISOString().slice(0, 10)

const formState = reactive({
  class_id: undefined as number | undefined,
  is_advance_payment: false,
  is_settlement: false,
  invoice_number: '' as string,
  transaction_code: '01',
  invoice_date: today,
  invoice_kind: 'normal' as TaxInputRead['invoice_kind'],
  tax_month: new Date().getMonth() + 1,
  tax_year: new Date().getFullYear(),
  reference: '',
  seller_npwp: '',
  seller_name: '',
  seller_address: '',
  seller_idtku: '000000',
  buyer_identity_type: 'npwp' as TaxInputRead['buyer_identity_type'],
  buyer_identity_number: '',
  buyer_country: 'ID',
  buyer_document_number: '',
  buyer_name: auth.user.value?.full_name || '',
  buyer_address: '',
  buyer_idtku: '000000',
  buyer_email: ''
})

const lines = ref<TaxInputLineCreate[]>([])
const selectedLines = ref(new Set<number>())
const saving = ref(false)
const submitIntent = ref<'draft'>('draft')
const submitError = ref<string | null>(null)
const openSections = reactive({ document: true, seller: true, buyer: true, detail: true })
const modalOpen = ref(false)
const editingIndex = ref<number | null>(null)
const editingLine = computed(() => editingIndex.value === null ? null : lines.value[editingIndex.value] ?? null)

watch(() => formState.invoice_date, (value) => {
  if (!value) return
  const [year, month] = value.split('-')
  if (year) formState.tax_year = Number(year)
  if (month) formState.tax_month = Number(month)
})

const needsDocumentNumber = computed(() => DOCUMENT_NUMBER_IDENTITIES.includes(formState.buyer_identity_type))
const dppOtherForced = computed(() => DPP_OTHER_CODES.includes(formState.transaction_code))
const calculatedLines = computed(() => lines.value.map(line => calculateLine({ ...line, use_dpp_other: dppOtherForced.value ? true : line.use_dpp_other })))
const totals = computed(() => calculatedLines.value.reduce((acc, item) => ({ total_price: acc.total_price + item.total_price, dpp: acc.dpp + item.dpp, dpp_other: acc.dpp_other + item.dpp_other, ppn: acc.ppn + item.ppn, ppnbm: acc.ppnbm + item.ppnbm }), { total_price: 0, dpp: 0, dpp_other: 0, ppn: 0, ppnbm: 0 }))
const totalDiscount = computed(() => lines.value.reduce((sum, line) => sum + Number(line.discount || 0), 0))

// Prefill from source if ?source= provided (prepopulated)
const sourceId = computed(() => {
  const q = route.query.source as string | undefined
  return q ? Number(q) : undefined
})

if (isEdit.value) {
  const { data: invoice } = await useAsyncData(`siswa-faktur-masukan-${props.invoiceId}`, () => apiFetch<TaxInputRead>(`/api/v1/faktur-masukan/${props.invoiceId}`))
  if (invoice.value) {
    Object.assign(formState, {
      class_id: invoice.value.class_id ?? undefined,
      is_advance_payment: invoice.value.is_advance_payment,
      is_settlement: invoice.value.is_settlement,
      invoice_number: invoice.value.invoice_number ?? '',
      transaction_code: invoice.value.transaction_code,
      invoice_date: invoice.value.invoice_date,
      invoice_kind: invoice.value.invoice_kind,
      tax_month: invoice.value.tax_month,
      tax_year: invoice.value.tax_year,
      reference: invoice.value.reference ?? '',
      seller_npwp: invoice.value.seller_npwp ?? '',
      seller_name: invoice.value.seller_name ?? '',
      seller_address: invoice.value.seller_address ?? '',
      seller_idtku: invoice.value.seller_idtku ?? '',
      buyer_identity_type: invoice.value.buyer_identity_type,
      buyer_identity_number: invoice.value.buyer_identity_number,
      buyer_country: invoice.value.buyer_country,
      buyer_document_number: invoice.value.buyer_document_number ?? '',
      buyer_name: invoice.value.buyer_name,
      buyer_address: invoice.value.buyer_address ?? '',
      buyer_idtku: invoice.value.buyer_idtku ?? '',
      buyer_email: invoice.value.buyer_email ?? ''
    })
    lines.value = invoice.value.lines.map(line => ({ line_type: line.line_type, item_code: line.item_code, item_name: line.item_name, unit: line.unit, unit_price: line.unit_price, quantity: line.quantity, discount: line.discount, use_dpp_other: line.use_dpp_other, ppn_rate_percent: line.ppn_rate_percent, ppnbm_rate_percent: line.ppnbm_rate_percent }))
  }
} else if (sourceId.value) {
  // Prepopulated from keluaran
  const { data: source } = await useAsyncData(`siswa-faktur-masukan-source-${sourceId.value}`, () => apiFetch<TaxInputRead>(`/api/v1/faktur-keluaran/${sourceId.value}`) as any)
  if (source.value) {
    // @ts-ignore - source is TaxInvoiceRead, reuse fields
    const s: any = source.value
    formState.transaction_code = s.transaction_code
    formState.invoice_date = s.invoice_date
    formState.tax_month = s.tax_month
    formState.tax_year = s.tax_year
    formState.seller_npwp = s.seller_npwp ?? ''
    formState.seller_name = s.seller_name ?? ''
    formState.seller_address = s.seller_address ?? ''
    formState.invoice_number = s.invoice_number ?? ''
    lines.value = (s.lines || []).map((line: any) => ({ line_type: line.line_type, item_code: line.item_code, item_name: line.item_name, unit: line.unit, unit_price: line.unit_price, quantity: line.quantity, discount: line.discount, use_dpp_other: line.use_dpp_other, ppn_rate_percent: line.ppn_rate_percent, ppnbm_rate_percent: line.ppnbm_rate_percent }))
  }
}

function openAddLine() { editingIndex.value = null; modalOpen.value = true }
function openEditLine(index: number) { editingIndex.value = index; modalOpen.value = true }
function saveLine(line: TaxInputLineCreate) {
  if (editingIndex.value === null) lines.value = [...lines.value, line]
  else lines.value = lines.value.map((item, i) => (i === editingIndex.value ? line : item))
  editingIndex.value = null; selectedLines.value = new Set()
}
function toggleLine(index: number) { const next = new Set(selectedLines.value); if (next.has(index)) next.delete(index); else next.add(index); selectedLines.value = next }
function removeSelectedLines() { lines.value = lines.value.filter((_, index) => !selectedLines.value.has(index)); selectedLines.value = new Set() }
function validate() { return validateFakturMasukanCreate({ ...formState, lines: lines.value }) }
function buildPayload() {
  return {
    class_id: formState.class_id ?? null,
    source_invoice_id: sourceId.value ?? null,
    is_advance_payment: formState.is_advance_payment,
    is_settlement: formState.is_settlement,
    transaction_code: formState.transaction_code,
    invoice_date: formState.invoice_date,
    invoice_kind: formState.invoice_kind,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    reference: formState.reference || null,
    seller_npwp: formState.seller_npwp || null,
    seller_name: formState.seller_name || null,
    seller_address: formState.seller_address || null,
    seller_idtku: formState.seller_idtku || null,
    buyer_identity_type: formState.buyer_identity_type,
    buyer_identity_number: formState.buyer_identity_number,
    buyer_country: formState.buyer_country,
    buyer_document_number: formState.buyer_document_number || null,
    buyer_name: formState.buyer_name,
    buyer_address: formState.buyer_address || null,
    buyer_idtku: formState.buyer_idtku || null,
    buyer_email: formState.buyer_email || null,
    lines: lines.value
  }
}
async function onSubmit() {
  saving.value = true; submitError.value = null
  try {
    if (isEdit.value) await apiFetch<TaxInputRead>(`/api/v1/faktur-masukan/${props.invoiceId}`, { method: 'PATCH', body: buildPayload() })
    else await apiFetch<TaxInputRead>('/api/v1/faktur-masukan', { method: 'POST', body: buildPayload() })
    toast.add({ title: isEdit.value ? 'Perubahan Faktur Masukan tersimpan' : 'Berhasil membuat Faktur Masukan', description: 'Dokumen masuk ke Belum Dikreditkan.', color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/siswa/e-faktur/masukan')
  } catch (error) { submitError.value = apiErrorMessage(error, 'Gagal menyimpan Faktur Masukan.') } finally { saving.value = false }
}
</script>

<template>
  <div class="bupot-create">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink><UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur">e-Faktur</NuxtLink><UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/e-faktur/masukan">Pajak Masukan</NuxtLink><UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Input Invoice Edit</strong>
    </div>

    <UForm :state="formState" :validate="validate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div><p>{{ formState.seller_npwp || '-' }}</p><h1>Input Invoice Edit</h1></div>
        <div class="bupot-form__actions">
          <UButton to="/siswa/e-faktur/masukan" icon="i-lucide-arrow-left" color="neutral" variant="ghost">Go to search</UButton>
          <UButton type="submit" icon="i-lucide-save" label="Simpan Konsep" color="neutral" :loading="saving" @click="submitIntent = 'draft';" />
        </div>
      </div>

      <UAlert v-if="submitError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="submitError" />

      <!-- Dokumen Transaksi -->
      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.document = !openSections.document"><UIcon :name="openSections.document ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />Dokumen Transaksi</button>
        <div v-if="openSections.document" class="bupot-grid">
          <UFormField name="is_advance_payment" label="Uang Muka"><UCheckbox v-model="formState.is_advance_payment" /></UFormField>
          <UFormField name="is_settlement" label="Pelunasan"><UCheckbox v-model="formState.is_settlement" /></UFormField>
          <UFormField name="invoice_number" label="Nomor Faktur"><UInput :model-value="formatInvoiceNumber(formState.invoice_number) === '-' ? '' : formatInvoiceNumber(formState.invoice_number)" placeholder="Nomor Faktur" disabled class="w-full" /></UFormField>
          <UFormField name="transaction_code" label="Kode Transaksi" required><USelect v-model="formState.transaction_code" :items="transactionCodeOptions" class="w-full" /></UFormField>
          <UFormField name="invoice_date" label="Tanggal Faktur" required><UInput v-model="formState.invoice_date" type="date" class="w-full" /></UFormField>
          <UFormField name="invoice_kind" label="Jenis Faktur" required><USelect v-model="formState.invoice_kind" :items="invoiceKindOptions" class="w-full" /></UFormField>
          <UFormField name="tax_month" label="Masa Pajak" required><USelect v-model="formState.tax_month" :items="monthOptions" class="w-full" /></UFormField>
          <UFormField name="tax_year" label="Tahun" required><UInput v-model.number="formState.tax_year" type="number" disabled class="w-full" /></UFormField>
          <UFormField name="reference" label="Referensi"><UInput v-model="formState.reference" placeholder="Keterangan" class="w-full" /></UFormField>
          <UFormField name="seller_idtku" label="IDTKU Penjual"><UInput v-model="formState.seller_idtku" class="w-full" /></UFormField>
          <UFormField name="class_id" label="Kelas"><USelect v-model="formState.class_id" :items="classOptions" placeholder="Please select" class="w-full" /></UFormField>
        </div>
      </section>

      <!-- Informasi Penjual -->
      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.seller = !openSections.seller"><UIcon :name="openSections.seller ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />Informasi Penjual</button>
        <div v-if="openSections.seller" class="bupot-grid">
          <UFormField name="seller_npwp" label="NPWP Penjual"><UInput v-model="formState.seller_npwp" class="w-full" /></UFormField>
          <UFormField name="seller_name" label="Nama Penjual" required><UInput v-model="formState.seller_name" class="w-full" /></UFormField>
          <UFormField name="seller_address" label="Alamat Penjual"><UInput v-model="formState.seller_address" class="w-full" /></UFormField>
        </div>
      </section>

      <!-- Informasi Pembeli -->
      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.buyer = !openSections.buyer"><UIcon :name="openSections.buyer ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />Informasi Pembeli</button>
        <div v-if="openSections.buyer" class="bupot-grid">
          <UFormField name="buyer_identity_number" label="Nomor Identitas WP" required><UInput v-model="formState.buyer_identity_number" class="w-full" /></UFormField>
          <UFormField name="buyer_identity_type" label="ID"><URadioGroup v-model="formState.buyer_identity_type" :items="buyerIdentityOptions" /></UFormField>
          <UFormField name="buyer_country" label="Negara"><USelect v-model="formState.buyer_country" :items="countryOptions" class="w-full" /></UFormField>
          <UFormField name="buyer_document_number" label="Nomor Dokumen" :description="needsDocumentNumber ? undefined : 'Untuk Paspor / Identitas Lain'"><UInput v-model="formState.buyer_document_number" :disabled="!needsDocumentNumber" class="w-full" /></UFormField>
          <UFormField name="buyer_name" label="Nama" required><UInput v-model="formState.buyer_name" class="w-full" /></UFormField>
          <UFormField name="buyer_address" label="Alamat" required><UInput v-model="formState.buyer_address" class="w-full" /></UFormField>
          <UFormField name="buyer_idtku" label="IDTKU" required><UInput v-model="formState.buyer_idtku" class="w-full" /></UFormField>
          <UFormField name="buyer_email" label="Email"><UInput v-model="formState.buyer_email" type="email" class="w-full" /></UFormField>
        </div>
      </section>

      <!-- Detail Transaksi -->
      <section class="faktur-section">
        <button type="button" class="faktur-section__trigger" @click="openSections.detail = !openSections.detail"><UIcon :name="openSections.detail ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />Detail Transaksi</button>
        <div v-if="openSections.detail">
          <div class="faktur-toolbar">
            <UButton icon="i-lucide-plus" label="Tambah Transaksi" class="bupot-primary-button" @click="openAddLine" />
            <UButton icon="i-lucide-trash-2" label="Hapus Transaksi" color="error" :disabled="selectedLines.size === 0" @click="removeSelectedLines" />
          </div>
          <div class="faktur-table">
            <table class="w-full">
              <thead><tr><th class="p-2" /><th class="p-2 text-left">Tipe</th><th class="p-2 text-left">Nama</th><th class="p-2 text-left">Kode</th><th class="p-2 text-right">KUANTITAS</th><th class="p-2 text-left">Satuan</th><th class="p-2 text-right">Harga Satuan</th><th class="p-2 text-right">Total Harga</th><th class="p-2 text-right">Potongan</th><th class="p-2 text-right">DPP</th><th class="p-2 text-right">DPP Nilai Lain</th><th class="p-2 text-right">Tarif PPN</th><th class="p-2 text-right">PPN</th><th class="p-2 text-right">Tarif PPnBM</th><th class="p-2 text-right">PPnBM</th><th class="p-2" /></tr></thead>
              <tbody>
                <tr v-if="!lines.length"><td colspan="16" class="py-8 text-center text-sm text-muted">Tidak ada data yang ditemukan.</td></tr>
                <tr v-for="(line, index) in lines" :key="index" class="border-t border-default">
                  <td class="p-2"><UCheckbox :model-value="selectedLines.has(index)" @update:model-value="toggleLine(index)" /></td>
                  <td class="p-2">{{ lineTypeLabel[line.line_type] }}</td><td class="p-2">{{ line.item_name }}</td><td class="p-2">{{ line.item_code }}</td>
                  <td class="p-2 text-right">{{ formatQuantity(line.quantity) }}</td><td class="p-2">{{ line.unit }}</td><td class="p-2 text-right">{{ formatCurrency(line.unit_price) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(calculatedLines[index]?.total_price ?? 0) }}</td><td class="p-2 text-right">{{ formatCurrency(line.discount) }}</td>
                  <td class="p-2 text-right">{{ formatCurrency(calculatedLines[index]?.dpp ?? 0) }}</td><td class="p-2 text-right">{{ formatCurrency(calculatedLines[index]?.dpp_other ?? 0) }}</td>
                  <td class="p-2 text-right">{{ line.ppn_rate_percent }}%</td><td class="p-2 text-right">{{ formatCurrency(calculatedLines[index]?.ppn ?? 0) }}</td>
                  <td class="p-2 text-right">{{ line.ppnbm_rate_percent }}%</td><td class="p-2 text-right">{{ formatCurrency(calculatedLines[index]?.ppnbm ?? 0) }}</td>
                  <td class="p-2 text-right"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEditLine(index)" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="faktur-total-row"><span>JUMLAH</span><div><span>Total Harga</span> <strong>{{ formatCurrency(totals.total_price) }}</strong></div><div><span>Potongan</span> <strong>{{ formatCurrency(totalDiscount) }}</strong></div><div><span>DPP</span> <strong>{{ formatCurrency(totals.dpp) }}</strong></div><div><span>DPP Nilai Lain</span> <strong>{{ formatCurrency(totals.dpp_other) }}</strong></div><div><span>PPN</span> <strong>{{ formatCurrency(totals.ppn) }}</strong></div><div><span>PPnBM</span> <strong>{{ formatCurrency(totals.ppnbm) }}</strong></div></div>
        </div>
      </section>
    </UForm>
    <FakturTransactionModal v-model:open="modalOpen" :line="editingLine" :transaction-code="formState.transaction_code" @save="saveLine" />
  </div>
</template>
