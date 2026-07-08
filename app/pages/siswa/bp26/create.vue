<script setup lang="ts">
import type { Bp26Create, Bp26Read, Bp26TaxNature, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const taxObjectOptions: {
  label: string
  value: string
  taxObjectName: string
  taxNature: Bp26TaxNature
  ratePercent: number
  kapKjs: string
}[] = [
  {
    label: '27-100-01 - Dividen yang diterima WPLN',
    value: '27-100-01',
    taxObjectName: 'Dividen yang diterima WPLN',
    taxNature: 'final',
    ratePercent: 20,
    kapKjs: '411127-100'
  },
  {
    label: '27-100-02 - Bunga yang diterima WPLN',
    value: '27-100-02',
    taxObjectName: 'Bunga yang diterima WPLN',
    taxNature: 'final',
    ratePercent: 20,
    kapKjs: '411127-101'
  },
  {
    label: '27-100-03 - Royalti yang diterima WPLN',
    value: '27-100-03',
    taxObjectName: 'Royalti yang diterima WPLN',
    taxNature: 'final',
    ratePercent: 20,
    kapKjs: '411127-102'
  },
  {
    label: '27-100-04 - Imbalan sehubungan dengan jasa, pekerjaan, dan kegiatan',
    value: '27-100-04',
    taxObjectName: 'Imbalan sehubungan dengan jasa, pekerjaan, dan kegiatan',
    taxNature: 'final',
    ratePercent: 20,
    kapKjs: '411127-104'
  },
  {
    label: '27-100-05 - Hadiah dan penghargaan yang diterima WPLN',
    value: '27-100-05',
    taxObjectName: 'Hadiah dan penghargaan yang diterima WPLN',
    taxNature: 'final',
    ratePercent: 20,
    kapKjs: '411127-100'
  }
]

const taxNatureOptions: { label: string, value: Bp26TaxNature }[] = [
  { label: 'Final', value: 'final' },
  { label: 'Tidak Final', value: 'non_final' }
]

// Options for the BP26 create form.
const documentTypeOptions = [
  'Akta Perjanjian',
  'Akta Rapat Umum Pemegang Saham',
  'Bukti Pembayaran',
  'Dokumen Ketentuan Peraturan Perpajakan',
  'Dokumen Lainnya',
  'Dokumen Pemberian Fasilitas Lainnya',
  'Faktur Pajak',
  'Jasa Giro',
  'Kontrak',
  'Pengumuman',
  'Surat Keputusan',
  'Surat Pernyataan',
  'Surat Tagihan',
  'Trade Confirmation'
]

const { data: classes } = useAsyncData(
  'siswa-bp26-create-classes',
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
  tax_facility_label: 'Tanpa Fasilitas',
  recipient_identity_number: '',
  recipient_name: auth.user.value?.full_name || '',
  tax_type: 'PPh 26',
  tax_object_code: '27-100-01',
  tax_object_name: 'Dividen yang diterima WPLN',
  tax_nature: 'final' as Bp26TaxNature,
  gross_income: 0,
  dpp_percent: 100,
  rate_percent: 20,
  kap_kjs: '411127-100',
  negara_treaty: '',
  pasal_treaty: '',
  nomor_skd: '',
  tarif_treaty_percent: undefined as number | undefined,
  document_type: 'Bukti Pembayaran',
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
    formState.tax_object_name = selected.taxObjectName
    formState.tax_nature = selected.taxNature
    formState.rate_percent = selected.ratePercent
    formState.kap_kjs = selected.kapKjs
  },
  { immediate: true }
)

const dppAmount = computed(() =>
  Math.round(Number(formState.gross_income || 0) * Number(formState.dpp_percent || 0) / 100)
)

const calculatedIncomeTax = computed(() =>
  Math.round(
    dppAmount.value
    * Number(
      formState.tax_nature === 'non_final'
      && formState.negara_treaty
      && formState.tarif_treaty_percent !== undefined
        ? formState.tarif_treaty_percent
        : formState.rate_percent
    )
    / 100
  )
)

