<script setup lang="ts">
import type {
  LearningSettings,
  ModuleCatalogItem,
  PengaturanRead,
  PengaturanUpdate,
  Tenant
} from '~/types/api'
import { ALL_MODULE_KEYS, FALLBACK_MODULE_CATALOG, MODULE_GROUPS } from '~/utils/modules'

definePageMeta({
  middleware: ['role'],
  roles: ['admin', 'superadmin']
})

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const isSuperadmin = computed(() => auth.user.value?.role === 'superadmin')

// Superadmin tenant selector
const tenants = ref<Tenant[]>([])
const selectedTenantId = ref<number | undefined>(
  route.query.tenant_id ? Number(route.query.tenant_id) : undefined
)

const tenantOptions = computed(() =>
  tenants.value.map(t => ({
    label: `${t.name} (${t.slug})`,
    value: t.id
  }))
)

const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const savingPaket = ref(false)

const data = ref<PengaturanRead | null>(null)

// Editable state
const draftEnabled = ref<string[]>([])
const draftAllowed = ref<string[]>([])
const draftSettings = reactive<LearningSettings>({
  show_auto_check_details: true,
  allow_late_submission: true,
  allow_resubmission: true
})

// Snapshots for dirty check
const initialEnabledJson = ref('[]')
const initialAllowedJson = ref('[]')
const initialSettingsJson = ref('{}')

function syncDraftFromData(res: PengaturanRead) {
  const orderedEnabled = ALL_MODULE_KEYS.filter(k => res.enabled_modules.includes(k))
  const orderedAllowed = ALL_MODULE_KEYS.filter(k => res.allowed_modules.includes(k))
  draftEnabled.value = [...orderedEnabled]
  draftAllowed.value = [...orderedAllowed]
  draftSettings.show_auto_check_details = res.settings.show_auto_check_details
  draftSettings.allow_late_submission = res.settings.allow_late_submission
  draftSettings.allow_resubmission = res.settings.allow_resubmission

  initialEnabledJson.value = JSON.stringify(orderedEnabled)
  initialAllowedJson.value = JSON.stringify(orderedAllowed)
  initialSettingsJson.value = JSON.stringify(draftSettings)
}

const isDirty = computed(() => {
  if (!data.value) return false
  const curEnabled = JSON.stringify(ALL_MODULE_KEYS.filter(k => draftEnabled.value.includes(k)))
  const curSettings = JSON.stringify(draftSettings)
  return curEnabled !== initialEnabledJson.value || curSettings !== initialSettingsJson.value
})

const isPaketDirty = computed(() => {
  if (!data.value || !isSuperadmin.value) return false
  const curAllowed = JSON.stringify(ALL_MODULE_KEYS.filter(k => draftAllowed.value.includes(k)))
  return curAllowed !== initialAllowedJson.value
})

async function loadTenantsIfNeeded() {
  if (!isSuperadmin.value) return
  try {
    const list = await apiFetch<Tenant[]>('/api/v1/tenants')
    tenants.value = list
    if (!selectedTenantId.value && list.length > 0) {
      selectedTenantId.value = list[0]!.id
    }
  } catch (err) {
    loadError.value = apiErrorMessage(err, 'Gagal memuat daftar instansi.')
  }
}

async function fetchPengaturan() {
  if (isSuperadmin.value && !selectedTenantId.value) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const query = isSuperadmin.value && selectedTenantId.value
      ? `?tenant_id=${selectedTenantId.value}`
      : ''
    const res = await apiFetch<PengaturanRead>(`/api/v1/pengaturan${query}`)
    data.value = res
    syncDraftFromData(res)
  } catch (err) {
    loadError.value = apiErrorMessage(err, 'Gagal memuat pengaturan instansi.')
  } finally {
    loading.value = false
  }
}

watch(selectedTenantId, async (newId) => {
  if (isSuperadmin.value && newId) {
    router.replace({ query: { ...route.query, tenant_id: String(newId) } })
    await fetchPengaturan()
  }
})

onMounted(async () => {
  await loadTenantsIfNeeded()
  await fetchPengaturan()
})

onBeforeRouteLeave(() => {
  if (isDirty.value || isPaketDirty.value) {
    return window.confirm('Ada perubahan pengaturan yang belum disimpan. Yakin ingin meninggalkan halaman ini?')
  }
})

