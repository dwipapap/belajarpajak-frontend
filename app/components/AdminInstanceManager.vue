<script setup lang="ts">
import type { Tenant, TenantCreate, TenantSummary, TenantUpdate, User, UserListResponse } from '~/types/api'

/**
 * Superadmin console for the institution lifecycle: create (+ first admin),
 * quotas, WA contact, validity, activate/deactivate, export backup, delete.
 */
const emit = defineEmits<{ changed: [] }>()

const { apiFetch } = useApi()
const toast = useToast()

const { data: tenants, refresh: refreshTenants } = useAsyncData(
  'admin-instance-list',
  () => apiFetch<Tenant[]>('/api/v1/tenants'),
  { default: () => [] as Tenant[] }
)

const typeOptions = [
  { label: 'SMK', value: 'smk' },
  { label: 'Kampus', value: 'kampus' },
  { label: 'Lembaga Pelatihan', value: 'lembaga' },
  { label: 'PT / Perusahaan', value: 'pt' }
]

const typeLabel: Record<string, string> = {
  smk: 'SMK',
  kampus: 'Kampus',
  lembaga: 'Lembaga Pelatihan',
  pt: 'PT / Perusahaan'
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

function closeDetail() {
  detailOpen.value = false
}

function closeReset() {
  resetOpen.value = false
}

const creating = ref(false)

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
const unlimitedGuru = ref(true)
const unlimitedSiswa = ref(true)
const unlimitedKelas = ref(true)

function isSlugTaken(slug: string) {
  const needle = slug.trim().toLowerCase()
  if (!needle) return false
  return (tenants.value ?? []).some(t => t.slug.toLowerCase() === needle)
}

function validateCreate() {
  const errors: { name: string, message: string }[] = []
  if (!form.name) errors.push({ name: 'name', message: 'Nama instansi wajib diisi' })
  if (!/^[a-z0-9][a-z0-9-]*$/.test(form.slug)) {
    errors.push({ name: 'slug', message: 'Kode instansi: huruf kecil, angka, tanda minus' })
  } else if (isSlugTaken(form.slug)) {
    errors.push({ name: 'slug', message: `Kode "${form.slug.trim().toLowerCase()}" sudah dipakai instansi lain — pilih kode yang unik` })
  }
  if (form.admin_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.admin_email)) {
    errors.push({ name: 'email', message: 'Email admin tidak valid' })
  }
  if (!form.admin_full_name) errors.push({ name: 'admin_full_name', message: 'Nama admin wajib diisi' })
  if (!unlimitedGuru.value && (form.max_guru === null || form.max_guru < 0)) {
    errors.push({ name: 'max_guru', message: 'Isi batas guru atau aktifkan "Tanpa batas"' })
  }
  if (!unlimitedSiswa.value && (form.max_siswa === null || form.max_siswa < 0)) {
    errors.push({ name: 'max_siswa', message: 'Isi batas siswa atau aktifkan "Tanpa batas"' })
  }
  if (!unlimitedKelas.value && (form.max_kelas === null || form.max_kelas < 0)) {
    errors.push({ name: 'max_kelas', message: 'Isi batas kelas atau aktifkan "Tanpa batas"' })
  }
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
      max_guru: unlimitedGuru.value ? null : form.max_guru,
      max_siswa: unlimitedSiswa.value ? null : form.max_siswa,
      max_kelas: unlimitedKelas.value ? null : form.max_kelas,
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
    unlimitedGuru.value = true
    unlimitedSiswa.value = true
    unlimitedKelas.value = true
    await refreshTenants()
    emit('changed')
  } catch (error) {
    toast.add({ title: 'Gagal membuat instansi', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    creating.value = false
  }
}

// --- detail drawer (quota, validity, admins, history) ---
const detailTarget = ref<Tenant | null>(null)
const detailOpen = ref(false)
const detailSummary = ref<TenantSummary | null>(null)
const detailSummaryLoading = ref(false)
const detailSummaryMissing = ref(false)
const detailAdmins = ref<User[]>([])
const detailAdminsLoading = ref(false)

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((end.getTime() - startOfToday.getTime()) / 86400000)
}

function expiryBadge(tenant: Tenant): { color: 'success' | 'warning' | 'error' | 'neutral', label: string } {
  const days = daysRemaining(tenant.berlaku_sampai)
  if (days === null) return { color: 'neutral', label: 'Tanpa batas waktu' }
  if (days < 0) return { color: 'error', label: `Habis ${Math.abs(days)} hari lalu — login diblokir` }
  if (days <= 30) return { color: 'warning', label: `Sisa ${days} hari` }
  return { color: 'success', label: `Sisa ${days} hari` }
}

