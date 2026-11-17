<script setup lang="ts">
import { foreignCountryOptions } from '~/utils/countries'
import type { BupotFacilityChoice } from '~/utils/bupotForm'
import type { BpnrCreate, BpnrRead, BpnrTaxNature, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()
const { signOpen, signing, openSign, confirmSign } = useBupotSubmitSign('bpnr', 'BPNR')

const facilityChoiceOptions = bupotFacilityChoicesNonResident

const documentTypeOptions = bupotDocumentTypes
const countryItems = foreignCountryOptions()
// TODO(paritas): the reference's Metode Pembayaran options are not captured yet.
const paymentMethodOptions = ['Transfer / Pemindahbukuan', 'Tunai']

const { data: classes } = useAsyncData(
  'siswa-bpnr-create-classes',
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
  facility_choice: 'none' as BupotFacilityChoice,
  recipient_identity_number: '',
  recipient_name: '',
  recipient_address: '',
  recipient_country: '',
  recipient_birth_date: '',
  recipient_birth_place: '',
  recipient_passport_number: '',
  recipient_kitas_number: '',
  tax_type: '',
  tax_object_code: '',
  tax_object_name: '',
  tax_nature: 'final' as BpnrTaxNature,
  gross_income: 0,
  dpp_percent: 100,
  rate_percent: 0,
  kap_kjs: '',
  nomor_skd: '',
  document_type: 'Bukti Pembayaran',
  document_number: '',
  document_date: new Date().toISOString().slice(0, 10),
  payment_method: '',
  sp2d_number: '',
  document_nitku: ''
})
const { showClassField } = useAutoClass(formState, classOptions)
const { masaPajak, masaPajakItems } = useMasaPajak(formState)

const saving = ref(false)
const submitIntent = ref<'draft' | 'issue'>('draft')
const submitError = ref<string | null>(null)

const { items: taxObjectItems, loading: taxObjectLoading, natureLabel, rateEditable } = useObjekPajak(
  'bpnr',
  formState,
  () => facilityCodeByChoice[formState.facility_choice]
)

const dppAmount = computed(() =>
  Math.round(Number(formState.gross_income || 0) * Number(formState.dpp_percent || 0) / 100)
)

const calculatedIncomeTax = computed(() =>
  formState.facility_choice === 'skb'
    ? 0
    : Math.round(
    dppAmount.value
    * Number(formState.rate_percent)
    / 100
  )
)

