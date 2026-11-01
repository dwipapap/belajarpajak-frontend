<script setup lang="ts">
import type {
  BillingRead,
  DepositRead,
  LbTreatment,
  SignerCapacity,
  TaxReturnRead
} from '~/types/api'
import {
  isBillingExpired,
  signerCapacityLabel,
  sptDocumentTitle,
  sptKindLabel,
  sptPphTabs,
  sptPpnTabs,
  sptStatusLabel,
  sptTypeLabel
} from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const { apiFetch } = useApi()
const toast = useToast()

const sptId = computed(() => Number(route.params.id))

const { data: spt, refresh: refreshSpt, status: sptStatus } = useAsyncData(
  `siswa-spt-detail-${sptId.value}`,
  () => apiFetch<TaxReturnRead>(`/api/v1/spt/${sptId.value}`)
)

const { data: billing, refresh: refreshBilling } = useAsyncData(
  `siswa-spt-billing-${sptId.value}`,
  () => apiFetch<BillingRead>(`/api/v1/spt/${sptId.value}/billing`).catch(() => null),
  { default: () => null }
)

const { data: deposit, refresh: refreshDeposit } = useAsyncData(
  `siswa-spt-deposit-${sptId.value}`,
  () => apiFetch<DepositRead>('/api/v1/deposit').catch(() => ({ saldo: 0, mutasi: [] })),
  { default: () => ({ saldo: 0, mutasi: [] }) }
)

const busy = ref(false)
const pdfBusy = ref(false)
const activeTab = ref('induk')

// --- Pernyataan inline (bagian C Induk) ---
const signerName = ref('')
const signerNpwp = ref('')
const signerCapacity = ref<SignerCapacity>('wajib_pajak')
const lbTreatment = ref<LbTreatment | undefined>(undefined)
const agreed = ref(false)

watch(spt, (value) => {
  signerName.value = value?.signer_name ?? ''
  signerNpwp.value = value?.signer_npwp ?? ''
  signerCapacity.value = value?.signer_capacity ?? 'wajib_pajak'
  lbTreatment.value = value?.lb_treatment ?? undefined
  if (value?.signer_name) agreed.value = true
}, { immediate: true })

// --- Bayar dan Lapor ---
const signOpen = ref(false)
const signing = ref(false)
const metodeBayar = ref<'deposit' | 'billing'>('billing')

const isPpn = computed(() => spt.value?.return_type === 'ppn')
const isDraft = computed(() => spt.value?.status === 'draft')
const isAwaiting = computed(() => spt.value?.status === 'awaiting_payment')
const isReported = computed(() => spt.value?.status === 'reported')
const tabs = computed(() => (isPpn.value ? sptPpnTabs : sptPphTabs))

function validatePernyataan() {
  const errors: { name: string, message: string }[] = []
  if (!agreed.value) errors.push({ name: 'agreed', message: 'Centang pernyataan kebenaran SPT' })
  if (!signerName.value) errors.push({ name: 'signer_name', message: 'Nama penanda tangan wajib diisi' })
  if (signerCapacity.value === 'kuasa_wajib_pajak' && !signerNpwp.value) {
    errors.push({ name: 'signer_npwp', message: 'Kuasa wajib pajak wajib mencantumkan NPWP' })
  }
  if (isPpn.value && (spt.value?.ppn_lebih_bayar ?? 0) > 0 && !lbTreatment.value) {
    errors.push({ name: 'lb_treatment', message: 'Pilih perlakuan lebih bayar' })
  }
  return errors
}