const detailExpiry = computed(() => detailTarget.value ? expiryBadge(detailTarget.value) : null)
const detailDays = computed(() => detailTarget.value ? daysRemaining(detailTarget.value.berlaku_sampai) : null)

interface QuotaRow {
  key: string
  label: string
  used: number | null
  limit: number | null
}

const detailQuotas = computed<QuotaRow[]>(() => {
  const t = detailTarget.value
  if (!t) return []
  const s = detailSummary.value
  return [
    { key: 'guru', label: 'Guru', used: s?.guru?.used ?? null, limit: s?.guru?.limit ?? t.max_guru },
    { key: 'siswa', label: 'Siswa', used: s?.siswa?.used ?? null, limit: s?.siswa?.limit ?? t.max_siswa },
    { key: 'kelas', label: 'Kelas', used: s?.kelas?.used ?? null, limit: s?.kelas?.limit ?? t.max_kelas }
  ]
})

function quotaPercent(used: number | null, limit: number | null) {
  if (used === null || limit === null || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function isQuotaFull(used: number | null, limit: number | null) {
  if (limit === null) return false
  if (limit <= 0) return true
  return used !== null && used >= limit
}

async function openDetail(tenant: Tenant) {
  detailTarget.value = tenant
  detailSummary.value = null
  detailSummaryMissing.value = false
  detailAdmins.value = []
  detailOpen.value = true
  await Promise.all([loadDetailSummary(tenant.id), loadDetailAdmins(tenant.id)])
}

async function loadDetailSummary(tenantId: number) {
  detailSummaryLoading.value = true
  try {
    detailSummary.value = await apiFetch<TenantSummary>(`/api/v1/tenants/${tenantId}/summary`)
    detailSummaryMissing.value = false
  } catch {
    // Backend may not provide the summary endpoint yet — fall back to list data.
    detailSummary.value = null
    detailSummaryMissing.value = true
  } finally {
    detailSummaryLoading.value = false
  }
}

async function loadDetailAdmins(tenantId: number) {
  detailAdminsLoading.value = true
  try {
    const res = await apiFetch<UserListResponse>(`/api/v1/users?tenant_id=${tenantId}&role=admin&page=1&size=100`)
    detailAdmins.value = res.items ?? []
  } catch {
    detailAdmins.value = []
  } finally {
    detailAdminsLoading.value = false
  }
}

// --- reset password per admin (same endpoint as user table) ---
const resetTarget = ref<User | null>(null)
const resetOpen = ref(false)
const resetPassword = ref('')
const resetBusy = ref(false)

function openResetAdmin(user: User) {
  resetTarget.value = user
  resetPassword.value = ''
  resetOpen.value = true
}

async function onResetAdmin() {
  const target = resetTarget.value
  if (!target) return
  if (resetPassword.value.length < 8) {
    toast.add({ title: 'Kata sandi minimal 8 karakter', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  resetBusy.value = true
  try {
    await apiFetch(`/api/v1/users/${target.id}`, { method: 'PATCH', body: { password: resetPassword.value } })
    toast.add({
      title: 'Kata sandi direset',
      description: `Bagikan kata sandi baru kepada ${target.full_name}.`,
      color: 'success',
      icon: 'i-lucide-key-round'
    })
    resetOpen.value = false
  } catch (error) {
    toast.add({ title: 'Gagal mereset sandi', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    resetBusy.value = false
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

// --- quota/WA/edit modal ---
const editTarget = ref<Tenant | null>(null)
const editOpen = ref(false)
const editBusy = ref(false)
const editForm = reactive({
  name: '',
  type: 'smk',
  contact_wa: '',
  masa_berlaku_bulan: null as number | null,
  berlaku_dari: '',
  berlaku_sampai: '',
  max_guru: null as number | null,
  max_siswa: null as number | null,
  max_kelas: null as number | null
})
const editDatesTouched = ref(false)
const editUnlimitedGuru = ref(true)
const editUnlimitedSiswa = ref(true)
const editUnlimitedKelas = ref(true)

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = parseDateSafe(iso)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toIsoDate(input: string): string | null {
  if (!input) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(input.trim()) ? input.trim() : null
}

function openEdit(tenant: Tenant) {
  editTarget.value = tenant
  editForm.name = tenant.name
  editForm.type = tenant.type
  editForm.contact_wa = tenant.contact_wa ?? ''
  // Preload current values; extension left empty so nothing extends by accident.
  editForm.masa_berlaku_bulan = null
  editForm.berlaku_dari = toDateInput(tenant.berlaku_dari)
  editForm.berlaku_sampai = toDateInput(tenant.berlaku_sampai)
  editDatesTouched.value = false
  editForm.max_guru = tenant.max_guru
  editForm.max_siswa = tenant.max_siswa
  editForm.max_kelas = tenant.max_kelas
  editUnlimitedGuru.value = tenant.max_guru === null
  editUnlimitedSiswa.value = tenant.max_siswa === null
  editUnlimitedKelas.value = tenant.max_kelas === null
  editOpen.value = true
}

function addMonths(base: Date, months: number) {
  const d = new Date(base)
  d.setMonth(d.getMonth() + months)
  return d
}

function parseDateSafe(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Durasi kalender penuh dari awal s.d. akhir (4 Okt 2026 → 4 Okt 2027 = 12). */
function monthsBetween(dari: string | null | undefined, sampai: string | null | undefined): number | null {
  const a = parseDateSafe(dari)
  const b = parseDateSafe(sampai)
  if (!a || !b) return null
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m -= 1
  return m >= 0 ? m : 0
}

/**
 * Teks periode tahan-null untuk kartu, dossier detail, dan modal Atur.
 * - Lengkap: "Periode: 4 Okt 2026 → 4 Okt 2027 (12 bulan, sisa 337 hari)"
 * - Awal tak tercatat: "s.d. 4 Okt 2027 (awal periode tak tercatat)"
 */
function periodText(dari: string | null | undefined, sampai: string | null | undefined): string {
  const endDate = parseDateSafe(sampai)
  if (!endDate) return 'Tanpa batas waktu'
  const sampaiStr = formatDate(sampai ?? null)
  const days = daysRemaining(sampai ?? null)
  const sisa = days === null ? null : (days < 0 ? `habis ${Math.abs(days)} hari lalu` : `sisa ${days} hari`)
  const startDate = parseDateSafe(dari)
  if (!startDate) {
    return sisa ? `s.d. ${sampaiStr} (awal periode tak tercatat, ${sisa})` : `s.d. ${sampaiStr} (awal periode tak tercatat)`
  }
  const dariStr = formatDate(dari ?? null)
  const months = monthsBetween(dari ?? null, sampai ?? null)
  const durasi = months === null ? '' : `${months} bulan`
  if (durasi && sisa) return `Periode: ${dariStr} → ${sampaiStr} (${durasi}, ${sisa})`
  if (durasi) return `Periode: ${dariStr} → ${sampaiStr} (${durasi})`
  return `Periode: ${dariStr} → ${sampaiStr}`
}

/** Basis perpanjangan = max(berlaku_sampai, hari ini), sesuai aturan backend. */
function extensionBase(sampai: string | null | undefined): Date {
  const today = startOfToday()
  const end = parseDateSafe(sampai)
  if (!end) return today
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return endDay.getTime() >= today.getTime() ? endDay : today
}

const editBaseDate = computed(() => {
  return extensionBase(editTarget.value?.berlaku_sampai ?? null)
})

const editExpiryPreview = computed(() => {
  const t = editTarget.value
  if (!t || !editForm.masa_berlaku_bulan || editForm.masa_berlaku_bulan <= 0) return null
  // Preview client saja; backend yang final: max(berlaku_sampai, hari_ini) + N bulan.
  return addMonths(editBaseDate.value, editForm.masa_berlaku_bulan)
})

// Preview live dari kalender: "Periode A → B (N bulan, sisa X hari)".
const editPeriodPreview = computed(() => {
  if (!editForm.berlaku_dari && !editForm.berlaku_sampai) return null
  const dari = toIsoDate(editForm.berlaku_dari)
  const sampai = toIsoDate(editForm.berlaku_sampai)
  return periodText(dari, sampai)
})

function onQuickAddMonths(months: number) {
  const baseInput = toIsoDate(editForm.berlaku_sampai)
  const base = extensionBase(baseInput)
  const next = addMonths(base, months)
  editForm.berlaku_sampai = toDateInput(next.toISOString())
  editDatesTouched.value = true
}

// Periode dossier: utamakan ringkasan bila backend sudah mengirim berlaku_dari.
const detailDari = computed(() => detailSummary.value?.berlaku_dari ?? detailTarget.value?.berlaku_dari ?? null)
const detailPeriodText = computed(() => periodText(detailDari.value, detailTarget.value?.berlaku_sampai ?? null))

async function onSaveEdit() {
  const target = editTarget.value
  if (!target) return
  if (!editForm.name.trim()) {
    toast.add({ title: 'Nama instansi wajib diisi', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  const dari = toIsoDate(editForm.berlaku_dari)
  const sampai = toIsoDate(editForm.berlaku_sampai)
  const datesChanged
    = editDatesTouched.value
    && (dari !== toDateInput(target.berlaku_dari) || sampai !== toDateInput(target.berlaku_sampai))
  if (editForm.berlaku_dari && !dari) {
    toast.add({ title: 'Tanggal mulai tidak valid (pakai format YYYY-MM-DD)', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  if (editForm.berlaku_sampai && !sampai) {
    toast.add({ title: 'Tanggal berakhir tidak valid (pakai format YYYY-MM-DD)', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  if (dari && sampai && dari > sampai) {
    toast.add({ title: 'Tanggal mulai tidak boleh sesudah tanggal berakhir', description: `Mulai: ${dari}, berakhir: ${sampai}.`, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  editBusy.value = true
  try {
    const body: TenantUpdate & { berlaku_dari?: string | null, berlaku_sampai?: string | null } = {
      contact_wa: editForm.contact_wa || null,
      max_guru: editUnlimitedGuru.value ? null : editForm.max_guru,
      max_siswa: editUnlimitedSiswa.value ? null : editForm.max_siswa,
      max_kelas: editUnlimitedKelas.value ? null : editForm.max_kelas
    }
    if (editForm.name.trim() !== target.name) body.name = editForm.name.trim()
    if (editForm.type !== target.type) body.type = editForm.type as TenantUpdate['type']
    if (datesChanged) {
      // Tanggal eksplisit menang atas stepper bulan (kontrak backend).
      if (dari) body.berlaku_dari = dari
      if (sampai) body.berlaku_sampai = sampai
    } else if (editForm.masa_berlaku_bulan && editForm.masa_berlaku_bulan > 0) {
      body.masa_berlaku_bulan = editForm.masa_berlaku_bulan
    }
    await apiFetch(`/api/v1/tenants/${target.id}`, { method: 'PATCH', body })
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

async function downloadBackup(tenant?: Tenant | null) {
  const target = tenant ?? deleteTarget.value
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

function openBackup(tenant: Tenant) {
  void downloadBackup(tenant)
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
              v-if="tenant.berlaku_sampai && daysRemaining(tenant.berlaku_sampai) !== null && (daysRemaining(tenant.berlaku_sampai) ?? 0) < 0"
              color="error"
              variant="subtle"
            >
              Masa Berlaku Habis
            </UBadge>
            <UBadge
              v-else-if="tenant.berlaku_sampai && (daysRemaining(tenant.berlaku_sampai) ?? 999) <= 30"
              color="warning"
              variant="subtle"
            >
              Sisa {{ daysRemaining(tenant.berlaku_sampai) }} hari
            </UBadge>
            <UBadge
              v-if="(tenant.max_guru !== null && tenant.max_guru <= 0) || (tenant.max_siswa !== null && tenant.max_siswa <= 0) || (tenant.max_kelas !== null && tenant.max_kelas <= 0)"
              color="warning"
              variant="subtle"
            >
              Kuota Penuh
            </UBadge>
          </div>
          <p class="text-xs text-muted">
            Kode: {{ tenant.slug }} · WA: {{ tenant.contact_wa || '-' }} · {{ periodText(tenant.berlaku_dari, tenant.berlaku_sampai) }} · Kuota
            G{{ tenant.max_guru ?? '∞' }} / S{{ tenant.max_siswa ?? '∞' }} / K{{ tenant.max_kelas ?? '∞' }}
          </p>
          <p v-if="!tenant.is_active" class="text-xs text-error">
            Alasan: {{ tenant.deactivated_reason || '—' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <UButton icon="i-lucide-eye" size="xs" color="neutral" variant="soft" label="Detail" @click="openDetail(tenant)" />
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
      <p v-if="!tenants.length" class="py-4 text-center text-sm text-muted">Belum ada instansi.</p>
    </div>

    <!-- Create modal -->
    <UModal v-model:open="createOpen" title="Buat Instansi" description="Instansi + akun admin pertama dibuat bersamaan.">
      <template #body>
        <UForm :state="form" :validate="validateCreate" class="space-y-3" @submit="onCreate">
          <UFormField name="name" label="Nama Instansi" required>
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField name="slug" label="Kode Instansi (slug)" required help="Huruf kecil, angka, tanda minus. Harus unik.">
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
            <div>
              <UFormField name="max_guru" label="Maks Guru">
                <UInputNumber v-model="form.max_guru" :min="0" :disabled="unlimitedGuru" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="unlimitedGuru" label="Tanpa batas" class="mt-1" />
            </div>
            <div>
              <UFormField name="max_siswa" label="Maks Siswa">
                <UInputNumber v-model="form.max_siswa" :min="0" :disabled="unlimitedSiswa" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="unlimitedSiswa" label="Tanpa batas" class="mt-1" />
            </div>
            <div>
              <UFormField name="max_kelas" label="Maks Kelas">
                <UInputNumber v-model="form.max_kelas" :min="0" :disabled="unlimitedKelas" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="unlimitedKelas" label="Tanpa batas" class="mt-1" />
            </div>
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

    <!-- Detail modal -->
    <UModal v-model:open="detailOpen" :title="`Detail: ${detailTarget?.name ?? ''}`" description="Kuota, masa berlaku, admin, dan riwayat status.">
      <template #body>
        <div v-if="detailTarget" class="space-y-4 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle">{{ typeLabel[detailTarget.type] ?? detailTarget.type }}</UBadge>
            <UBadge :color="detailTarget.is_active ? 'success' : 'error'" variant="subtle">
              {{ detailTarget.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
            <UBadge v-if="detailExpiry" :color="detailExpiry.color" variant="subtle">{{ detailExpiry.label }}</UBadge>
          </div>

          <div>
            <h3 class="mb-1 font-semibold text-default">Kuota Pemakaian</h3>
            <p v-if="detailSummaryLoading" class="text-xs text-muted">Memuat ringkasan kuota…</p>
            <p v-else-if="detailSummaryMissing" class="mb-2 text-xs text-muted">
              Ringkasan pemakaian belum tersedia (endpoint ringkasan belum ada) — memuat data batas dari daftar instansi.
            </p>
            <div class="space-y-3">
              <div v-for="q in detailQuotas" :key="q.key">
                <div class="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span class="font-medium">{{ q.label }}: {{ q.used ?? '…' }} / {{ q.limit ?? '∞' }}</span>
                  <UBadge v-if="isQuotaFull(q.used, q.limit)" color="warning" variant="subtle">Penuh</UBadge>
                  <UBadge v-else-if="q.limit === null" color="neutral" variant="subtle">Tanpa batas</UBadge>
                </div>
                <UProgress v-if="q.limit !== null && q.limit > 0" :value="quotaPercent(q.used, q.limit)" :max="100" />
                <p v-else class="text-xs text-muted">Pemakaian {{ q.used ?? 'belum termuat' }} — tidak dibatasi.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-1 font-semibold text-default">Masa Berlaku</h3>
            <p class="text-xs">
              {{ detailPeriodText }}
              <template v-if="detailDays !== null && detailDays < 0"> — login seluruh akun instansi ini diblokir.</template>
              <template v-else-if="detailDays !== null && detailDays <= 30"> — segera perpanjang bila diperlukan.</template>
            </p>
          </div>

          <div>
            <h3 class="mb-1 font-semibold text-default">Admin Instansi</h3>
            <p v-if="detailAdminsLoading" class="text-xs text-muted">Memuat daftar admin…</p>
            <p v-else-if="!detailAdmins.length" class="text-xs text-muted">Belum ada data admin termuat.</p>
            <ul v-else class="space-y-2">
              <li v-for="a in detailAdmins" :key="a.id" class="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 px-2 py-1.5">
                <span class="text-xs">{{ a.full_name }} · {{ a.email }}</span>
                <UButton icon="i-lucide-key-round" size="xs" color="neutral" variant="soft" label="Reset Sandi" @click="openResetAdmin(a)" />
              </li>
            </ul>
          </div>

          <div>
            <h3 class="mb-1 font-semibold text-default">Riwayat Alasan Nonaktif</h3>
            <p class="text-xs">{{ detailTarget.deactivated_reason || 'Tidak ada riwayat penonaktifan tercatat.' }}</p>
            <p v-if="!detailTarget.is_active" class="mt-1 text-xs text-error">
              Instansi nonaktif — semua akun instansi ini tidak bisa login; data tetap tersimpan.
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Tutup" color="neutral" variant="ghost" @click="closeDetail" />
          <UButton v-if="detailTarget" label="Atur" icon="i-lucide-settings-2" @click="detailOpen = false; openEdit(detailTarget)" />
        </div>
      </template>
    </UModal>

    <!-- Reset admin password modal -->
    <UModal v-model:open="resetOpen" title="Reset Kata Sandi Admin">
      <template #body>
        <div class="space-y-3 text-sm">
          <p>Reset kata sandi <strong>{{ resetTarget?.full_name }}</strong> ({{ resetTarget?.email }}). Bagikan kata sandi baru ke yang bersangkutan.</p>
          <UFormField label="Kata Sandi Baru" required help="Minimal 8 karakter.">
            <UInput v-model="resetPassword" type="password" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeReset" />
          <UButton label="Reset" :loading="resetBusy" @click="onResetAdmin" />
        </div>
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
    <UModal v-model:open="editOpen" :title="`Atur: ${editTarget?.name ?? ''}`">
      <template #body>
        <div class="space-y-3">
          <UFormField label="Nama Instansi" required>
            <UInput v-model="editForm.name" class="w-full" />
          </UFormField>
          <UFormField label="Tipe" required>
            <USelect v-model="editForm.type" :items="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="Kontak WhatsApp">
            <UInput v-model="editForm.contact_wa" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Mulai berlaku" help="Pilih tanggal mulai periode via kalender.">
              <UInput v-model="editForm.berlaku_dari" type="date" class="w-full" @update:model-value="editDatesTouched = true" />
            </UFormField>
            <UFormField label="Berakhir" help="Pilih tanggal akhir periode via kalender.">
              <UInput v-model="editForm.berlaku_sampai" type="date" class="w-full" @update:model-value="editDatesTouched = true" />
            </UFormField>
          </div>
          <p v-if="editPeriodPreview" class="text-xs text-muted">{{ editPeriodPreview }}</p>
          <UFormField label="Atau tambah cepat (jalan pintas)" help="Menggeser tanggal Berakhir dari max(berakhir saat ini, hari ini).">
            <div class="flex flex-wrap gap-1">
              <UButton size="xs" color="neutral" variant="soft" label="+1 bulan" @click="onQuickAddMonths(1)" />
              <UButton size="xs" color="neutral" variant="soft" label="+3 bulan" @click="onQuickAddMonths(3)" />
              <UButton size="xs" color="neutral" variant="soft" label="+6 bulan" @click="onQuickAddMonths(6)" />
              <UButton size="xs" color="neutral" variant="soft" label="+12 bulan" @click="onQuickAddMonths(12)" />
            </div>
          </UFormField>
          <UFormField label="Tambah masa berlaku (bulan, dihitung dari akhir masa aktif)" help="Jalan pintas lama: dihitung dari tanggal berakhir aktif (atau hari ini bila sudah habis). Kosongkan bila tidak ingin memperpanjang. Diabaikan bila kalender di atas diubah — tanggal eksplisit yang dikirim. Hasil akhir mengikuti backend.">
            <UInputNumber v-model="editForm.masa_berlaku_bulan" :min="1" :max="120" placeholder="Tidak diperpanjang" class="w-full" />
          </UFormField>
          <p class="text-xs text-muted">
            Berlaku s.d. {{ formatDate(editTarget?.berlaku_sampai ?? null) }}
            <template v-if="editExpiryPreview"> → menjadi {{ formatDate(editExpiryPreview.toISOString()) }}</template>
            <template v-else> → tidak berubah</template>
          </p>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <UFormField label="Maks Guru">
                <UInputNumber v-model="editForm.max_guru" :min="0" :disabled="editUnlimitedGuru" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="editUnlimitedGuru" label="Tanpa batas" class="mt-1" />
            </div>
            <div>
              <UFormField label="Maks Siswa">
                <UInputNumber v-model="editForm.max_siswa" :min="0" :disabled="editUnlimitedSiswa" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="editUnlimitedSiswa" label="Tanpa batas" class="mt-1" />
            </div>
            <div>
              <UFormField label="Maks Kelas">
                <UInputNumber v-model="editForm.max_kelas" :min="0" :disabled="editUnlimitedKelas" placeholder="∞" class="w-full" />
              </UFormField>
              <UCheckbox v-model="editUnlimitedKelas" label="Tanpa batas" class="mt-1" />
            </div>
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
          <UButton icon="i-lucide-download" size="xs" label="Unduh Backup JSON" @click="downloadBackup()" />
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
