<script setup lang="ts">
import type { ClassDetail, SchoolClass } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['guru', 'admin', 'superadmin'] })

interface TagihanItem {
  id: number
  tenant_id: number
  user_id: number
  jenis: string
  kap_kjs: string
  masa: string
  amount: number
  status: string
  billing_id: number | null
}
interface TagihanListResponse { items: TagihanItem[]; total: number }
interface SiswaOpt { id: number; full_name: string; email: string }

const { apiFetch } = useApi()
const toast = useToast()

// ---- daftar tagihan ----
const page = ref(1)
const size = 20
const { data, status, refresh } = useAsyncData(
  'guru-tagihan-list',
  () => apiFetch<TagihanListResponse>('/api/v1/tagihan', { query: { page: page.value, size } }),
  { default: () => ({ items: [], total: 0 }) as TagihanListResponse, watch: [page] }
)

// ---- siswa dari kelas guru ----
const { data: classes } = useAsyncData(
  'guru-tagihan-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)
const selectedClassId = ref<number | undefined>(undefined)
const { data: classDetail } = useAsyncData(
  'guru-tagihan-class-detail',
  async () => selectedClassId.value === null
    ? null
    : await apiFetch<ClassDetail>(`/api/v1/classes/${selectedClassId.value}`),
  { watch: [selectedClassId] }
)
const siswaOptions = computed<SiswaOpt[]>(() => (classDetail.value?.students ?? []).map(s => ({
  id: s.id, full_name: s.full_name, email: s.email
})))

// ---- form buat tagihan ----
const form = reactive({
  siswa_id: undefined as number | undefined,
  jenis: 'skp',
  kap_kjs: '',
  masa: '',
  amount: undefined as number | undefined
})
const submitting = ref(false)

function validate(): { name: string; message: string }[] {
  const errs: { name: string; message: string }[] = []
  if (!form.siswa_id) errs.push({ name: 'siswa_id', message: 'Pilih siswa.' })
  if (!form.kap_kjs.trim()) errs.push({ name: 'kap_kjs', message: 'Isi KAP/KJS.' })
  if (!/^(0[1-9]|1[0-2])\d{4}$/.test(form.masa.trim())) errs.push({ name: 'masa', message: 'Masa harus MMYYYY.' })
  if (!form.amount || form.amount < 1) errs.push({ name: 'amount', message: 'Nominal minimal Rp1.' })
  return errs
}

async function buatTagihan() {
  if (validate().length > 0) return
  submitting.value = true
  try {
    await apiFetch('/api/v1/tagihan', {
      method: 'POST',
      body: { siswa_id: form.siswa_id, jenis: form.jenis, kap_kjs: form.kap_kjs.trim(), masa: form.masa.trim(), amount: form.amount }
    })
    toast.add({ title: 'Tagihan dibuat', color: 'success', icon: 'i-lucide-check-circle' })
    form.kap_kjs = ''
    form.masa = ''
    form.amount = undefined
    await refresh()
  } catch (e) {
    toast.add({ title: 'Gagal membuat tagihan', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    submitting.value = false
  }
}

// ---- buat billing ----
const billingId = ref<number | null>(null)
async function buatBilling(id: number) {
  billingId.value = id
  try {
    await apiFetch(`/api/v1/tagihan/${id}/buat-billing`, { method: 'POST' })
    toast.add({ title: 'Kode billing dibuat', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Gagal membuat billing', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    billingId.value = null
  }
}

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user_id', header: 'Siswa (ID)' },
  { accessorKey: 'jenis', header: 'Jenis' },
  { accessorKey: 'kap_kjs', header: 'KAP/KJS' },
  { accessorKey: 'masa', header: 'Masa' },
  { accessorKey: 'amount', header: 'Nominal' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: 'Aksi' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-default">Tagihan SKP / STP</h1>
        <p class="text-sm text-muted">Terbitkan tagihan untuk siswa, lalu buat kode billing.</p>
      </div>
      <UButton to="/guru" icon="i-lucide-arrow-left" color="neutral" variant="ghost" label="Dasbor Guru" />
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-default">Buat Tagihan</h2>
      </template>
      <UForm :validate="validate" :state="form" class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit="buatTagihan">
        <UFormField label="Kelas" name="kelas">
          <USelect
            v-model="selectedClassId"
            :items="(classes ?? []).map(c => ({ label: `${c.name} — ${c.academic_year}`, value: c.id }))"
            placeholder="Pilih kelas untuk memuat siswa"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Siswa" name="siswa_id" required>
          <USelect
            v-model="form.siswa_id"
            :items="siswaOptions.map(s => ({ label: `${s.full_name} (${s.email})`, value: s.id }))"
            placeholder="Pilih siswa"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Jenis" name="jenis" required>
          <USelect
            v-model="form.jenis"
            :items="[{ label: 'SKP', value: 'skp' }, { label: 'STP', value: 'stp' }]"
            class="w-full"
          />
        </UFormField>
        <UFormField label="KAP / KJS" name="kap_kjs" required>
          <UInput v-model="form.kap_kjs" placeholder="cth. 411125" class="w-full" />
        </UFormField>
        <UFormField label="Masa (MMYYYY)" name="masa" required>
          <UInput v-model="form.masa" placeholder="cth. 0122026" maxlength="6" class="w-full" />
        </UFormField>
        <UFormField label="Nominal (Rp)" name="amount" required>
          <UInputNumber v-model="form.amount" :min="1" class="w-full" />
        </UFormField>
        <div class="md:col-span-2">
          <UButton type="submit" label="Buat Tagihan" icon="i-lucide-plus" :loading="submitting" />
        </div>
      </UForm>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold text-default">Daftar Tagihan ({{ data?.total ?? 0 }})</h2>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" @click="() => refresh()" />
        </div>
      </template>
      <div v-if="status === 'pending'" class="py-6 text-center text-sm text-muted">Memuat…</div>
      <div v-else-if="(data?.items ?? []).length === 0" class="py-6 text-center text-sm text-muted">
        Belum ada tagihan.
      </div>
      <UTable v-else :data="data?.items ?? []" :columns="columns">
        <template #amount-cell="{ row }">{{ formatCurrency(row.original.amount) }}</template>
        <template #status-cell="{ row }">
          <UBadge :color="row.original.status === 'lunas' ? 'success' : row.original.status === 'billing' ? 'info' : 'warning'" variant="subtle" :label="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <UButton
            v-if="row.original.status === 'belum'"
            size="xs" label="Buat Billing"
            :loading="billingId === row.original.id"
            @click="buatBilling(row.original.id)"
          />
          <span v-else class="text-xs text-muted">{{ row.original.billing_id ? `#${row.original.billing_id}` : '—' }}</span>
        </template>
      </UTable>
      <div v-if="(data?.total ?? 0) > size" class="mt-4 flex justify-end">
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="size" />
      </div>
    </UCard>
  </div>
</template>
