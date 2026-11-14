<script setup lang="ts">
import type { SignerCapacity, TaxReturnRead } from '~/types/api'
import { groupPphLines, pasalLabel, pasalSections, signerCapacityOptions } from '~/utils/spt'

/** Induk SPT Masa PPh (Unifikasi / 21/26): A. Identitas, B. PPh, C. Pernyataan. */

const props = defineProps<{ spt: TaxReturnRead }>()

const signerName = defineModel<string>('signerName', { default: '' })
const signerNpwp = defineModel<string>('signerNpwp', { default: '' })
const signerCapacity = defineModel<SignerCapacity>('signerCapacity', { default: 'wajib_pajak' })
const agreed = defineModel<boolean>('agreed', { default: false })

const pphGroups = computed(() => groupPphLines(props.spt.lines ?? []))

/** Peta label manusiawi KJS — lokal untuk file ini. */
const kjsHumanLabel: Record<string, string> = {
  '411211-100': 'PPN Masa',
  '411121-100': 'PPh 21 Setor Sendiri',
  '411122-100': 'PPh 22',
  '411124-100': 'PPh 23',
  '411124-101': 'PPh 23 Dividen',
  '411124-102': 'PPh 23 Bunga',
  '411124-103': 'PPh 23 Royalti',
  '411124-104': 'PPh 23 Jasa/Sewa',
  '411122-900': 'PPh 22 Setor Sendiri',
  '411122-910': 'PPh 22 Lainnya',
  '411127-100': 'PPh 26',
  '411127-110': 'PPh 26',
  '411128-100': 'PPh Final 4(2)',
  '411128-403': 'PPh Final 4(2) Sewa Tanah/Bangunan',
  '411128-600': 'PPh Pasal 15',
  '411129-600': 'PPh Pasal 15'
}

function humanKjsLabel(code: string) {
  const human = kjsHumanLabel[code]
  return human ? `${human} — ${code}` : `KJS:${code}`
}

function money(value: number) {
  return formatCurrency(value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="spt-detail__section">
      <h2>A. Identitas Pemotong / Pemungut</h2>
      <dl class="spt-detail__figures">
        <div><dt>Masa Pajak</dt><dd>{{ monthLabels[spt.tax_month] }} {{ spt.tax_year }}</dd></div>
      </dl>
    </section>

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
              <td>{{ humanKjsLabel(line.code) }}</td>
              <td>{{ money(line.setor_sendiri) }}</td>
              <td>{{ money(line.pemotongan) }}</td>
              <td>{{ money(line.ditanggung_pemerintah) }}</td>
              <td>{{ money(line.setor_sendiri + line.pemotongan + line.ditanggung_pemerintah) }}</td>
              <td>{{ money(line.dibayar_dari_spt_dibetulkan) }}</td>
            </tr>
            <tr v-if="!(pphGroups.get(pasal) ?? []).length">
              <td />
              <td colspan="6" class="text-center text-sm text-muted">Belum ada bukti potong. Rincian per dokumen ada di LAMPIRAN-I.</td>
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
