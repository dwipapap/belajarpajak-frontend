<script setup lang="ts">
import type {
  BillingRead,
  SignerCapacity,
  TaxReturnRead
} from '~/types/api'
import {
  groupPphLines,
  kjsRowLabel,
  pasalLabel,
  pasalSections,
  sptKindLabel,
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

const busy = ref(false)
const pdfBusy = ref(false)

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

// --- Pernyataan ---
const pernyataanOpen = ref(false)
const signerName = ref('')
const signerNpwp = ref('')
const signerCapacity = ref<SignerCapacity>('wajib_pajak')

const submitOpen = ref(false)
const passphrase = ref('')

function openPernyataan() {
  // Prefill from whatever is already stored on the return.
  signerName.value = spt.value?.signer_name ?? ''
  signerNpwp.value = spt.value?.signer_npwp ?? ''
  signerCapacity.value = spt.value?.signer_capacity ?? 'wajib_pajak'
  pernyataanOpen.value = true
}

function openSubmit() {
  submitOpen.value = true
}

const isPpn = computed(() => spt.value?.return_type === 'ppn')
const isDraft = computed(() => spt.value?.status === 'draft')
const isAwaiting = computed(() => spt.value?.status === 'awaiting_payment')
const isReported = computed(() => spt.value?.status === 'reported')

const ppnKeluaranLines = computed(() =>
  (spt.value?.lines ?? []).filter(line => line.section.startsWith('I_')))
const ppnMasukanLines = computed(() =>
  (spt.value?.lines ?? []).filter(line => line.section.startsWith('II_')))
const pphGroups = computed(() => groupPphLines(spt.value?.lines ?? []))

function validatePernyataan() {
  const errors: { name: string, message: string }[] = []
  if (!signerName.value) errors.push({ name: 'signer_name', message: 'Nama penanda tangan wajib diisi' })
  if (signerCapacity.value === 'kuasa_wajib_pajak' && !signerNpwp.value) {
    errors.push({ name: 'signer_npwp', message: 'Kuasa wajib pajak wajib mencantumkan NPWP' })
  }
  return errors
}

function closePernyataan() {
  pernyataanOpen.value = false
}

function closeSubmit() {
  submitOpen.value = false
}

async function savePernyataan() {
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
    toast.add({ title: 'Pernyataan disimpan', color: 'success', icon: 'i-lucide-check-circle' })
    pernyataanOpen.value = false
    await refreshSpt()
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan pernyataan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
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

async function submitSpt() {
  if (!passphrase.value) {
    toast.add({ title: 'Masukkan passphrase', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  busy.value = true
  try {
    const result = await apiFetch<TaxReturnRead>(`/api/v1/spt/${sptId.value}/submit`, {
      method: 'POST',
      body: { passphrase: passphrase.value }
    })
    if (result.status === 'awaiting_payment') {
      toast.add({
        title: 'Kurang bayar — kode billing diterbitkan',
        description: 'Lunasi kode billing pada menu Pembayaran untuk melaporkan SPT.',
        color: 'warning',
        icon: 'i-lucide-receipt'
      })
    } else {
      toast.add({ title: 'SPT berhasil dilaporkan', color: 'success', icon: 'i-lucide-check-circle' })
    }
    submitOpen.value = false
    passphrase.value = ''
    await Promise.all([refreshSpt(), refreshBilling()])
  } catch (error) {
    toast.add({ title: 'Gagal bayar dan lapor', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
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

function headerLabel(section: string) {
  switch (section) {
    case 'I_A1': return 'A.1 Ekspor BKP/BKP Tidak Berwujud/JKP'
    case 'I_A2': return 'A.2 Penyerahan dengan DPP Nilai Lain (FP Kode 04 dan 05)'
    case 'I_A3': return 'A.3 Penyerahan kepada Turis (FP Kode 06)'
    case 'I_A4': return 'A.4 Penyerahan lainnya (FP Kode 01)'
    case 'I_A6': return 'A.6 Dipungut oleh Pemungut PPN (FP Kode 02 dan 03)'
    case 'I_A7': return 'A.7 Fasilitas Tidak Dipungut (FP Kode 07)'
    case 'I_A8': return 'A.8 Fasilitas Dibebaskan (FP Kode 08)'
    case 'II_B': return 'B. Perolehan dengan DPP Nilai Lain (FP Kode 04 dan 05)'
    case 'II_C': return 'C. Perolehan lainnya (FP Kode 01, 09 dan 10)'
    case 'II_D': return 'D. Perolehan sebagai Pemungut PPN (FP Kode 02 dan 03)'
    case 'II_E': return 'E. Kompensasi kelebihan Pajak Masukan'
    default: return section
  }
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
          <h1>{{ sptTypeLabel[spt.return_type] }} — Masa {{ monthLabels[spt.tax_month] }} {{ spt.tax_year }}</h1>
          <p class="spt-detail__meta">
            <UBadge color="neutral" variant="subtle">{{ sptKindLabel[spt.kind] }}{{ spt.correction_no > 0 ? ` ${spt.correction_no}` : '' }}</UBadge>
            <UBadge variant="subtle" :color="spt.status === 'reported' ? 'success' : spt.status === 'awaiting_payment' ? 'info' : 'warning'">
              {{ sptStatusLabel[spt.status] }}
            </UBadge>
            <span v-if="spt.signer_name">Penanda tangan: {{ spt.signer_name }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="isDraft"
            icon="i-lucide-upload-cloud"
            label="Posting SPT"
            class="bupot-primary-button"
            :loading="busy"
            @click="posting"
          />
          <UButton
            v-if="isDraft"
            icon="i-lucide-file-signature"
            label="Pernyataan"
            color="neutral"
            variant="soft"
            @click="openPernyataan"
          />
          <UButton
            v-if="isDraft"
            icon="i-lucide-send"
            label="Bayar dan Lapor"
            color="success"
            :disabled="!spt.signer_name"
            @click="openSubmit"
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
        </div>
        <div class="spt-detail__billing-amount">
          <strong>Rp {{ money(billing.amount) }}</strong>
          <UBadge :color="billing.status === 'paid' ? 'success' : 'warning'" variant="subtle">
            {{ billing.status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar' }}
          </UBadge>
          <UButton v-if="billing.status === 'unpaid'" to="/siswa/pembayaran" icon="i-lucide-badge-dollar-sign" size="xs" label="Bayar di menu Pembayaran" />
          <UButton icon="i-lucide-file-down" size="xs" color="neutral" variant="soft" label="Unduh PDF" :loading="pdfBusy" @click="downloadBillingPdf" />
        </div>
      </div>

      <!-- PPN form -->
      <template v-if="isPpn">
        <section class="spt-detail__section">
          <h2>I. Penyerahan Barang dan Jasa</h2>
          <table class="spt-table">
            <thead>
              <tr>
                <th class="w-1/2">Uraian</th>
                <th>Harga Jual/DPP (Rp)</th>
                <th>DPP Nilai Lain (Rp)</th>
                <th>PPN (Rp)</th>
                <th>PPnBM (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in ppnKeluaranLines" :key="line.id">
                <td>{{ headerLabel(line.section) }} — FP Kode {{ line.code }}</td>
                <td>{{ money(line.dpp) }}</td>
                <td>{{ money(line.dpp_nilai_lain) }}</td>
                <td>{{ money(line.ppn) }}</td>
                <td>{{ money(line.ppnbm) }}</td>
              </tr>
              <tr v-if="!ppnKeluaranLines.length">
                <td colspan="5" class="text-center text-sm text-muted">Belum ada data penyerahan.</td>
              </tr>
            </tbody>
            <tfoot v-if="ppnKeluaranLines.length">
              <tr>
                <td><strong>Jumlah</strong></td>
                <td><strong>{{ money(spt.penyerahan_dpp) }}</strong></td>
                <td><strong>{{ money(spt.penyerahan_dpp_nilai_lain) }}</strong></td>
                <td><strong>{{ money(spt.penyerahan_ppn) }}</strong></td>
                <td><strong>{{ money(spt.penyerahan_ppnbm) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section class="spt-detail__section">
          <h2>II. Pajak Masukan</h2>
          <table class="spt-table">
            <thead>
              <tr>
                <th class="w-1/2">Uraian</th>
                <th>Harga Perolehan/DPP (Rp)</th>
                <th>DPP Nilai Lain (Rp)</th>
                <th>PPN (Rp)</th>
                <th>PPnBM (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in ppnMasukanLines" :key="line.id">
                <td>{{ headerLabel(line.section) }}<template v-if="line.code !== '-'"> — FP Kode {{ line.code }}</template></td>
                <td>{{ money(line.dpp) }}</td>
                <td>{{ money(line.dpp_nilai_lain) }}</td>
                <td>{{ money(line.ppn) }}</td>
                <td>{{ money(line.ppnbm) }}</td>
              </tr>
              <tr v-if="!ppnMasukanLines.length">
                <td colspan="5" class="text-center text-sm text-muted">Belum ada pajak masukan yang dikreditkan.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Jumlah Pajak Masukan (G)</strong></td>
                <td><strong>{{ money(spt.masukan_dpp) }}</strong></td>
                <td><strong>{{ money(spt.masukan_dpp_nilai_lain) }}</strong></td>
                <td colspan="2"><strong>{{ money(spt.masukan_ppn + spt.kompensasi_lebih_bayar) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section class="spt-detail__section">
          <h2>III. Penghitungan PPN Kurang Bayar / Lebih Bayar</h2>
          <dl class="spt-detail__figures">
            <div><dt>PPN Keluaran</dt><dd>Rp {{ money(spt.penyerahan_ppn) }}</dd></div>
            <div><dt>PPN Masukan yang Diperhitungkan</dt><dd>Rp {{ money(spt.masukan_ppn) }}</dd></div>
            <div><dt>Kompensasi Kelebihan Pajak Masukan</dt><dd>Rp {{ money(spt.kompensasi_lebih_bayar) }}</dd></div>
            <div class="spt-detail__figures--highlight">
              <dt>PPN Kurang Bayar</dt><dd>Rp {{ money(spt.ppn_kurang_bayar) }}</dd>
            </div>
            <div class="spt-detail__figures--highlight">
              <dt>PPN Lebih Bayar</dt><dd>Rp {{ money(spt.ppn_lebih_bayar) }}</dd>
            </div>
          </dl>
        </section>
      </template>

      <!-- PPh Unifikasi Induk -->
      <template v-else>
        <section class="spt-detail__section">
          <h2>B. Pajak Penghasilan</h2>
          <table class="spt-table">
            <thead>
              <tr>
                <th>No</th>
                <th class="w-1/3">Detil</th>
                <th>Setor Sendiri</th>
                <th>Pemotongan / Pemungutan</th>
                <th>PPh Ditanggung Pemerintah</th>
                <th>Jumlah PPh Dibayar</th>
                <th>PPh Kurang/Lebih Bayar Karena Pembetulan</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(pasal, index) in pasalSections" :key="pasal">
                <tr class="spt-table__pasal">
                  <td>{{ index + 1 }}</td>
                  <td colspan="6"><strong>{{ pasalLabel[pasal] }}</strong></td>
                </tr>
                <tr v-for="line in pphGroups.get(pasal) ?? []" :key="line.id">
                  <td />
                  <td>{{ kjsRowLabel(line.code) }}</td>
                  <td>{{ money(line.setor_sendiri) }}</td>
                  <td>{{ money(line.pemotongan) }}</td>
                  <td>{{ money(line.ditanggung_pemerintah) }}</td>
                  <td>{{ money(line.setor_sendiri + line.pemotongan + line.ditanggung_pemerintah) }}</td>
                  <td>{{ money(line.dibayar_dari_spt_dibetulkan) }}</td>
                </tr>
                <tr v-if="!(pphGroups.get(pasal) ?? []).length">
                  <td />
                  <td colspan="6" class="text-center text-sm text-muted">Belum ada bukti potong.</td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"><strong>Jumlah PPh (Induk)</strong></td>
                <td colspan="2"><strong>{{ money(spt.total_income_tax) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </section>
      </template>

      <!-- Guru review -->
      <div v-if="spt.score !== null" class="spt-detail__review">
        <strong>Penilaian Guru: {{ spt.score }}/100</strong>
        <p v-if="spt.teacher_feedback">{{ spt.teacher_feedback }}</p>
      </div>
    </div>

    <div v-else-if="sptStatus === 'pending'" class="py-16 text-center text-sm text-muted">Memuat...</div>

    <!-- Pernyataan modal -->
    <UModal v-model:open="pernyataanOpen" title="Pernyataan SPT">
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField label="Nama Penanda Tangan" required>
            <UInput v-model="signerName" placeholder="Nama lengkap" class="w-full" />
          </UFormField>
          <UFormField label="Kapasitas">
            <USelect v-model="signerCapacity" :items="signerCapacityOptions" class="w-full" />
          </UFormField>
          <UFormField
            label="NPWP Kuasa Wajib Pajak"
            :hint="signerCapacity === 'kuasa_wajib_pajak' ? 'Wajib diisi untuk kuasa wajib pajak' : 'Opsional'"
          >
            <UInput v-model="signerNpwp" placeholder="Nomor NPWP" class="w-full" :disabled="signerCapacity === 'wajib_pajak'" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closePernyataan" />
          <UButton label="Simpan" :loading="busy" @click="savePernyataan" />
        </div>
      </template>
    </UModal>

    <!-- Submit modal -->
    <UModal v-model:open="submitOpen" title="Bayar dan Lapor">
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm">
            Lapor SPT dengan tanda tangan elektronik. Masukkan passphrase akun Anda sebagai verifikasi.
          </p>
          <UFormField label="Passphrase" required>
            <UInput v-model="passphrase" type="password" placeholder="Passphrase" class="w-full" />
          </UFormField>
          <p v-if="spt && spt.amount_due > 0" class="text-sm text-warning">
            SPT ini memiliki kurang bayar Rp {{ money(spt.amount_due) }} — kode billing akan diterbitkan.
          </p>
          <p v-else class="text-sm text-success">
            Tidak ada kurang bayar — SPT langsung dilaporkan setelah verifikasi.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeSubmit" />
          <UButton label="Bayar dan Lapor" color="success" :loading="busy" @click="submitSpt" />
        </div>
      </template>
    </UModal>
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
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
  color: oklch(0.45 0.045 260);
  font-size: 0.85rem;
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