const typeLabel: Record<string, string> = {
  smk: 'SMK',
  kampus: 'Kampus / Perguruan Tinggi',
  lembaga: 'Lembaga Pelatihan',
  pt: 'PT / Perusahaan'
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const catalog = computed<ModuleCatalogItem[]>(() =>
  data.value?.module_catalog?.length ? data.value.module_catalog : FALLBACK_MODULE_CATALOG
)

const groupedCatalog = computed(() =>
  MODULE_GROUPS.map(group => ({
    group,
    items: catalog.value.filter(item => item.group === group)
  }))
)

function isAllowedInPackage(key: string): boolean {
  if (isSuperadmin.value) return draftAllowed.value.includes(key)
  const allowed: readonly string[] = data.value?.allowed_modules ?? ALL_MODULE_KEYS
  return allowed.includes(key)
}

function isModuleChecked(key: string): boolean {
  return isAllowedInPackage(key) && draftEnabled.value.includes(key)
}

function toggleModule(key: string, checked: boolean) {
  if (!isAllowedInPackage(key)) return
  const next = new Set(draftEnabled.value)
  if (checked) next.add(key)
  else next.delete(key)
  draftEnabled.value = ALL_MODULE_KEYS.filter(k => next.has(k))
}

function togglePackageModule(key: string, checked: boolean) {
  const nextAllowed = new Set(draftAllowed.value)
  if (checked) {
    nextAllowed.add(key)
  } else {
    nextAllowed.delete(key)
    // Also uncheck in draftEnabled if removed from package
    draftEnabled.value = draftEnabled.value.filter(k => k !== key)
  }
  draftAllowed.value = ALL_MODULE_KEYS.filter(k => nextAllowed.has(k))
}

function selectAllPackageModules() {
  draftAllowed.value = [...ALL_MODULE_KEYS]
}

function enableAllAllowedModules() {
  const allowed = isSuperadmin.value
    ? draftAllowed.value
    : (data.value?.allowed_modules ?? [...ALL_MODULE_KEYS])
  draftEnabled.value = ALL_MODULE_KEYS.filter(k => allowed.includes(k))
}

function dependencyWarning(mod: ModuleCatalogItem): string | null {
  if (!isModuleChecked(mod.key)) return null
  if (!mod.depends_on || mod.depends_on.length === 0) return null
  // Dependency is satisfied if AT LEAST ONE of depends_on is currently checked
  const anyDepEnabled = mod.depends_on.some(depKey => isModuleChecked(depKey))
  if (anyDepEnabled) return null
  return mod.dependency_hint || `Modul ${mod.label} membutuhkan modul pendukung yang saat ini nonaktif.`
}

const activeDependencyWarnings = computed(() =>
  catalog.value
    .map(m => ({ key: m.key, label: m.label, warning: dependencyWarning(m) }))
    .filter((w): w is { key: string, label: string, warning: string } => Boolean(w.warning))
)

async function onSavePaket() {
  if (!isSuperadmin.value || !selectedTenantId.value) return
  savingPaket.value = true
  try {
    const res = await apiFetch<PengaturanRead>(
      `/api/v1/pengaturan/paket?tenant_id=${selectedTenantId.value}`,
      {
        method: 'PATCH',
        body: { allowed_modules: draftAllowed.value }
      }
    )
    data.value = res
    syncDraftFromData(res)
    toast.add({
      title: 'Paket modul diperbarui',
      description: `Paket modul untuk ${res.profile.name} berhasil disimpan.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (err) {
    toast.add({
      title: 'Gagal menyimpan paket modul',
      description: apiErrorMessage(err),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingPaket.value = false
  }
}

async function onSavePengaturan() {
  if (!data.value) return
  saving.value = true
  try {
    // If superadmin also modified Paket Modul, save package first
    if (isSuperadmin.value && isPaketDirty.value && selectedTenantId.value) {
      await apiFetch<PengaturanRead>(
        `/api/v1/pengaturan/paket?tenant_id=${selectedTenantId.value}`,
        {
          method: 'PATCH',
          body: { allowed_modules: draftAllowed.value }
        }
      )
    }

    const query = isSuperadmin.value && selectedTenantId.value
      ? `?tenant_id=${selectedTenantId.value}`
      : ''
    const payload: PengaturanUpdate = {
      enabled_modules: draftEnabled.value.filter(k => isAllowedInPackage(k)),
      settings: {
        show_auto_check_details: draftSettings.show_auto_check_details,
        allow_late_submission: draftSettings.allow_late_submission,
        allow_resubmission: draftSettings.allow_resubmission
      }
    }
    const res = await apiFetch<PengaturanRead>(`/api/v1/pengaturan${query}`, {
      method: 'PATCH',
      body: payload
    })
    data.value = res
    syncDraftFromData(res)
    await auth.fetchMe()
    toast.add({
      title: 'Pengaturan tersimpan',
      description: 'Modul aktif dan pengaturan pembelajaran berhasil diperbarui.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (err) {
    toast.add({
      title: 'Gagal menyimpan pengaturan',
      description: apiErrorMessage(err),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    saving.value = false
  }
}

function onResetChanges() {
  if (data.value) {
    syncDraftFromData(data.value)
  }
}
</script>

<template>
  <div class="dash-page">
    <header class="dash-toolbar">
      <div>
        <span class="dash-eyebrow">Administrasi Instansi</span>
        <h1 class="dash-title">Pengaturan Instansi</h1>
        <p class="dash-subtitle">
          Atur modul pembelajaran yang aktif bagi guru dan siswa serta kebijakan pengumpulan tugas di instansi Anda.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-if="isDirty || isPaketDirty"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-rotate-ccw"
          label="Batalkan Perubahan"
          @click="onResetChanges"
        />
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-save"
          label="Simpan Pengaturan"
          :loading="saving"
          :disabled="!data"
          @click="onSavePengaturan"
        />
      </div>
    </header>

    <!-- Superadmin institution selector -->
    <section v-if="isSuperadmin" class="dash-panel">
      <div class="dash-panel__body flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-highlighted">Pilih Instansi (Mode Super Admin)</h2>
          <p class="text-xs dash-muted">
            Pilih sekolah atau lembaga untuk mengatur Paket Modul maupun pengaturan modul aktifnya.
          </p>
        </div>
        <div class="w-full sm:w-80">
          <USelect
            v-model="selectedTenantId"
            :items="tenantOptions"
            placeholder="Pilih instansi..."
            class="w-full"
          />
        </div>
      </div>
    </section>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Gagal memuat pengaturan instansi"
      :description="loadError"
      :actions="[{ label: 'Coba lagi', color: 'neutral', variant: 'outline', onClick: () => fetchPengaturan() }]"
    />

    <div v-else-if="loading" class="grid gap-4">
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-96 w-full" />
      <USkeleton class="h-48 w-full" />
    </div>

    <template v-else-if="data">
      <!-- 1. Profil Instansi (read-only) -->
      <section class="dash-panel" aria-labelledby="profil-instansi-heading">
        <div class="dash-panel__head">
          <div>
            <h2 id="profil-instansi-heading">Profil Instansi</h2>
            <p class="text-xs dash-muted">
              Informasi kuota dan masa berlaku instansi (dikelola oleh Super Admin).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge color="neutral" variant="subtle">
              {{ typeLabel[data.profile.type] ?? data.profile.type }}
            </UBadge>
            <UBadge :color="data.profile.is_active ? 'success' : 'error'" variant="subtle">
              {{ data.profile.is_active ? 'Aktif' : 'Nonaktif' }}
            </UBadge>
            <UBadge
              v-if="data.profile.days_remaining !== null"
              :color="data.profile.expired ? 'error' : data.profile.expired_soon ? 'warning' : 'success'"
              variant="subtle"
            >
              <template v-if="data.profile.expired">
                Masa berlaku habis
              </template>
              <template v-else>
                Sisa {{ data.profile.days_remaining }} hari
              </template>
            </UBadge>
          </div>
        </div>

        <div class="dash-panel__body grid gap-4 md:grid-cols-2">
          <div class="space-y-2 text-sm">
            <div>
              <span class="text-xs dash-muted">Nama Instansi</span>
              <p class="font-bold text-highlighted">{{ data.profile.name }}</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-xs dash-muted">Kode Instansi</span>
                <p class="font-mono text-xs font-semibold">{{ data.profile.slug }}</p>
              </div>
              <div>
                <span class="text-xs dash-muted">Kontak WhatsApp</span>
                <p class="text-xs font-semibold">{{ data.profile.contact_wa || '-' }}</p>
              </div>
            </div>
            <div>
              <span class="text-xs dash-muted">Masa Berlaku</span>
              <p class="text-xs font-semibold">
                {{ formatDate(data.profile.berlaku_dari) }} s.d. {{ formatDate(data.profile.berlaku_sampai) }}
              </p>
            </div>
          </div>

          <div class="space-y-2.5">
            <span class="text-xs font-semibold dash-muted">Pemakaian Kuota</span>
            <DashQuotaMeter
              label="Guru"
              :usage="{
                used: data.profile.quotas.guru.used ?? 0,
                limit: data.profile.quotas.guru.limit,
                full: data.profile.quotas.guru.limit !== null && (data.profile.quotas.guru.used ?? 0) >= data.profile.quotas.guru.limit
              }"
            />
            <DashQuotaMeter
              label="Siswa"
              :usage="{
                used: data.profile.quotas.siswa.used ?? 0,
                limit: data.profile.quotas.siswa.limit,
                full: data.profile.quotas.siswa.limit !== null && (data.profile.quotas.siswa.used ?? 0) >= data.profile.quotas.siswa.limit
              }"
            />
            <DashQuotaMeter
              label="Kelas"
              :usage="{
                used: data.profile.quotas.kelas.used ?? 0,
                limit: data.profile.quotas.kelas.limit,
                full: data.profile.quotas.kelas.limit !== null && (data.profile.quotas.kelas.used ?? 0) >= data.profile.quotas.kelas.limit
              }"
            />
          </div>
        </div>
      </section>

      <!-- Superadmin Paket Modul section -->
      <section v-if="isSuperadmin" class="dash-panel" aria-labelledby="paket-modul-heading">
        <div class="dash-panel__head">
          <div>
            <h2 id="paket-modul-heading">Paket Modul (Khusus Super Admin)</h2>
            <p class="text-xs dash-muted">
              Tentukan modul mana saja yang diizinkan dalam paket langganan instansi ini. Modul yang dihapus dari paket otomatis nonaktif.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              label="Pilih Semua Paket"
              @click="selectAllPackageModules"
            />
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-package-check"
              label="Simpan Paket Modul"
              :loading="savingPaket"
              @click="onSavePaket"
            />
          </div>
        </div>
        <div class="dash-panel__body space-y-4">
          <div v-for="grp in groupedCatalog" :key="`pkg-${grp.group}`" class="space-y-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-muted">{{ grp.group }}</h3>
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label
                v-for="mod in grp.items"
                :key="`pkg-${mod.key}`"
                class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-default p-2.5 text-xs transition hover:bg-elevated/50"
              >
                <UCheckbox
                  :model-value="draftAllowed.includes(mod.key)"
                  @update:model-value="(val: boolean | 'indeterminate') => togglePackageModule(mod.key, Boolean(val))"
                />
                <span class="font-medium text-highlighted">{{ mod.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Modul Aktif -->
      <section class="dash-panel" aria-labelledby="modul-aktif-heading">
        <div class="dash-panel__head">
          <div>
            <h2 id="modul-aktif-heading">Modul Aktif</h2>
            <p class="text-xs dash-muted">
              Nyalakan atau matikan modul sesuai kurikulum semester berjalan. Data yang sudah dibuat pada modul yang dimatikan tetap tersimpan aman dan muncul kembali saat modul dinyalakan.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge color="primary" variant="subtle">
              {{ draftEnabled.filter(k => isAllowedInPackage(k)).length }} / {{ ALL_MODULE_KEYS.length }} Modul Aktif
            </UBadge>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              label="Aktifkan Semua Modul Paket"
              @click="enableAllAllowedModules"
            />
          </div>
        </div>

        <div class="dash-panel__body space-y-5">
          <UAlert
            v-if="activeDependencyWarnings.length > 0"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="Perhatian Ketergantungan Modul"
          >
            <template #description>
              <ul class="mt-1 list-inside list-disc space-y-0.5 text-xs">
                <li v-for="w in activeDependencyWarnings" :key="w.key">
                  {{ w.warning }}
                </li>
              </ul>
            </template>
          </UAlert>

          <div v-for="grp in groupedCatalog" :key="grp.group" class="space-y-2.5">
            <div class="flex items-center justify-between border-b border-default pb-1.5">
              <h3 class="text-sm font-extrabold text-highlighted">{{ grp.group }}</h3>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div
                v-for="mod in grp.items"
                :key="mod.key"
                class="flex flex-col justify-between gap-2 rounded-lg border border-default p-3 transition"
                :class="!isAllowedInPackage(mod.key) ? 'bg-elevated/40 opacity-75' : ''"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-semibold text-highlighted">{{ mod.label }}</span>
                      <UBadge
                        v-if="!isAllowedInPackage(mod.key)"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        Tidak termasuk paket
                      </UBadge>
                    </div>
                    <p v-if="mod.dependency_hint" class="text-xs dash-muted">
                      {{ mod.dependency_hint }}
                    </p>
                  </div>

                  <USwitch
                    :model-value="isModuleChecked(mod.key)"
                    :disabled="!isAllowedInPackage(mod.key)"
                    :aria-label="`Toggle ${mod.label}`"
                    @update:model-value="(val: boolean) => toggleModule(mod.key, val)"
                  />
                </div>

                <p
                  v-if="dependencyWarning(mod)"
                  class="flex items-center gap-1.5 rounded bg-warning/10 px-2 py-1 text-xs font-medium text-warning"
                >
                  <UIcon name="i-lucide-alert-triangle" class="size-3.5 shrink-0" />
                  <span>{{ dependencyWarning(mod) }}</span>
                </p>
              </div>

              <!-- Always-on Kode Billing card inside Pembayaran group -->
              <div
                v-if="grp.group === 'Pembayaran'"
                class="flex items-start justify-between gap-3 rounded-lg border border-default bg-elevated/30 p-3"
              >
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-highlighted">Pembayaran — Kode Billing & Pembayaran SPT</span>
                    <UBadge color="success" variant="subtle" size="xs">Selalu aktif</UBadge>
                  </div>
                  <p class="text-xs dash-muted">
                    Diperlukan untuk pelunasan SPT Masa Kurang Bayar dan layanan mandiri kode billing.
                  </p>
                </div>
                <USwitch :model-value="true" disabled aria-label="Kode Billing selalu aktif" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Pengaturan Pembelajaran -->
      <section class="dash-panel" aria-labelledby="pengaturan-pembelajaran-heading">
        <div class="dash-panel__head">
          <div>
            <h2 id="pengaturan-pembelajaran-heading">Pengaturan Pembelajaran</h2>
            <p class="text-xs dash-muted">
              Atur perilaku penilaian otomatis dan pengumpulan pada modul Tugas.
            </p>
          </div>
        </div>

        <div class="dash-panel__body divide-y divide-default">
          <div class="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-highlighted">
                Tampilkan rincian pemeriksaan otomatis ke siswa
              </p>
              <p class="text-xs dash-muted">
                Saat dimatikan, siswa tetap melihat skor otomatis tetapi rincian butir pemeriksaan disembunyikan (cocok untuk mode ujian). Guru dan admin selalu melihat rincian lengkap.
              </p>
            </div>
            <USwitch
              v-model="draftSettings.show_auto_check_details"
              aria-label="Tampilkan rincian pemeriksaan otomatis ke siswa"
            />
          </div>

          <div class="flex items-start justify-between gap-4 py-3">
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-highlighted">
                Izinkan pengumpulan tugas terlambat
              </p>
              <p class="text-xs dash-muted">
                Saat aktif, siswa masih dapat mengumpulkan tugas setelah melewati tenggat dengan penanda "Terlambat". Saat dimatikan, pengumpulan setelah tenggat ditolak.
              </p>
            </div>
            <USwitch
              v-model="draftSettings.allow_late_submission"
              aria-label="Izinkan pengumpulan tugas terlambat"
            />
          </div>

          <div class="flex items-start justify-between gap-4 py-3 last:pb-0">
            <div class="space-y-0.5">
              <p class="text-sm font-semibold text-highlighted">
                Izinkan siswa mengganti dokumen kiriman sebelum dinilai guru
              </p>
              <p class="text-xs dash-muted">
                Saat aktif, siswa dapat mengirim ulang dokumen pengganti selama tugas masih dibuka dan belum diberi nilai akhir oleh guru. Saat dimatikan, siswa hanya dapat mengumpulkan satu kali.
              </p>
            </div>
            <USwitch
              v-model="draftSettings.allow_resubmission"
              aria-label="Izinkan siswa mengganti dokumen kiriman sebelum dinilai guru"
            />
          </div>
        </div>
      </section>

      <!-- Bottom save bar -->
      <div class="flex flex-wrap items-center justify-end gap-2 pb-4">
        <UButton
          v-if="isDirty || isPaketDirty"
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          label="Batalkan Perubahan"
          @click="onResetChanges"
        />
        <UButton
          color="primary"
          icon="i-lucide-save"
          label="Simpan Pengaturan"
          :loading="saving"
          @click="onSavePengaturan"
        />
      </div>
    </template>
  </div>
</template>