async function downloadBillingPdf() {
  if (!billing.value) return
  pdfBusy.value = true
  try {
    const blob = await apiFetch<Blob>(`/api/v1/billings/${billing.value.id}/pdf`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BILLING_${billing.value.code}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh PDF', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    pdfBusy.value = false
  }
}

async function posting() {
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${sptId.value}/posting`, { method: 'POST' })
    toast.add({ title: 'Posting SPT berhasil', description: 'Data faktur dan bukti potong sudah terkumpul.', color: 'success', icon: 'i-lucide-check-circle' })
    await refreshSpt()
  } catch (error) {
    toast.add({ title: 'Gagal posting SPT', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

/** Simpan Konsep: menyimpan pernyataan (bagian C Induk) sebagai draf. */
async function saveKonsep() {
  const errors = validatePernyataan()
  const first = errors.at(0)
  if (first) {
    toast.add({ title: 'Periksa isian', description: first.message, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${sptId.value}/pernyataan`, {
      method: 'POST',
      body: {
        signer_name: signerName.value,
        signer_npwp: signerNpwp.value || null,
        signer_capacity: signerCapacity.value
      }
    })
    toast.add({ title: 'Konsep disimpan', description: 'Pernyataan penanda tangan tersimpan sebagai konsep.', color: 'success', icon: 'i-lucide-check-circle' })
    await refreshSpt()
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan konsep', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

function requestSubmit() {
  if (!spt.value?.signer_name) {
    toast.add({ title: 'Simpan Konsep dulu', description: 'Isi bagian C. Pernyataan lalu tekan Simpan Konsep sebelum Bayar dan Lapor.', color: 'warning', icon: 'i-lucide-circle-alert' })
    activeTab.value = 'induk'
    return
  }
  if (isPpn.value && (spt.value?.ppn_lebih_bayar ?? 0) > 0 && !spt.value?.lb_treatment && !lbTreatment.value) {
    toast.add({ title: 'Pilih perlakuan lebih bayar', description: 'Buka tab INDUK bagian III, lalu tekan Simpan Konsep.', color: 'warning', icon: 'i-lucide-circle-alert' })
    activeTab.value = 'induk'
    return
  }
  metodeBayar.value = 'billing'
  refreshDeposit()
  signOpen.value = true
}

async function confirmSign(payload: { signer_name?: string, kode_otorisasi: string }) {
  if (metodeBayar.value === 'deposit' && (spt.value?.amount_due ?? 0) > (deposit.value?.saldo ?? 0)) {
    toast.add({
      title: 'Saldo deposit tidak cukup',
      description: `Kurang bayar Rp ${money(spt.value?.amount_due ?? 0)}, saldo Rp ${money(deposit.value?.saldo ?? 0)}. Top-up via Billing Mandiri KAP 411618 lalu sinkronkan di menu Deposit.`,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }
  signing.value = true
  try {
    const body: Record<string, string | null> = { passphrase: payload.kode_otorisasi }
    if (isPpn.value && (lbTreatment.value || spt.value?.lb_treatment)) {
      body.lb_treatment = lbTreatment.value ?? spt.value?.lb_treatment ?? null
    }
    const result = await apiFetch<TaxReturnRead>(`/api/v1/spt/${sptId.value}/submit?metode=${metodeBayar.value}`, {
      method: 'POST',
      body
    })
    if (result.status === 'awaiting_payment') {
      toast.add({
        title: 'Kurang bayar — kode billing diterbitkan',
        description: 'Lunasi kode billing pada menu Pembayaran untuk melaporkan SPT.',
        color: 'warning',
        icon: 'i-lucide-receipt'
      })
    } else {
      toast.add({
        title: 'SPT dilaporkan',
        description: `${result.bpe_number ?? 'BPE'} tersedia di Portal Saya → Dokumen Saya.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
    signOpen.value = false
    await Promise.all([refreshSpt(), refreshBilling(), refreshDeposit()])
  } catch (error) {
    const msg = apiErrorMessage(error)
    if (msg.toLowerCase().includes('deposit') || msg.toLowerCase().includes('saldo')) {
      toast.add({ title: 'Saldo deposit tidak cukup', description: `${msg} Top-up via Billing Mandiri KAP 411618 lalu sinkronkan di menu Deposit, atau pilih "Buat billing".`, color: 'error', icon: 'i-lucide-circle-alert' })
    } else {
      toast.add({ title: 'Gagal bayar dan lapor', description: msg, color: 'error', icon: 'i-lucide-circle-alert' })
    }
  } finally {
    signing.value = false
  }
}

async function batalSpt() {
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${sptId.value}/batal`, { method: 'POST' })
    toast.add({ title: 'SPT dibatalkan ke konsep', description: 'Gunakan tombol Posting SPT untuk menghitung ulang bila ada dokumen berubah.', color: 'success', icon: 'i-lucide-undo-2' })
    await Promise.all([refreshSpt(), refreshBilling()])
  } catch (error) {
    toast.add({ title: 'Gagal membatalkan SPT', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

async function pembetulan() {
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${sptId.value}/pembetulan`, { method: 'POST' })
    toast.add({ title: 'Pembetulan dibuat', description: 'SPT kembali ke status konsep.', color: 'success', icon: 'i-lucide-pen-line' })
    await Promise.all([refreshSpt(), refreshBilling()])
  } catch (error) {
    toast.add({ title: 'Gagal membuat pembetulan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

function money(value: number) {
  return formatCurrency(value)
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink to="/siswa/spt">SPT</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Detail SPT</strong>
    </div>

    <div v-if="spt" class="spt-detail">
      <!-- Header card -->
      <div class="spt-detail__header">
        <div>
          <h1>{{ sptDocumentTitle[spt.return_type] }}</h1>
          <p class="spt-detail__meta">
            <span>{{ sptTypeLabel[spt.return_type] }} — Masa {{ monthLabels[spt.tax_month] }} {{ spt.tax_year }}</span>
            <UBadge color="neutral" variant="subtle">{{ sptKindLabel[spt.kind] }}{{ spt.correction_no > 0 ? ` ${spt.correction_no}` : '' }}</UBadge>
            <UBadge variant="subtle" :color="spt.status === 'reported' ? 'success' : spt.status === 'awaiting_payment' ? 'info' : 'warning'">
              {{ sptStatusLabel[spt.status] }}
            </UBadge>
            <span v-if="spt.signer_name">Penanda tangan: {{ spt.signer_name }} ({{ signerCapacityLabel[spt.signer_capacity] }})</span>
          </p>
          <!-- Indikator urutan: 1 Posting → 2 Pernyataan → 3 Bayar dan Lapor -->
          <ol class="spt-detail__steps" aria-label="Tahapan pelaporan SPT">
            <li :class="{ done: (spt.lines ?? []).length > 0 || spt.status !== 'draft' }"><strong>1</strong> Posting</li>
            <li :class="{ done: !!spt.signer_name }"><strong>2</strong> Pernyataan</li>
            <li :class="{ done: spt.status === 'reported' }"><strong>3</strong> Bayar dan Lapor</li>
          </ol>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="isDraft && activeTab === 'induk'"
            icon="i-lucide-upload-cloud"
            label="Posting SPT"
            class="bupot-primary-button"
            :loading="busy"
            @click="posting"
          />
          <UButton
            v-if="isAwaiting"
            icon="i-lucide-undo-2"
            label="Batal"
            color="neutral"
            variant="soft"
            title="Kembalikan SPT ke konsep"
            :loading="busy"
            @click="batalSpt"
          />
          <UButton
            v-if="isReported"
            icon="i-lucide-pen-line"
            label="Buat Pembetulan"
            color="neutral"
            variant="soft"
            :loading="busy"
            @click="pembetulan"
          />
        </div>
      </div>

      <!-- Billing card -->
      <div v-if="billing" class="spt-detail__billing">
        <div>
          <strong>Kode Billing: {{ billing.code }}</strong>
          <span>{{ billing.kap_kjs }} · Masa {{ formatMasaPajak(billing.masa_pajak) }}</span>
          <span v-if="isAwaiting" class="text-xs">Gunakan tombol BATAL untuk mengubah status SPT dari MENUNGGU PEMBAYARAN ke KONSEP.</span>
        </div>
        <div class="spt-detail__billing-amount">
          <strong>Rp {{ money(billing.amount) }}</strong>
          <UBadge v-if="billing.status === 'paid'" color="success" variant="subtle">Sudah Dibayar</UBadge>
          <UBadge v-else-if="billing.status === 'cancelled'" color="neutral" variant="subtle">Dibatalkan</UBadge>
          <UBadge v-else-if="isBillingExpired(billing.created_at, billing.status)" color="error" variant="soft" title="Masa berlaku simulasi 14 hari habis — buat kode billing baru dari menu Pembayaran bila masih kurang bayar">Kedaluwarsa — buat billing baru</UBadge>
          <UBadge v-else color="warning" variant="subtle">Belum Dibayar — Menunggu Pembayaran</UBadge>
          <UButton v-if="billing.status === 'unpaid'" to="/siswa/pembayaran" icon="i-lucide-badge-dollar-sign" size="xs" label="Bayar di menu Pembayaran" />
          <UButton icon="i-lucide-file-down" size="xs" color="neutral" variant="soft" label="Unduh PDF" :loading="pdfBusy" @click="downloadBillingPdf" />
        </div>
      </div>

      <!-- Tabs -->
      <nav class="spt-tabs" aria-label="Tab SPT">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Tab content -->
      <template v-if="activeTab === 'induk'">
        <SptIndukPpn
          v-if="isPpn"
          :spt="spt"
          v-model:signer-name="signerName"
          v-model:signer-npwp="signerNpwp"
          v-model:signer-capacity="signerCapacity"
          v-model:lb-treatment="lbTreatment"
          v-model:agreed="agreed"
        />
        <SptIndukPph
          v-else
          :spt="spt"
          v-model:signer-name="signerName"
          v-model:signer-npwp="signerNpwp"
          v-model:signer-capacity="signerCapacity"
          v-model:agreed="agreed"
        />
      </template>
      <SptLampiranTable v-else :key="`${spt.id}-${activeTab}`" :spt-id="spt.id" :kode="activeTab" />

      <!-- Footer setiap tab -->
      <div v-if="isDraft" class="spt-detail__footer">
        <URadioGroup
          v-model="metodeBayar"
          :items="[
            { label: `Buat billing (kode billing dilunasi di menu Pembayaran)`, value: 'billing' },
            { label: `Pakai deposit (saldo Rp ${money(deposit?.saldo ?? 0)})`, value: 'deposit' }
          ]"
          orientation="horizontal"
        />
        <div class="flex gap-2">
          <UButton icon="i-lucide-save" label="Simpan Konsep" color="neutral" variant="soft" :loading="busy" @click="saveKonsep" />
          <UTooltip text="Lakukan posting dulu, lalu simpan konsep pernyataan">
            <UButton
              icon="i-lucide-send"
              label="Bayar dan Lapor"
              color="success"
              :disabled="!spt.signer_name"
              @click="requestSubmit"
            />
          </UTooltip>
        </div>
      </div>
      <p v-if="isAwaiting" class="text-sm text-muted">Gunakan tombol BATAL untuk mengubah status SPT dari MENUNGGU PEMBAYARAN ke KONSEP.</p>

      <!-- Guru review -->
      <div v-if="spt.score !== null" class="spt-detail__review">
        <strong>Penilaian Guru: {{ spt.score }}/100</strong>
        <p v-if="spt.teacher_feedback">{{ spt.teacher_feedback }}</p>
      </div>
    </div>

    <div v-else-if="sptStatus === 'pending'" class="py-16 text-center text-sm text-muted">Memuat...</div>

    <DocumentSignModal v-model:open="signOpen" :loading="signing" @confirm="confirmSign" />
  </div>
</template>

<style scoped>
.spt-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.spt-detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250);
  padding: 1.1rem 1.3rem;
}

.spt-detail__header h1 {
  font-size: 1.15rem;
  font-weight: 850;
}

.spt-detail__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
  color: oklch(0.45 0.045 260);
  font-size: 0.85rem;
}

.spt-detail__steps {
  display: flex;
  gap: 0.5rem;
  list-style: none;
  margin: 0.7rem 0 0;
  padding: 0;
  font-size: 0.8rem;
}

.spt-detail__steps li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 999px;
  padding: 0.25rem 0.7rem 0.25rem 0.3rem;
  color: oklch(0.45 0.045 260);
}

.spt-detail__steps li strong {
  display: grid;
  width: 1.3rem;
  height: 1.3rem;
  place-items: center;
  border-radius: 999px;
  background: oklch(0.9 0.013 255);
  font-size: 0.72rem;
}

.spt-detail__steps li.done {
  border-color: oklch(0.8 0.1 150);
  color: oklch(0.35 0.1 150);
}

.spt-detail__steps li.done strong {
  background: oklch(0.8 0.12 150);
  color: #fff;
}

.spt-detail__billing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid oklch(0.85 0.09 85);
  border-radius: 0.55rem;
  background: oklch(0.97 0.05 90);
  padding: 0.9rem 1.3rem;
}

.spt-detail__billing > div:first-child {
  display: flex;
  flex-direction: column;
}

.spt-detail__billing span {
  color: oklch(0.45 0.045 260);
  font-size: 0.82rem;
}

.spt-detail__billing-amount {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.spt-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.spt-tabs button {
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.45rem;
  background: oklch(0.99 0.004 250);
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: oklch(0.45 0.045 260);
}

.spt-tabs button.active {
  border-color: oklch(0.55 0.15 250);
  background: oklch(0.55 0.15 250);
  color: #fff;
}

.spt-detail__section {
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250);
  padding: 1.1rem 1.3rem;
}

.spt-detail__section h2 {
  margin-bottom: 0.8rem;
  font-size: 0.98rem;
  font-weight: 800;
}

.spt-detail__figures {
  display: grid;
  max-width: 34rem;
  gap: 0.45rem;
}

.spt-detail__figures > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px dashed oklch(0.9 0.013 255);
  padding-bottom: 0.4rem;
}

.spt-detail__figures dt {
  color: oklch(0.45 0.045 260);
}

.spt-detail__figures dd {
  font-weight: 700;
}

.spt-detail__figures--highlight dd {
  color: oklch(0.42 0.12 60);
}

.spt-detail__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250);
  padding: 0.9rem 1.3rem;
}

.spt-detail__review {
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.55rem;
  background: oklch(0.97 0.03 145);
  padding: 0.9rem 1.3rem;
}

.spt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.spt-table th,
.spt-table td {
  border-bottom: 1px solid oklch(0.92 0.01 255);
  padding: 0.5rem 0.6rem;
  text-align: right;
}

.spt-table th:first-child,
.spt-table td:first-child {
  text-align: left;
}

.spt-table th {
  background: oklch(0.93 0.06 85);
  color: oklch(0.3 0.08 70);
  font-weight: 750;
}

.spt-table__pasal td {
  background: oklch(0.965 0.01 255);
  font-weight: 700;
}

.spt-table tfoot td {
  border-top: 2px solid oklch(0.85 0.02 255);
  font-weight: 750;
}
</style>
