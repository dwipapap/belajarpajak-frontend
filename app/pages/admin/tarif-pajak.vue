<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  TarifProgresifCreate,
  TarifProgresifPasal17,
  TierPtkp,
  TierPtkpCreate
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['superadmin'] })

const { apiFetch } = useApi()
const toast = useToast()

const activeTab = ref<'ptkp' | 'progresif'>('ptkp')
const taxYear = ref(new Date().getFullYear())
const activeFilter = ref<boolean | undefined>(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const tabs = [
  { label: 'PTKP', value: 'ptkp', icon: 'i-lucide-user-round-check' },
  { label: 'Tarif Progresif', value: 'progresif', icon: 'i-lucide-chart-no-axes-column' }
]

const activeFilterOptions = [
  { label: 'Aktif', value: true },
  { label: 'Nonaktif', value: false },
  { label: 'Semua', value: undefined }
]

function tariffQuery() {
  const query = new URLSearchParams({ tahun_pajak: String(taxYear.value), size: '100' })
  if (activeFilter.value !== undefined) query.set('is_active', String(activeFilter.value))
  return query.toString()
}

const { data: ptkpRows, status: ptkpStatus, refresh: refreshPtkp } = useAsyncData(
  'admin-tarif-ptkp',
  () => apiFetch<TierPtkp[]>(`/api/v1/tarif-pajak/ptkp?${tariffQuery()}`),
  { watch: [taxYear, activeFilter], default: () => [] as TierPtkp[] }
)

const { data: bracketRows, status: bracketStatus, refresh: refreshBrackets } = useAsyncData(
  'admin-tarif-progresif',
  () => apiFetch<TarifProgresifPasal17[]>(`/api/v1/tarif-pajak/progresif?${tariffQuery()}`),
  { watch: [taxYear, activeFilter], default: () => [] as TarifProgresifPasal17[] }
)

const ptkpColumns: TableColumn<TierPtkp>[] = [
  { accessorKey: 'status_kode', header: 'Status' },
  { accessorKey: 'jumlah_ptkp', header: 'PTKP (Rp)' },
  { accessorKey: 'tahun_pajak', header: 'Tahun' },
  { accessorKey: 'is_active', header: 'Status Data' },
  { id: 'actions' }
]

const bracketColumns: TableColumn<TarifProgresifPasal17>[] = [
  { accessorKey: 'batas_bawah', header: 'Batas Bawah' },
  { accessorKey: 'batas_atas', header: 'Batas Atas' },
  { accessorKey: 'persentase_basis_points', header: 'Tarif' },
  { accessorKey: 'tahun_pajak', header: 'Tahun' },
  { accessorKey: 'is_active', header: 'Status Data' },
  { id: 'actions' }
]

const ptkpOpen = ref(false)
const editingPtkpId = ref<number | null>(null)
const ptkpState = reactive({
  status_kode: '',
  jumlah_ptkp: undefined as number | undefined,
  tahun_pajak: taxYear.value,
  keterangan: '',
  is_active: true
})

const bracketOpen = ref(false)
const editingBracketId = ref<number | null>(null)
const bracketState = reactive({
  batas_bawah: undefined as number | undefined,
  batas_atas: undefined as number | undefined,
  persentase: undefined as number | undefined,
  tahun_pajak: taxYear.value,
  keterangan: '',
  is_active: true
})

function validatePtkp(state: Partial<typeof ptkpState>) {
  const errors: { name: string, message: string }[] = []
  if (!state.status_kode) errors.push({ name: 'status_kode', message: 'Status wajib diisi' })
  if (Number(state.jumlah_ptkp) < 0 || state.jumlah_ptkp === undefined) {
    errors.push({ name: 'jumlah_ptkp', message: 'PTKP wajib diisi' })
  }
  if (!state.tahun_pajak) errors.push({ name: 'tahun_pajak', message: 'Tahun wajib diisi' })
  return errors
}

function validateBracket(state: Partial<typeof bracketState>) {
  const errors: { name: string, message: string }[] = []
  if (state.batas_bawah === undefined || Number(state.batas_bawah) < 0) {
    errors.push({ name: 'batas_bawah', message: 'Batas bawah wajib diisi' })
  }
  if (state.persentase === undefined || Number(state.persentase) < 0) {
    errors.push({ name: 'persentase', message: 'Tarif wajib diisi' })
  }
  if (!state.tahun_pajak) errors.push({ name: 'tahun_pajak', message: 'Tahun wajib diisi' })
  if (state.batas_atas !== undefined && Number(state.batas_atas) <= Number(state.batas_bawah)) {
    errors.push({ name: 'batas_atas', message: 'Batas atas harus lebih besar' })
  }
  return errors
}

function openPtkp(row?: TierPtkp) {
  editingPtkpId.value = row?.id ?? null
  Object.assign(ptkpState, {
    status_kode: row?.status_kode ?? '',
    jumlah_ptkp: row?.jumlah_ptkp,
    tahun_pajak: row?.tahun_pajak ?? taxYear.value,
    keterangan: row?.keterangan ?? '',
    is_active: row?.is_active ?? true
  })
  errorMessage.value = null
  ptkpOpen.value = true
}

function closePtkp() {
  ptkpOpen.value = false
}

function openBracket(row?: TarifProgresifPasal17) {
  editingBracketId.value = row?.id ?? null
  Object.assign(bracketState, {
    batas_bawah: row?.batas_bawah,
    batas_atas: row?.batas_atas ?? undefined,
    persentase: row ? row.persentase_basis_points / 100 : undefined,
    tahun_pajak: row?.tahun_pajak ?? taxYear.value,
    keterangan: row?.keterangan ?? '',
    is_active: row?.is_active ?? true
  })
  errorMessage.value = null
  bracketOpen.value = true
}

function closeBracket() {
  bracketOpen.value = false
}

async function savePtkp() {
  saving.value = true
  errorMessage.value = null
  const payload: TierPtkpCreate = {
    status_kode: ptkpState.status_kode,
    jumlah_ptkp: Number(ptkpState.jumlah_ptkp),
    tahun_pajak: Number(ptkpState.tahun_pajak),
    keterangan: ptkpState.keterangan || null,
    is_active: ptkpState.is_active
  }
  try {
    await apiFetch(
      editingPtkpId.value
        ? `/api/v1/tarif-pajak/ptkp/${editingPtkpId.value}`
        : '/api/v1/tarif-pajak/ptkp',
      { method: editingPtkpId.value ? 'PATCH' : 'POST', body: payload }
    )
    toast.add({ title: 'PTKP tersimpan', color: 'success', icon: 'i-lucide-check-circle' })
    ptkpOpen.value = false
    await refreshPtkp()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Gagal menyimpan PTKP.')
  } finally {
    saving.value = false
  }
}

async function saveBracket() {
  saving.value = true
  errorMessage.value = null
  const payload: TarifProgresifCreate = {
    batas_bawah: Number(bracketState.batas_bawah),
    batas_atas: bracketState.batas_atas === undefined ? null : Number(bracketState.batas_atas),
    persentase_basis_points: Math.round(Number(bracketState.persentase) * 100),
    tahun_pajak: Number(bracketState.tahun_pajak),
    keterangan: bracketState.keterangan || null,
    is_active: bracketState.is_active
  }
  try {
    await apiFetch(
      editingBracketId.value
        ? `/api/v1/tarif-pajak/progresif/${editingBracketId.value}`
        : '/api/v1/tarif-pajak/progresif',
      { method: editingBracketId.value ? 'PATCH' : 'POST', body: payload }
    )
    toast.add({ title: 'Tarif progresif tersimpan', color: 'success', icon: 'i-lucide-check-circle' })
    bracketOpen.value = false
    await refreshBrackets()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Gagal menyimpan tarif progresif.')
  } finally {
    saving.value = false
  }
}

async function deletePtkp(row: TierPtkp) {
  if (!window.confirm(`Hapus PTKP ${row.status_kode} ${row.tahun_pajak}?`)) return
  await apiFetch(`/api/v1/tarif-pajak/ptkp/${row.id}`, { method: 'DELETE' })
  toast.add({ title: 'PTKP dihapus', color: 'success', icon: 'i-lucide-trash-2' })
  await refreshPtkp()
}

async function deleteBracket(row: TarifProgresifPasal17) {
  if (!window.confirm(`Hapus bracket tahun ${row.tahun_pajak}?`)) return
  await apiFetch(`/api/v1/tarif-pajak/progresif/${row.id}`, { method: 'DELETE' })
  toast.add({ title: 'Tarif progresif dihapus', color: 'success', icon: 'i-lucide-trash-2' })
  await refreshBrackets()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="bupot-breadcrumb">
          <NuxtLink to="/admin">Dasbor Admin</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <strong>Tarif Pajak</strong>
        </div>
        <h1 class="mt-2 text-2xl font-semibold text-default">Kelola Tarif Pajak</h1>
      </div>
      <UButton to="/admin" icon="i-lucide-arrow-left" label="Kembali" color="neutral" variant="ghost" />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <UTabs v-model="activeTab" :items="tabs" class="min-w-72" />
          <div class="flex flex-wrap items-center gap-2">
            <UInput v-model="taxYear" type="number" class="w-32" />
            <USelect v-model="activeFilter" :items="activeFilterOptions" class="w-36" />
            <UButton
              v-if="activeTab === 'ptkp'"
              icon="i-lucide-plus"
              label="Tambah PTKP"
              @click="openPtkp()"
            />
            <UButton
              v-else
              icon="i-lucide-plus"
              label="Tambah Bracket"
              @click="openBracket()"
            />
          </div>
        </div>
      </template>

      <div v-if="activeTab === 'ptkp'" class="overflow-x-auto">
        <UTable :data="ptkpRows" :columns="ptkpColumns" :loading="ptkpStatus === 'pending'">
          <template #jumlah_ptkp-cell="{ row }">
            Rp {{ formatCurrency(row.original.jumlah_ptkp) }}
          </template>
          <template #is_active-cell="{ row }">
            <UBadge :color="row.original.is_active ? 'success' : 'neutral'" variant="subtle">
              {{ row.original.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="soft" @click="openPtkp(row.original)" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="soft" @click="deletePtkp(row.original)" />
            </div>
          </template>
        </UTable>
      </div>

      <div v-else class="overflow-x-auto">
        <UTable
          :data="bracketRows"
          :columns="bracketColumns"
          :loading="bracketStatus === 'pending'"
        >
          <template #batas_bawah-cell="{ row }">
            Rp {{ formatCurrency(row.original.batas_bawah) }}
          </template>
          <template #batas_atas-cell="{ row }">
            {{ row.original.batas_atas === null ? 'Tidak terbatas' : `Rp ${formatCurrency(row.original.batas_atas)}` }}
          </template>
          <template #persentase_basis_points-cell="{ row }">
            {{ (row.original.persentase_basis_points / 100).toFixed(2) }}%
          </template>
          <template #is_active-cell="{ row }">
            <UBadge :color="row.original.is_active ? 'success' : 'neutral'" variant="subtle">
              {{ row.original.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="soft" @click="openBracket(row.original)" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="soft" @click="deleteBracket(row.original)" />
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <UModal v-model:open="ptkpOpen" title="PTKP">
      <template #body>
        <UForm :state="ptkpState" :validate="validatePtkp" class="space-y-4" @submit="savePtkp">
          <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
          <UFormField name="status_kode" label="Status PTKP" required>
            <UInput v-model="ptkpState.status_kode" class="w-full" />
          </UFormField>
          <UFormField name="jumlah_ptkp" label="Jumlah PTKP" required>
            <UInput v-model="ptkpState.jumlah_ptkp" type="number" class="w-full" />
          </UFormField>
          <UFormField name="tahun_pajak" label="Tahun Pajak" required>
            <UInput v-model="ptkpState.tahun_pajak" type="number" class="w-full" />
          </UFormField>
          <UFormField name="keterangan" label="Keterangan">
            <UInput v-model="ptkpState.keterangan" class="w-full" />
          </UFormField>
          <UCheckbox v-model="ptkpState.is_active" label="Aktif" />
          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" @click="closePtkp" />
            <UButton type="submit" label="Simpan" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="bracketOpen" title="Tarif Progresif">
      <template #body>
        <UForm :state="bracketState" :validate="validateBracket" class="space-y-4" @submit="saveBracket">
          <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
          <UFormField name="batas_bawah" label="Batas Bawah" required>
            <UInput v-model="bracketState.batas_bawah" type="number" class="w-full" />
          </UFormField>
          <UFormField name="batas_atas" label="Batas Atas" hint="Kosongkan untuk tak terbatas">
            <UInput v-model="bracketState.batas_atas" type="number" class="w-full" />
          </UFormField>
          <UFormField name="persentase" label="Tarif (%)" required>
            <UInput v-model="bracketState.persentase" type="number" class="w-full" />
          </UFormField>
          <UFormField name="tahun_pajak" label="Tahun Pajak" required>
            <UInput v-model="bracketState.tahun_pajak" type="number" class="w-full" />
          </UFormField>
          <UFormField name="keterangan" label="Keterangan">
            <UInput v-model="bracketState.keterangan" class="w-full" />
          </UFormField>
          <UCheckbox v-model="bracketState.is_active" label="Aktif" />
          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" @click="closeBracket" />
            <UButton type="submit" label="Simpan" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