function buildPayload(): BpnrCreate {
  const treaty = formState.facility_choice === 'treaty'
  return {
    class_id: formState.class_id,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    recipient_identity_number: formState.recipient_identity_number,
    recipient_name: formState.recipient_name,
    recipient_address: formState.recipient_address || null,
    recipient_country: formState.recipient_country || null,
    recipient_birth_date: formState.recipient_birth_date || null,
    recipient_birth_place: formState.recipient_birth_place || null,
    recipient_passport_number: formState.recipient_passport_number || null,
    recipient_kitas_number: formState.recipient_kitas_number || null,
    payment_method: formState.payment_method || null,
    sp2d_number: formState.sp2d_number || null,
    tax_type: formState.tax_type,
    tax_object_code: formState.tax_object_code,
    tax_object_name: formState.tax_object_name,
    tax_nature: formState.tax_nature,
    tax_facility: formState.facility_choice,
    gross_income: Number(formState.gross_income),
    dpp_percent: Number(formState.dpp_percent),
    rate_percent: Number(formState.rate_percent),
    kap_kjs: formState.kap_kjs || null,
    negara_treaty: null,
    pasal_treaty: null,
    nomor_skd: treaty ? formState.nomor_skd || null : null,
    tarif_treaty_basis_points: null,
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
    const created = await apiFetch<BpnrRead>('/api/v1/bpnr', {
      method: 'POST',
      body: buildPayload()
    })

    if (submitIntent.value === 'issue') {
      openSign(created.id)
      return
    }
    toast.add({
      title: 'Konsep BPNR disimpan',
      description: 'Dokumen masuk ke tab Belum Terbit.',
      color: 'success',
      icon: 'i-lucide-save'
    })

    await navigateTo('/siswa/bpnr')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan BPNR.')
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
      <NuxtLink to="/siswa/bpnr">eBupot</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BPNR - Bukti Potong Non-Residen</strong>
    </div>

    <UForm :state="formState" :validate="validateBpnrCreate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ auth.user.value?.tenant_id ?? '1471110802000001' }}</p>
          <h1>EBUPOT BPNR</h1>
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
          <UButton to="/siswa/bpnr" icon="i-lucide-search" label="Go to search" color="neutral" variant="ghost" />
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
          <h2>Penghitungan Pajak Penghasilan</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="facility_choice" label="Nama Fasilitas" required>
            <USelect v-model="formState.facility_choice" :items="facilityChoiceOptions" class="w-full" />
          </UFormField>
          <UFormField v-if="formState.facility_choice === 'treaty'" name="nomor_skd" label="Receipt Number" required>
            <UInput v-model="formState.nomor_skd" class="w-full" />
          </UFormField>

          <UFormField
            name="recipient_identity_number"
            label="Nomor Identitas WP"
            help="TIN dari negara asal (1–30 karakter: huruf, angka, - / .)"
            required
          >
            <UInput v-model="formState.recipient_identity_number" maxlength="30" class="w-full" />
          </UFormField>

          <UFormField name="recipient_name" label="Name" required>
            <UInput v-model="formState.recipient_name" class="w-full" />
          </UFormField>

          <UFormField name="recipient_address" label="Address">
            <UInput v-model="formState.recipient_address" class="w-full" />
          </UFormField>

          <UFormField name="recipient_country" label="Negara">
            <USelectMenu
              v-model="formState.recipient_country"
              :items="countryItems"
              value-key="value"
              placeholder="Pilih negara..."
              class="w-full"
            />
          </UFormField>

          <UFormField name="recipient_birth_date" label="Tanggal Lahir">
            <UInput v-model="formState.recipient_birth_date" type="date" class="w-full" />
          </UFormField>

          <UFormField name="recipient_birth_place" label="Tempat Lahir">
            <UInput v-model="formState.recipient_birth_place" class="w-full" />
          </UFormField>

          <UFormField name="recipient_passport_number" label="Nomor Paspor">
            <UInput v-model="formState.recipient_passport_number" class="w-full" />
          </UFormField>

          <UFormField name="recipient_kitas_number" label="Nomor KITAS/KITAP">
            <UInput v-model="formState.recipient_kitas_number" class="w-full" />
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

          <UFormField name="tax_type" label="Jenis Pajak" required>
            <UInput v-model="formState.tax_type" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_object_code_readonly" label="Kode Objek Pajak" required>
            <UInput v-model="formState.tax_object_code" disabled class="w-full" />
          </UFormField>

          <UFormField name="tax_nature" label="Sifat Pajak Penghasilan" required>
            <UInput :model-value="natureLabel" disabled class="w-full" />
          </UFormField>

          <UFormField name="gross_income" label="Penghasilan Bruto (Rp)" required>
            <UInput v-model="formState.gross_income" type="number" class="w-full" />
          </UFormField>

          <UFormField name="dpp_percent" label="Tingkat Penghasilan Neto yang Dianggap (%)" required>
            <UInput v-model="formState.dpp_percent" type="number" class="w-full" />
          </UFormField>

          <UFormField name="rate_percent" label="Tarif (%)(BPNR)" required>
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

          <UFormField name="payment_method" label="Metode Pembayaran (BPNR)">
            <USelect
              v-model="formState.payment_method"
              :items="paymentMethodOptions"
              placeholder="Pilih..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="sp2d_number"
            label="Nomor SP2D (BPNR)"
            help="Hanya untuk pemotong instansi pemerintah."
          >
            <UInput v-model="formState.sp2d_number" class="w-full" />
          </UFormField>

          <UFormField name="document_nitku" label="NITKU / Nomor Identitas Sub Unit Organisasi">
            <UInput v-model="formState.document_nitku" class="w-full" />
          </UFormField>
        </div>
      </section>
    </UForm>
  </div>
</template>

