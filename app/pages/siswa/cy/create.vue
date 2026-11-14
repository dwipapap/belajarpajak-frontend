<script setup lang="ts">
import type {
  CyCreate,
  CyRead,
  CyTaxFacility,
  CyTaxNature,
  SchoolClass
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()
const { signOpen, signing, openSign, confirmSign } = useBupotSubmitSign('cy', 'CY')

const facilityOptions = bupotFacilityChoices

const documentTypeOptions = bupotDocumentTypes

const { data: classes } = useAsyncData(
  'siswa-cy-create-classes',
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
  tax_facility: 'none' as CyTaxFacility,
  tax_object_code: '',
  income_type: '',
  tax_nature: 'non_final' as CyTaxNature,
  dpp: 0,
  rate_percent: 0,
  kap_kjs: '',
  document_type: 'Bukti Pembayaran',
  document_number: '',
  document_date: new Date().toISOString().slice(0, 10),
  document_nitku: ''
})
const { showClassField } = useAutoClass(formState, classOptions)
const { masaPajak, masaPajakItems } = useMasaPajak(formState)

const saving = ref(false)
const submitIntent = ref<'draft' | 'issue'>('draft')
const submitError = ref<string | null>(null)

const { items: taxObjectItems, loading: taxObjectLoading, taxTypeLabel, rateEditable } = useObjekPajak(
  'cy',
  formState,
  () => facilityCodeByChoice[formState.tax_facility]
)

const calculatedIncomeTax = computed(() => {
  if (formState.tax_facility === 'skb' || formState.tax_facility === 'rate_0') return 0
  return Math.round(Number(formState.dpp || 0) * Number(formState.rate_percent || 0) / 100)
})

function buildPayload(): CyCreate {
  return {
    class_id: formState.class_id,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    withholder_npwp: formState.withholder_npwp || null,
    withholder_name: formState.withholder_name || null,
    withholder_nitku: formState.withholder_nitku || null,
    tax_object_code: formState.tax_object_code,
    income_type: formState.income_type,
    tax_nature: formState.tax_nature,
    tax_facility: formState.tax_facility,
    dpp: Number(formState.dpp),
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
    const created = await apiFetch<CyRead>('/api/v1/cy', {
      method: 'POST',
      body: buildPayload()
    })

    if (submitIntent.value === 'issue') {
      openSign(created.id)
      return
    }
    toast.add({
      title: 'Konsep CY disimpan',
      description: 'Dokumen masuk ke tab Belum Terbit.',
      color: 'success',
      icon: 'i-lucide-save'
    })

    await navigateTo('/siswa/cy')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan CY.')
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="bupot-create">
    <DocumentSignModal v-model:open="signOpen" :loading="signing" @confirm="confirmSign" />
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/cy">eBupot</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>CY - Pemotongan Digunggung</strong>
    </div>

    <UForm :state="formState" :validate="validateSetorCreate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ auth.user.value?.tenant_id ?? '1471110802000001' }}</p>
          <h1>EBUPOT PENYETORAN SECARA DIGUNGGUNG</h1>
        </div>
        <div class="bupot-form__actions">
          <UButton
            type="submit"
            icon="i-lucide-send"
            label="Submit"
            class="bupot-primary-button"
            :loading="saving && submitIntent === 'issue'"
            @click="submitIntent = 'issue';"
          />
          <UButton
            type="submit"
            icon="i-lucide-save"
            label="Simpan Konsep"
            color="neutral"
            :loading="saving && submitIntent === 'draft'"
            @click="submitIntent = 'draft';"
          />
          <UButton to="/siswa/cy" icon="i-lucide-search" label="Go to search" color="neutral" variant="ghost" />
        </div>
      </div>

      <UAlert
        v-if="submitError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="submitError"
      />
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Simpan Konsep menyimpan draf yang masih bisa diubah di tab Belum Terbit; Submit menyimpan lalu meminta tanda tangan elektronik sebelum dokumen terbit ke tab Telah Terbit."
        class="mb-1"
      />

      <section class="bupot-section">
        <header>
          <h2>Informasi Umum</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField v-if="showClassField" name="class_id" label="Kelas" required>
            <USelect
              v-model="formState.class_id"
              :items="classOptions"
              placeholder="Pilih..."
              class="w-full"
            />
          </UFormField>

          <UFormField name="tax_month" label="Masa Pajak" required>
            <USelect v-model="masaPajak" :items="masaPajakItems" class="w-full" />
          </UFormField>

          <UFormField name="status" label="Status" required>
            <UInput v-model="formState.status" disabled class="w-full" />
          </UFormField>
        </div>
      </section>

      <section class="bupot-section">
        <header>
          <h2>Pajak Penghasilan (Rp)</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="tax_facility" label="Fasilitas Pajak yang Dimiliki oleh Penyetor" required>
            <USelect v-model="formState.tax_facility" :items="facilityOptions" class="w-full" />
          </UFormField>

          <UFormField name="tax_object_code" label="Nama Objek Pajak" required>
            <USelectMenu
              v-model="formState.tax_object_code"
              :items="taxObjectItems"
              value-key="value"
              :loading="taxObjectLoading"
              placeholder="Cari nama objek pajak..."
              class="w-full"
            />
          </UFormField>

          <UFormField name="income_type" label="Jenis Pajak" required>
            <UInput :model-value="taxTypeLabel" disabled class="w-full" />
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

        <div class="bupot-grid">
          <UFormField name="dpp" label="Dasar Pengenaan Pajak (Rp)" required>
            <UInput v-model="formState.dpp" type="number" class="w-full" />
          </UFormField>

          <UFormField name="rate_percent" label="Tarif (%)" required>
            <UInput v-model="formState.rate_percent" type="number" :disabled="!rateEditable" class="w-full" />
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
