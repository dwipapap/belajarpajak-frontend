<script setup lang="ts">
import type { Tenant, TenantCreate } from '~/types/api'

/**
 * Superadmin console for the institution lifecycle: create (+ first admin),
 quotas, WA contact, validity, activate/deactivate, export backup, delete.
 */
const emit = defineEmits<{ changed: [] }>()

const { apiFetch } = useApi()
const toast = useToast()

const { data: tenants, refresh: refreshTenants } = useAsyncData(
  'admin-instance-list',
  () => apiFetch<Tenant[]>('/api/v1/tenants'),
  { default: () => [] as Tenant[] }
)

function todayPlus(months: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

// --- create modal ---
const createOpen = ref(false)

function openCreate() {
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

function closeStatus() {
  statusOpen.value = false
}

function closeEdit() {
  editOpen.value = false
}

function closeDelete() {
  deleteOpen.value = false
}

function openBackup(tenant: Tenant) {
  deleteTarget.value = tenant
  deleteOpen.value = true
  void downloadBackup()
}
const creating = ref(false)
const typeOptions = [
  { label: 'SMK', value: 'smk' },
  { label: 'Kampus', value: 'kampus' },
  { label: 'Lembaga Pelatihan', value: 'lembaga' },
  { label: 'PT / Perusahaan', value: 'pt' }
]

const form = reactive({
  name: '',
  slug: '',
  type: 'smk',
  contact_wa: '',
  masa_berlaku_bulan: 12,
  max_guru: null as number | null,
  max_siswa: null as number | null,
  max_kelas: null as number | null,
  admin_email: '',
  admin_full_name: ''
})

function validateCreate() {
  const errors: { name: string, message: string }[] = []
  if (!form.name) errors.push({ name: 'name', message: 'Nama instansi wajib diisi' })
  if (!/^[a-z0-9][a-z0-9-]*$/.test(form.slug)) {
    errors.push({ name: 'slug', message: 'Kode instansi: huruf kecil, angka, tanda minus' })
  }
  if (form.admin_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.admin_email)) {
    errors.push({ name: 'admin_email', message: 'Email admin tidak valid' })
  }
  if (!form.admin_full_name) errors.push({ name: 'admin_full_name', message: 'Nama admin wajib diisi' })
  return errors
}

async function onCreate() {
  creating.value = true
  try {
    const payload: TenantCreate = {
      name: form.name,
      slug: form.slug,
      type: form.type as TenantCreate['type'],
      contact_wa: form.contact_wa || null,
      masa_berlaku_bulan: form.masa_berlaku_bulan,
      max_guru: form.max_guru,
      max_siswa: form.max_siswa,
      max_kelas: form.max_kelas,
      admin: {
        email: form.admin_email,
        full_name: form.admin_full_name
      }
    }
    await apiFetch<Tenant>('/api/v1/tenants', { method: 'POST', body: payload })
    toast.add({
      title: 'Instansi dibuat',
      description: `Admin pertama: ${form.admin_email} — kata sandi awal Password123!, wajib diganti saat login pertama.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    createOpen.value = false
    Object.assign(form, {
      name: '', slug: '', type: 'smk', contact_wa: '', masa_berlaku_bulan: 12,
      max_guru: null, max_siswa: null, max_kelas: null, admin_email: '', admin_full_name: ''
    })
    await refreshTenants()
    emit('changed')
  } catch (error) {
    toast.add({ title: 'Gagal membuat instansi', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    creating.value = false
  }
}

// --- status modal (activate/deactivate with reason) ---
const statusTarget = ref<Tenant | null>(null)
const statusOpen = ref(false)
const statusReason = ref('')
const statusBusy = ref(false)

function openStatus(tenant: Tenant) {
  statusTarget.value = tenant
  statusReason.value = ''
  statusOpen.value = true
}

async function onToggleStatus() {
  const target = statusTarget.value
  if (!target || !statusReason.value) {
    toast.add({ title: 'Isi alasan terlebih dahulu', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  statusBusy.value = true
  try {
    await apiFetch(`/api/v1/tenants/${target.id}/${target.is_active ? 'deactivate' : 'activate'}`, {
      method: 'POST',
      body: { reason: statusReason.value }
    })
    toast.add({
      title: target.is_active ? 'Instansi dinonaktifkan' : 'Instansi diaktifkan',
      description: target.is_active
        ? 'Semua akun instansi ini tidak bisa login; data tetap tersimpan.'
        : 'Akun instansi bisa login kembali.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    statusOpen.value = false
    await refreshTenants()
    emit('changed')
  } catch (error) {
    toast.add({ title: 'Gagal mengubah status', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    statusBusy.value = false
  }
}

// --- quota/WA edit modal ---
const editTarget = ref<Tenant | null>(null)
const editOpen = ref(false)
const editBusy = ref(false)
const editForm = reactive({
  contact_wa: '',
  masa_berlaku_bulan: 12,
  max_guru: null as number | null,
  max_siswa: null as number | null,
  max_kelas: null as number | null
})

function openEdit(tenant: Tenant) {
  editTarget.value = tenant
  editForm.contact_wa = tenant.contact_wa ?? ''
  editForm.max_guru = tenant.max_guru
  editForm.max_siswa = tenant.max_siswa
  editForm.max_kelas = tenant.max_kelas
  editOpen.value = true
}

async function onSaveEdit() {
  const target = editTarget.value
  if (!target) return
  editBusy.value = true
  try {
    await apiFetch(`/api/v1/tenants/${target.id}`, {
      method: 'PATCH',
      body: {
        contact_wa: editForm.contact_wa || null,
        masa_berlaku_bulan: editForm.masa_berlaku_bulan,
        max_guru: editForm.max_guru,
        max_siswa: editForm.max_siswa,
        max_kelas: editForm.max_kelas
      }
    })
    toast.add({ title: 'Pengaturan instansi tersimpan', color: 'success', icon: 'i-lucide-check-circle' })
    editOpen.value = false
    await refreshTenants()
    emit('changed')
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    editBusy.value = false
  }
}

// --- delete modal ---
const deleteTarget = ref<Tenant | null>(null)
const deleteOpen = ref(false)
const deleteConfirm = ref('')
const deleteBusy = ref(false)

function openDelete(tenant: Tenant) {
  deleteTarget.value = tenant
  deleteConfirm.value = ''
  deleteOpen.value = true
}

async function downloadBackup() {
  const target = deleteTarget.value
  if (!target) return
  try {
    const blob = await apiFetch<Blob>(`/api/v1/tenants/${target.id}/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_${target.slug}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Backup JSON diunduh', color: 'success', icon: 'i-lucide-download' })
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh backup', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function onDelete() {
  const target = deleteTarget.value
  if (!target) return
  if (deleteConfirm.value !== target.slug) {
    toast.add({ title: `Ketik kode instansi "${target.slug}" untuk konfirmasi`, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  deleteBusy.value = true
  try {
    await apiFetch(`/api/v1/tenants/${target.id}`, {
      method: 'DELETE',
      body: { confirm_code: deleteConfirm.value }
    })
    toast.add({ title: 'Instansi dihapus permanen', color: 'success', icon: 'i-lucide-trash-2' })
    deleteOpen.value = false
    await refreshTenants()
    emit('changed')
  } catch (error) {
    toast.add({ title: 'Gagal menghapus', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    deleteBusy.value = false
  }
}

const typeLabel: Record<string, string> = {
  smk: 'SMK',
  kampus: 'Kampus',
  lembaga: 'Lembaga',
  pt: 'PT'
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold text-default">Instansi</h2>
        <UButton icon="i-lucide-plus" label="Buat Instansi" @click="openCreate" />
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="tenant in tenants"
        :key="tenant.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <strong class="text-default">{{ tenant.name }}</strong>
            <UBadge color="neutral" variant="subtle">{{ typeLabel[tenant.type] ?? tenant.type }}</UBadge>
            <UBadge :color="tenant.is_active ? 'success' : 'error'" variant="subtle">
              {{ tenant.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
            <UBadge
              v-if="tenant.berlaku_sampai && new Date(tenant.berlaku_sampai) < new Date()"
              color="warning"
              variant="subtle"
            >
              Masa Berlaku Habis
            </UBadge>
          </div>
          <p class="text-xs text-muted">
            Kode: {{ tenant.slug }} · WA: {{ tenant.contact_wa || '-' }} · Berlaku s.d.
            {{ formatDate(tenant.berlaku_sampai) }} · Kuota
            G{{ tenant.max_guru ?? '∞' }} / S{{ tenant.max_siswa ?? '∞' }} / K{{ tenant.max_kelas ?? '∞' }}
          </p>
          <p v-if="!tenant.is_active" class="text-xs text-error">
            Alasan: {{ tenant.deactivated_reason }}
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <UButton icon="i-lucide-settings-2" size="xs" label="Atur" @click="openEdit(tenant)" />
          <UButton
            icon="i-lucide-power"
            size="xs"
            :color="tenant.is_active ? 'error' : 'success'"
            variant="soft"
            :label="tenant.is_active ? 'Nonaktifkan' : 'Aktifkan'"
            @click="openStatus(tenant)"
          />
          <UButton icon="i-lucide-download" size="xs" color="neutral" variant="soft" label="Backup" @click="openBackup(tenant)" />
          <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="soft" label="Hapus" @click="openDelete(tenant)" />
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <UModal v-model:open="createOpen" title="Buat Instansi" description="Instansi + akun admin pertama dibuat bersamaan.">
      <template #body>
        <UForm :state="form" :validate="validateCreate" class="space-y-3" @submit="onCreate">
          <UFormField name="name" label="Nama Instansi" required>
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField name="slug" label="Kode Instansi (slug)" required>
              <UInput v-model="form.slug" class="w-full" placeholder="smk-contoh" />
            </UFormField>
            <UFormField name="type" label="Tipe" required>
              <USelect v-model="form.type" :items="typeOptions" class="w-full" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField name="contact_wa" label="Kontak WhatsApp">
              <UInput v-model="form.contact_wa" class="w-full" placeholder="0812-xxxx" />
            </UFormField>
            <UFormField name="masa_berlaku_bulan" label="Masa Berlaku (bulan)" required>
              <UInputNumber v-model="form.masa_berlaku_bulan" :min="1" :max="120" class="w-full" />
            </UFormField>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <UFormField name="max_guru" label="Maks Guru">
              <UInputNumber v-model="form.max_guru" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
            <UFormField name="max_siswa" label="Maks Siswa">
              <UInputNumber v-model="form.max_siswa" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
            <UFormField name="max_kelas" label="Maks Kelas">
              <UInputNumber v-model="form.max_kelas" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
          </div>
          <USeparator label="Admin Pertama" />
          <div class="grid grid-cols-2 gap-3">
            <UFormField name="admin_full_name" label="Nama Admin" required>
              <UInput v-model="form.admin_full_name" class="w-full" />
            </UFormField>
            <UFormField name="admin_email" label="Email Admin" required>
              <UInput v-model="form.admin_email" class="w-full" />
            </UFormField>
          </div>
          <p class="text-xs text-muted">
            Kata sandi awal admin: <code>Password123!</code> — wajib diganti saat login pertama.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" type="button" @click="closeCreate" />
            <UButton type="submit" label="Buat Instansi" :loading="creating" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Status modal -->
    <UModal v-model:open="statusOpen" :title="statusTarget?.is_active ? 'Nonaktifkan Instansi' : 'Aktifkan Instansi'">
      <template #body>
        <p class="text-sm">
          <template v-if="statusTarget?.is_active">
            Semua akun instansi ini langsung tidak bisa login; datanya tetap tersimpan.
          </template>
          <template v-else>
            Akun instansi bisa login kembali. Re-aktivasi hanya bisa dilakukan superadmin.
          </template>
        </p>
        <UFormField class="mt-3" label="Alasan / Catatan" required>
          <UTextarea v-model="statusReason" :rows="3" class="w-full" placeholder="Contoh: berhenti berlangganan" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeStatus" />
          <UButton
            :label="statusTarget?.is_active ? 'Nonaktifkan' : 'Aktifkan'"
            :color="statusTarget?.is_active ? 'error' : 'success'"
            :loading="statusBusy"
            @click="onToggleStatus"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit settings modal -->
    <UModal v-model:open="editOpen" title="Pengaturan Instansi">
      <template #body>
        <div class="space-y-3">
          <UFormField label="Kontak WhatsApp">
            <UInput v-model="editForm.contact_wa" class="w-full" />
          </UFormField>
          <UFormField label="Perpanjang Masa Berlaku (bulan dari sekarang)">
            <UInputNumber v-model="editForm.masa_berlaku_bulan" :min="1" :max="120" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-3 gap-3">
            <UFormField label="Maks Guru">
              <UInputNumber v-model="editForm.max_guru" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
            <UFormField label="Maks Siswa">
              <UInputNumber v-model="editForm.max_siswa" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
            <UFormField label="Maks Kelas">
              <UInputNumber v-model="editForm.max_kelas" :min="0" placeholder="∞" class="w-full" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeEdit" />
          <UButton label="Simpan" :loading="editBusy" @click="onSaveEdit" />
        </div>
      </template>
    </UModal>

    <!-- Delete modal -->
    <UModal v-model:open="deleteOpen" title="Hapus Instansi Permanen">
      <template #body>
        <div class="space-y-3 text-sm">
          <p>
            Hapus instansi <strong>{{ deleteTarget?.name }}</strong> beserta seluruh datanya
            (akun, kelas, dokumen, nilai). Tindakan ini <strong>tidak bisa dibatalkan</strong>.
          </p>
          <p>Unduh backup JSON terlebih dahulu bila diperlukan.</p>
          <UButton icon="i-lucide-download" size="xs" label="Unduh Backup JSON" @click="downloadBackup" />
          <UFormField :label="`Ketik kode instansi (${deleteTarget?.slug}) untuk konfirmasi`" required>
            <UInput v-model="deleteConfirm" class="w-full" :placeholder="deleteTarget?.slug" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeDelete" />
          <UButton label="Hapus Permanen" color="error" :disabled="deleteConfirm !== deleteTarget?.slug" :loading="deleteBusy" @click="onDelete" />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