function buildPayload(): Bp26Create {
  const treatyRate =
    formState.tarif_treaty_percent === undefined || formState.tarif_treaty_percent === null
      ? null
      : Math.round(Number(formState.tarif_treaty_percent) * 100)
  return {
    class_id: formState.class_id,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    recipient_identity_number: formState.recipient_identity_number,
    recipient_name: formState.recipient_name,
    tax_type: formState.tax_type,
    tax_object_code: formState.tax_object_code,
    tax_object_name: formState.tax_object_name,
    tax_nature: formState.tax_nature,
    tax_facility: 'none',
    gross_income: Number(formState.gross_income),
    dpp_percent: Number(formState.dpp_percent),
    rate_percent: Number(formState.rate_percent),
    kap_kjs: formState.kap_kjs || null,
    negara_treaty: formState.negara_treaty || null,
    pasal_treaty: formState.pasal_treaty || null,
    nomor_skd: formState.nomor_skd || null,
    tarif_treaty_basis_points: treatyRate,
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
    const created = await apiFetch<Bp26Read>('/api/v1/bp26', {
      method: 'POST',
      body: buildPayload()
    })

    if (submitIntent.value === 'issue') {
      await apiFetch<Bp26Read>(`/api/v1/bp26/${created.id}/issue`, { method: 'POST' })
      toast.add({
        title: 'BP26 diterbitkan',
        description: 'Dokumen masuk ke tab Telah Terbit.',
        color: 'success',
        icon: 'i-lucide-send'
      })
    } else {
      toast.add({
        title: 'Konsep BP26 disimpan',
        description: 'Dokumen masuk ke tab Belum Terbit.',
        color: 'success',
        icon: 'i-lucide-save'
      })
    }

    await navigateTo('/siswa/bp26')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan BP26.')
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
      <NuxtLink to="/siswa/bp26">eBupot</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BP 26 - Bukti Pemotongan WP Luar Negeri</strong>
    </div>

    <UForm :state="formState" :validate="validateBupotCreate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ auth.user.value?.tenant_id ?? '1471110802000001' }}</p>
          <h1>EBUPOT BP26</h1>
        </div>
        <div class="bupot-form__actions">
          <UButton to="/siswa/bp26" icon="i-lucide-arrow-left" color="neutral" variant="ghost">
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

          <UFormField name="tax_facility_label" label="Nama Fasilitas">
            <UInput v-model="formState.tax_facility_label" disabled class="w-full" />
          </UFormField>

          <UFormField name="recipient_identity_number" label="Nomor Identitas WP" required>
            <UInput v-model="formState.recipient_identity_number" class="w-full" />
          </UFormField>

          <UFormField name="recipient_name" label="Nama" required>
            <UInput v-model="formState.recipient_name" class="w-full" />
          </UFormField>
        </div>
      </section>

      <section class="bupot-section">
        <header>
          <h2>Penghitungan Pajak Penghasilan</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="tax_object_code" label="Nama Objek Pajak" required>
            <USelect v-model="formState.tax_object_code" :items="taxObjectOptions" class="w-full" />
          </UFormField>

          <UFormField name="tax_type" label="Jenis Pajak" required>
            <UInput v-model="formState.tax_type" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_object_code_readonly" label="Kode Objek Pajak" required>
            <UInput v-model="formState.tax_object_code" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_nature" label="Sifat Pajak Penghasilan" required>
            <USelect v-model="formState.tax_nature" :items="taxNatureOptions" class="w-full" />
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

          <UFormField name="kap_kjs" label="KAP" required>
            <UInput v-model="formState.kap_kjs" disabled class="w-full" />
          </UFormField>
        </div>
      </section>

      <section class="bupot-section">
        <header>
          <h2>Treaty / P3B</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="negara_treaty" label="Negara Treaty">
            <UInput v-model="formState.negara_treaty" placeholder="SGP" class="w-full" />
          </UFormField>

          <UFormField name="pasal_treaty" label="Pasal Treaty">
            <UInput v-model="formState.pasal_treaty" placeholder="10" class="w-full" />
          </UFormField>

          <UFormField name="nomor_skd" label="Nomor SKD">
            <UInput v-model="formState.nomor_skd" class="w-full" />
          </UFormField>

          <UFormField name="tarif_treaty_percent" label="Tarif Treaty (%)">
            <UInput
              v-model="formState.tarif_treaty_percent"
              type="number"
              min="0"
              max="100"
              class="w-full"
            />
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

