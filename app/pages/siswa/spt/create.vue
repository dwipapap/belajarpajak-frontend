<script setup lang="ts">
import type { TaxReturnKind, TaxReturnType } from '~/types/api'
import { sptWizardSteps } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const { apiFetch } = useApi()
const toast = useToast()
const router = useRouter()

const step = ref(0)
const busy = ref(false)

const returnType = ref<TaxReturnType | undefined>(undefined)
const taxMonth = ref<number | undefined>(undefined)
const taxYear = ref<number>(new Date().getFullYear())
const kind = ref<TaxReturnKind>('normal')

const typeOptions: { label: string, value: TaxReturnType, description: string, icon: string }[] = [
  {
    label: 'PPN',
    value: 'ppn',
    description: 'SPT Masa PPN — penyerahan barang/jasa dan pajak masukan yang dikreditkan.',
    icon: 'i-lucide-receipt-text'
  },
  {
    label: 'PPh Unifikasi',
    value: 'pph_unifikasi',
    description: 'SPT Masa PPh Unifikasi — agregasi bukti potong Pasal 4(2), 15, 22, 23, dan 26.',
    icon: 'i-lucide-scroll-text'
  },
  {
    label: 'PPh 21/26',
    value: 'pph_21_26',
    description: 'SPT Masa PPh 21/26 — agregasi bukti potong bulanan pegawai tetap (BPMP), BP21, dan BP26.',
    icon: 'i-lucide-file-stack'
  }
]

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index)
const monthSelectOptions = monthOptions as { label: string, value: number }[]

/** A future period is rejected by the API; block it already in the wizard. */
function isFuturePeriod(month: number, year: number) {
  const now = new Date()
  return year > now.getFullYear()
    || (year === now.getFullYear() && month > now.getMonth() + 1)
}

const canContinue = computed(() => {
  if (step.value === 0) return returnType.value !== undefined
  if (step.value === 1) {
    return taxMonth.value !== undefined
      && !isFuturePeriod(taxMonth.value, taxYear.value)
  }
  return kind.value !== undefined
})

function pickType(value: TaxReturnType) {
  returnType.value = value
}

function goNext() {
  step.value = Math.min(step.value + 1, 2)
}

function goBack() {
  step.value = Math.max(step.value - 1, 0)
}

async function submit() {
  if (returnType.value === undefined || taxMonth.value === undefined) return
  busy.value = true
  try {
    const created = await apiFetch<{ id: number }>('/api/v1/spt', {
      method: 'POST',
      body: {
        return_type: returnType.value,
        tax_month: taxMonth.value,
        tax_year: taxYear.value,
        kind: kind.value
      }
    })
    toast.add({ title: 'Konsep SPT dibuat', description: 'Lanjutkan dengan Posting SPT.', color: 'success', icon: 'i-lucide-check-circle' })
    await router.push(`/siswa/spt/${created.id}`)
  } catch (error) {
    toast.add({ title: 'Gagal membuat konsep SPT', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
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
      <strong>Buat Konsep SPT</strong>
    </div>

    <div class="spt-wizard">
      <UStepper v-model="step" :items="sptWizardSteps" />

      <!-- Step 1: jenis pajak -->
      <div v-if="step === 0" class="spt-wizard__body">
        <h2>Pilih Jenis Pajak</h2>
        <div class="spt-wizard__cards">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="faktur-card spt-wizard__card"
            :class="{ 'faktur-card--active': returnType === option.value }"
            @click="pickType(option.value)"
          >
            <UIcon :name="option.icon" class="size-6" />
            <strong>{{ option.label }}</strong>
            <span>{{ option.description }}</span>
          </button>
        </div>
      </div>

      <!-- Step 2: periode -->
      <div v-else-if="step === 1" class="spt-wizard__body">
        <h2>Pilih Periode Pelaporan SPT</h2>
        <div class="flex flex-wrap items-end gap-4">
          <USelect v-model="taxMonth" :items="monthSelectOptions" placeholder="Pilih Masa Pajak" class="min-w-52" />
          <USelect v-model="taxYear" :items="yearOptions" placeholder="Tahun" class="min-w-32" />
        </div>
        <p v-if="taxMonth !== undefined && isFuturePeriod(taxMonth, taxYear)" class="mt-2 text-sm text-error">
          Periode tidak boleh masa depan.
        </p>
      </div>

      <!-- Step 3: jenis SPT -->
      <div v-else class="spt-wizard__body">
        <h2>Pilih Jenis SPT</h2>
        <div class="flex gap-4">
          <button
            type="button"
            class="faktur-card spt-wizard__card"
            :class="{ 'faktur-card--active': kind === 'normal' }"
            @click="kind = 'normal'"
          >
            <strong>Normal</strong>
            <span>Pelaporan pertama untuk periode ini.</span>
          </button>
          <button
            type="button"
            class="faktur-card spt-wizard__card"
            :class="{ 'faktur-card--active': kind === 'pembetulan' }"
            @click="kind = 'pembetulan'"
          >
            <strong>Pembetulan</strong>
            <span>Hanya untuk SPT yang sudah dilaporkan.</span>
          </button>
        </div>
      </div>

      <div class="spt-wizard__footer">
        <UButton
          label="Kembali"
          color="neutral"
          variant="soft"
          :disabled="step === 0"
          @click="goBack"
        />
        <UButton
          v-if="step < 2"
          label="Lanjut"
          trailing-icon="i-lucide-chevron-right"
          :disabled="!canContinue"
          @click="goNext"
        />
        <UButton v-else label="Buat Konsep SPT" icon="i-lucide-check" :loading="busy" :disabled="!canContinue" @click="submit" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.spt-wizard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border: 1px solid oklch(0.9 0.013 255);
  border-radius: 0.55rem;
  background: oklch(0.99 0.004 250);
  padding: 1.75rem;
}

.spt-wizard__body h2 {
  margin-bottom: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
}

.spt-wizard__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.spt-wizard__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  width: min(22rem, 100%);
  padding: 1.1rem;
  text-align: left;
}

.spt-wizard__card span {
  color: oklch(0.45 0.045 260);
  font-size: 0.85rem;
}

.spt-wizard__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  border-top: 1px solid oklch(0.9 0.013 255);
  padding-top: 1.1rem;
}
</style>
