<script setup lang="ts">
import type { BpmpCreate, BpmpRead, BpmpTaxNature, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()
const { signOpen, signing, openSign, confirmSign } = useBupotSubmitSign('bpmp', 'BPMP')

// PTKP status determines the TER category (PMK 168/2023 Art. 3):
// A = TK/0, TK/1, K/0 · B = TK/2, TK/3, K/1, K/2 · C = K/3.
const ptkpStatusOptions = [
  'TK/0',
  'TK/1',
  'TK/2',
  'TK/3',
  'K/0',
  'K/1',
  'K/2',
  'K/3'
]

const terCategoryByPtkp: Record<string, string> = {
  'TK/0': 'A',
  'TK/1': 'A',
  'K/0': 'A',
  'TK/2': 'B',
  'TK/3': 'B',
  'K/1': 'B',
  'K/2': 'B',
  'K/3': 'C'
}

const documentTypeOptions = bupotDocumentTypes

const { data: classes } = useAsyncData(
  'siswa-bpmp-create-classes',
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
  ptkp_status: 'TK/0',
  tax_type: 'PPh 21',
  tax_object_code: '',
  tax_object_name: '',
  tax_nature: 'non_final' as BpmpTaxNature,
  gross_income: 0,
  dpp_percent: 100,
  rate_percent: 5,
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

const { items: taxObjectItems, loading: taxObjectLoading, natureLabel } = useObjekPajak(
  'bpmp',
  formState,
  () => '9'
)

const dppAmount = computed(() =>
  Math.round(Number(formState.gross_income || 0) * Number(formState.dpp_percent || 0) / 100)
)

const terCategory = computed(() => terCategoryByPtkp[formState.ptkp_status] ?? '-')

const calculatedIncomeTax = computed(() =>
  Math.round(dppAmount.value * Number(formState.rate_percent) / 100)
)

function buildPayload(): BpmpCreate {
  return {
    class_id: formState.class_id,
    tax_month: Number(formState.tax_month),
    tax_year: Number(formState.tax_year),
    recipient_identity_number: formState.recipient_identity_number,
    recipient_name: formState.recipient_name,
    ptkp_status: formState.ptkp_status,
    tax_type: formState.tax_type,
    tax_object_code: formState.tax_object_code,
    tax_object_name: formState.tax_object_name,
    tax_nature: formState.tax_nature,
    tax_facility: 'none',
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
    const created = await apiFetch<BpmpRead>('/api/v1/bpmp', {
      method: 'POST',
      body: buildPayload()
    })

    if (submitIntent.value === 'issue') {
      openSign(created.id)
      return
    }
    toast.add({
      title: 'Konsep BPMP disimpan',
      description: 'Dokumen masuk ke tab Belum Terbit.',
      color: 'success',
      icon: 'i-lucide-save'
    })

    await navigateTo('/siswa/bpmp')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'Gagal menyimpan BPMP.')
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
      <NuxtLink to="/siswa/bpmp">eBupot</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BPMP - Bukti Pemotongan Bulanan Pegawai Tetap</strong>
    </div>

    <UForm :state="formState" :validate="validateBupotCreate" class="bupot-form" @submit="onSubmit">
      <div class="bupot-form__header">
        <div>
          <p>{{ auth.user.value?.tenant_id ?? '1471110802000001' }}</p>
          <h1>EBUPOT MP</h1>
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
          <UButton to="/siswa/bpmp" icon="i-lucide-search" label="Go to search" color="neutral" variant="ghost" />
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
          <h2>Status PTKP / Kategori TER</h2>
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" />
        </header>
        <div class="bupot-grid">
          <UFormField name="ptkp_status" label="Status PTKP" required>
            <USelect v-model="formState.ptkp_status" :items="ptkpStatusOptions" class="w-full" />
          </UFormField>

          <UFormField name="ter_category" label="Kategori TER (PMK 168/2023)">
            <UInput :model-value="terCategory" disabled class="w-full" />
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

