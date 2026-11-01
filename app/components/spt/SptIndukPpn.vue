<script setup lang="ts">
import type { LbTreatment, SignerCapacity, TaxReturnRead } from '~/types/api'
import { lbTreatmentOptions, signerCapacityOptions } from '~/utils/spt'

/** Induk SPT Masa PPN: Bagian I–III + C. Pernyataan inline. */

const props = defineProps<{ spt: TaxReturnRead }>()

const signerName = defineModel<string>('signerName', { default: '' })
const signerNpwp = defineModel<string>('signerNpwp', { default: '' })
const signerCapacity = defineModel<SignerCapacity>('signerCapacity', { default: 'wajib_pajak' })
const lbTreatment = defineModel<LbTreatment | undefined>('lbTreatment', { default: undefined })
const agreed = defineModel<boolean>('agreed', { default: false })

const ppnKeluaranLines = computed(() =>
  (props.spt.lines ?? []).filter(line => line.section.startsWith('I_')))
const ppnMasukanLines = computed(() =>
  (props.spt.lines ?? []).filter(line => line.section.startsWith('II_')))

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
  <div class="flex flex-col gap-4">
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
            <td colspan="5" class="text-center text-sm text-muted">Belum ada data penyerahan. Rincian per dokumen ada di lampiran A-1/A-2.</td>
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
            <td colspan="5" class="text-center text-sm text-muted">Belum ada pajak masukan yang dikreditkan. Rincian per dokumen ada di lampiran B-2.</td>
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
      <div v-if="spt.ppn_lebih_bayar > 0" class="mt-4">
        <UFormField label="Perlakuan Lebih Bayar" required hint="Wajib dipilih sebelum Bayar dan Lapor">
          <URadioGroup v-model="lbTreatment" :items="lbTreatmentOptions" />
        </UFormField>
        <p v-if="lbTreatment === 'restitusi'" class="mt-2 text-sm text-muted">
          Restitusi diajukan lewat menu Formulir Restitusi <UBadge color="neutral" variant="subtle">Segera hadir</UBadge>.
          Saldo yang direstitusi tidak dibawa ke kompensasi masa berikutnya.
        </p>
      </div>
    </section>

    <section class="spt-detail__section">
      <h2>C. Pernyataan dan Tanda Tangan</h2>
      <div class="flex flex-col gap-3">
        <UCheckbox
          v-model="agreed"
          label="Dengan menyadari sepenuhnya akan segala akibatnya termasuk sanksi-sanksi sesuai dengan ketentuan perundang-undangan yang berlaku, saya menyatakan bahwa apa yang telah saya beritahukan di atas beserta lampiran-lampirannya adalah benar, lengkap dan jelas."
        />
        <UFormField label="Kapasitas Penanda Tangan" required>
          <URadioGroup v-model="signerCapacity" :items="signerCapacityOptions" orientation="horizontal" />
        </UFormField>
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField label="NPWP" :required="signerCapacity === 'kuasa_wajib_pajak'" :hint="signerCapacity === 'kuasa_wajib_pajak' ? 'Wajib diisi untuk kuasa wajib pajak' : 'Opsional'">
            <UInput v-model="signerNpwp" placeholder="Nomor NPWP" class="w-full" :disabled="signerCapacity === 'wajib_pajak'" />
          </UFormField>
          <UFormField label="Nama Penanda Tangan" required>
            <UInput v-model="signerName" placeholder="Nama lengkap" class="w-full" />
          </UFormField>
        </div>
      </div>
    </section>
  </div>
</template>
