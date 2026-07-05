<script setup lang="ts">
import type { Bp21Create, Bp21Read, Bp21TaxFacility, Bp21TaxNature, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const ptkpOptions = ['TK/0', 'TK/1', 'K/0', 'K/1', 'K/2', 'K/3']

const facilityOptions: { label: string, value: Bp21TaxFacility }[] = [
  { label: 'Tanpa Fasilitas', value: 'none' },
  { label: 'Ditanggung Pemerintah', value: 'dtp' },
  { label: 'Surat Keterangan Bebas', value: 'skb' },
  { label: 'Tarif 0%', value: 'rate_0' }
]

const taxObjectOptions: {
  label: string
  value: string
  incomeType: string
  taxNature: Bp21TaxNature
  ratePercent: number
  kapKjs: string
}[] = [
  {
    label: '21-100-09 - Honorarium tenaga ahli',
    value: '21-100-09',
    incomeType: 'Honorarium tenaga ahli',
    taxNature: 'non_final',
    ratePercent: 5,
    kapKjs: '411121-100'
  },
  {
    label: '21-401-01 - Imbalan pegawai tidak tetap',
    value: '21-401-01',
    incomeType: 'Imbalan pegawai tidak tetap',
    taxNature: 'non_final',
    ratePercent: 5,
    kapKjs: '411121-100'
  },
  {
    label: '21-499-99 - Penghasilan bukan pegawai lainnya',
    value: '21-499-99',
    incomeType: 'Penghasilan bukan pegawai lainnya',
    taxNature: 'non_final',
    ratePercent: 5,
    kapKjs: '411121-100'
  }
]

const documentTypeOptions = [
  'Invoice',
  'Kontrak',
  'Kuitansi',
  'Dokumen yang dipersamakan'
]

const { data: classes } = useAsyncData(
  'siswa-bp21-create-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const classOptions = computed(() =>
  classes.value.map(item => ({
    label: `${item.name} (${item.academic_year})`,
    value: item.id
  }))
)

const formState = reactive({
  class_id: undefined as number | undefined,
  tax_month: new Date().getMonth() + 1,
  tax_year: new Date().getFullYear(),
  status: 'NORMAL',
  withholder_npwp: '1471110802000001',
  withholder_name: auth.user.value?.tenant_name || 'Institusi Simulasi',
  withholder_nitku: '1471110802000001000001',
  recipient_identity_number: '',
  recipient_name: auth.user.value?.full_name || '',
  recipient_address: '',
  recipient_nitku: '',
  ptkp_status: 'TK/0',
  tax_facility: 'none' as Bp21TaxFacility,
  tax_object_code: '21-100-09',
  income_type: 'Honorarium tenaga ahli',
  tax_nature: 'non_final' as Bp21TaxNature,
  previous_gross_income: 0,
  gross_income: 0,
  dpp_percent: 100,
  rate_percent: 5,
  kap_kjs: '411121-100',
  document_type: 'Invoice',
  document_number: '',
  document_date: new Date().toISOString().slice(0, 10),
  document_nitku: ''
})

const saving = ref(false)
const submitIntent = ref<'draft' | 'issue'>('draft')
const submitError = ref<string | null>(null)

const selectedTaxObject = computed(() =>
  taxObjectOptions.find(item => item.value === formState.tax_object_code) ?? taxObjectOptions[0]!
)

watch(
  () => formState.tax_object_code,
  () => {
    const selected = selectedTaxObject.value
    formState.income_type = selected.incomeType
    formState.tax_nature = selected.taxNature
    formState.rate_percent = selected.ratePercent
    formState.kap_kjs = selected.kapKjs
  },
  { immediate: true }
)

const dppAmount = computed(() =>
  Math.round(Number(formState.gross_income || 0) * Number(formState.dpp_percent || 0) / 100)
)

const calculatedIncomeTax = computed(() => {
  if (formState.tax_facility === 'skb' || formState.tax_facility === 'rate_0') return 0
  return Math.round(dppAmount.value * Number(formState.rate_percent || 0) / 100)
})

function buildPayload(): Bp21Create {
  return {
    class_id: formState.class_id,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    withholder_npwp: formState.withholder_npwp || null,
    withholder_name: formState.withholder_name || null,
    withholder_nitku: formState.withholder_nitku || null,
    recipient_identity_number: formState.recipient_identity_number,
    recipient_name: formState.recipient_name,
    recipient_address: formState.recipient_address || null,
    recipient_nitku: formState.recipient_nitku || null,
    ptkp_status: formState.ptkp_status || null,
    tax_object_code: formState.tax_object_code,
    income_type: formState.income_type,
    tax_nature: formState.tax_nature,
    tax_facility: formState.tax_facility,
    previous_gross_income: Number(formState.previous_gross_income || 0),
    gross_income: Number(formState.gross_income),
    dpp_percent: Number(formState.dpp_percent),
    rate_percent: Number(formState.rate_percent),
    kap_kjs: formState.kap_kjs || null,
    document_type: formState.document_type || null,
    document_number: formState.document_number || null,
    document_date: formState.document_date || null,
    document_nitku: formState.document_nitku || null
  }
}

async function onSubmit() {
  saving.value = true
  submitError.value = null
  try {
    const created = await apiFetch<Bp21Read>('/api/v1/bp21', {
      method: 'POST',
      body: buildPayload()
    })

    if (submitIntent.value === 'issue') {
      await apiFetch<Bp21Read>(`/api/v1/bp21/${created.id}/issue`, { method: 'POST' })
      toast.add({
        title: 'BP21 diterbitkan',
        description: 'Dokumen masuk ke tab Telah Terbit.',
        color: 'success',
        icon: 'i-lucide-send'
      })
    } else {
      toast.add({
        title: 'Konsep BP21 disimpan',
        description: 'Dokumen masuk ke tab Belum Terbit.',
        color: 'success',
        icon: 'i-lucide-save'
      })
    }

    await navigateTo('/siswa/bp21')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan BP21.')
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="bupot-create">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/bp21">eBupot</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BP 21 - Bukti Pemotongan Selain Pegawai Tetap</strong>
    </div>

    <UForm :state="formState" :validate="validateBupotCreate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ auth.user.value?.tenant_id ?? '1471110802000001' }}</p>
          <h1>EBUPOT BP21</h1>
        </div>
        <div class="bupot-form__actions">
          <UButton to="/siswa/bp21" icon="i-lucide-arrow-left" color="neutral" variant="ghost">
            Go to search
          </UButton>
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
        </div>
      </div>

      <UAlert
        v-if="submitError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="submitError"
      />

      <section class="bupot-section">
        <header>
          <h2>Informasi Umum</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="class_id" label="Kelas" required>
            <USelect
              v-model="formState.class_id"
              :items="classOptions"
              placeholder="Please select"
              class="w-full"
            />
          </UFormField>

          <UFormField name="tax_month" label="Masa Pajak" required>
            <USelect
              v-model="formState.tax_month"
              :items="monthOptions"
              placeholder="Please select"
              class="w-full"
            />
          </UFormField>

          <UFormField name="tax_year" label="Tahun Pajak" required>
            <UInput v-model="formState.tax_year" type="number" class="w-full" />
          </UFormField>

          <UFormField name="status" label="Status" required>
            <UInput v-model="formState.status" disabled class="w-full" />
          </UFormField>

          <UFormField name="recipient_identity_number" label="Nomor Identitas WP" required>
            <UInput v-model="formState.recipient_identity_number" class="w-full" />
          </UFormField>

          <UFormField name="recipient_name" label="Nama" required>
            <UInput v-model="formState.recipient_name" class="w-full" />
          </UFormField>

          <UFormField name="recipient_nitku" label="NITKU / Nomor Identitas Subunit Organisasi">
            <UInput v-model="formState.recipient_nitku" class="w-full" />
          </UFormField>

          <UFormField name="recipient_address" label="Alamat">
            <UTextarea v-model="formState.recipient_address" autoresize class="w-full" />
          </UFormField>
        </div>
      </section>

      <section class="bupot-section">
        <header>
          <h2>Pajak Penghasilan (Rp)</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="ptkp_status" label="Status PTKP" required>
            <USelect v-model="formState.ptkp_status" :items="ptkpOptions" class="w-full" />
          </UFormField>

          <UFormField name="tax_facility" label="Fasilitas Pajak Penerima Penghasilan" required>
            <USelect v-model="formState.tax_facility" :items="facilityOptions" class="w-full" />
          </UFormField>

          <UFormField name="tax_object_code" label="Nama Objek Pajak" required>
            <USelect v-model="formState.tax_object_code" :items="taxObjectOptions" class="w-full" />
          </UFormField>

          <UFormField name="income_type" label="Jenis Pajak" required>
            <UInput v-model="formState.income_type" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_object_code_readonly" label="Kode Objek Pajak" required>
            <UInput v-model="formState.tax_object_code" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_nature" label="Sifat Pajak Penghasilan" required>
            <UInput
              :model-value="formState.tax_nature === 'final' ? 'Final' : 'Tidak Final'"
              disabled
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="bupot-note">
          Pendapatan Bruto yang Telah Dibayar Sebelumnya, khusus untuk kode objek tertentu jika
          terdapat pembayaran lebih dari sekali dalam periode dua tahun.
        </div>

        <div class="bupot-grid">
          <UFormField name="previous_gross_income" label="Jumlah">
            <UInput v-model="formState.previous_gross_income" type="number" disabled class="w-full" />
          </UFormField>

          <UFormField name="gross_income" label="Penghasilan Bruto (Rp)" required>
            <UInput v-model="formState.gross_income" type="number" class="w-full" />
          </UFormField>

          <UFormField name="dpp_percent" label="DPP (%)" required>
            <UInput v-model="formState.dpp_percent" type="number" class="w-full" />
          </UFormField>

          <UFormField name="rate_percent" label="Tarif (%)" required>
            <UInput v-model="formState.rate_percent" type="number" disabled class="w-full" />
          </UFormField>

          <UFormField name="income_tax" label="Pajak Penghasilan (Rp)" required>
            <UInput :model-value="formatCurrency(calculatedIncomeTax)" disabled class="w-full" />
          </UFormField>

          <UFormField name="kap_kjs" label="KAP-KJS" required>
            <UInput v-model="formState.kap_kjs" disabled class="w-full" />
          </UFormField>
        </div>
      </section>

      <section class="bupot-section">
        <header>
          <h2>Dokumen Referensi</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="document_type" label="Jenis Dokumen" required>
            <USelect v-model="formState.document_type" :items="documentTypeOptions" class="w-full" />
          </UFormField>

          <UFormField name="document_number" label="Nomor Dokumen" required>
            <UInput v-model="formState.document_number" class="w-full" />
          </UFormField>

          <UFormField name="document_date" label="Tanggal Dokumen" required>
            <UInput v-model="formState.document_date" type="date" class="w-full" />
          </UFormField>

          <UFormField name="document_nitku" label="NITKU / Nomor Identitas Sub Unit Organisasi">
            <UInput v-model="formState.document_nitku" class="w-full" />
          </UFormField>
        </div>
      </section>
    </UForm>
  </div>
</template>

