<script setup lang="ts">
import type { GuruDashboard } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const { apiFetch } = useApi()

// ---- Class selector + per-class dashboard ----------------------------------
const classId = ref<number | undefined>(undefined)

const { data: dash, status: dashStatus, error: dashError, refresh: refreshDash } = useAsyncData(
  'guru-dashboard-main',
  () => apiFetch<GuruDashboard>('/api/v1/dashboard/guru', {
    query: classId.value === undefined ? {} : { class_id: classId.value }
  }),
  { watch: [classId] }
)

const selectedClassId = computed<number | undefined>({
  get: () => classId.value ?? dash.value?.class_id ?? undefined,
  set: (value) => { classId.value = value }
})

const classOptions = computed(() =>
  (dash.value?.classes ?? []).map(c => ({
    label: `${c.name} (${c.academic_year})${c.archived ? ' - arsip' : ''}${c.pending_grading ? ` - ${c.pending_grading} perlu dinilai` : ''}`,
    value: c.id
  }))
)
const selectedClass = computed(() => dash.value?.classes.find(c => c.id === dash.value?.class_id))

const loading = computed(() => dashStatus.value === 'pending' && !dash.value)
const students = computed(() => dash.value?.students ?? [])
const idleCount = computed(() => students.value.filter(s => !s.has_activity).length)
const sptTotal = computed(() => students.value.reduce((n, s) => n + s.spt_reported, 0))

// ---- Perlu perhatian: payment-side queues -----------------------------------
interface StatusRow { status: string }
interface QueueList { items: StatusRow[], total: number }

function queueFetch(path: string) {
  return apiFetch<QueueList>(path, { query: { page: 1, size: 100 } })
}
const { data: pbkList, error: pbkError } = useAsyncData('guru-dashboard-pbk', () => queueFetch('/api/v1/pbk'))
const { data: tagihanList, error: tagihanError } = useAsyncData('guru-dashboard-tagihan', () => queueFetch('/api/v1/tagihan'))
const { data: angsuranList, error: angsuranError } = useAsyncData('guru-dashboard-angsuran', () => queueFetch('/api/v1/angsuran'))

function countOf(list: QueueList | null | undefined, status: string): number | null {
  return list ? list.items.filter(i => i.status === status).length : null
}

const attention = computed(() => [
  { label: 'Tugas perlu dinilai', to: '/guru/tugas', value: dash.value?.tugas_pending_grading ?? 0, failed: false },
  { label: 'Pbk menunggu', to: '/guru/pbk', value: countOf(pbkList.value, 'diajukan'), failed: !!pbkError.value },
  { label: 'Tagihan belum dibilling', to: '/guru/tagihan', value: countOf(tagihanList.value, 'belum'), failed: !!tagihanError.value },
  { label: 'Angsuran berjalan', to: '/guru/angsuran', value: countOf(angsuranList.value, 'berjalan'), failed: !!angsuranError.value }
])

const monitorGroups = [
  {
    title: 'Tugas',
    links: [
      { label: 'Kelola Tugas', to: '/guru/tugas' },
      { label: 'Buat Tugas', to: '/guru/tugas/create' }
    ]
  },
  {
    title: 'eBupot',
    links: [
      { label: 'BP21', to: '/guru/bp21' },
      { label: 'BPPU', to: '/guru/bppu' },
      { label: 'BP26', to: '/guru/bp26' },
      { label: 'BPNR', to: '/guru/bpnr' },
      { label: 'SP', to: '/guru/sp' },
      { label: 'CY', to: '/guru/cy' },
      { label: 'BPMP', to: '/guru/bpmp' }
    ]
  },
  {
    title: 'e-Faktur',
    links: [
      { label: 'Faktur Keluaran', to: '/guru/e-faktur/keluaran' },
      { label: 'Faktur Masukan', to: '/guru/e-faktur/masukan' }
    ]
  },
  { title: 'SPT', links: [{ label: 'SPT Masa', to: '/guru/spt' }] }
]
</script>

<template>
  <div class="dash-page">
    <div class="dash-head">
      <div>
        <h1>Dasbor Guru</h1>
        <p>Pantau progres belajar siswa dan nilai dokumen yang sudah terbit.</p>
      </div>
      <div v-if="dash && dash.classes.length" class="dash-head__actions">
        <label for="guru-class-select" class="text-sm font-bold text-highlighted">Kelas</label>
        <USelect
          v-if="dash.classes.length > 1"
          id="guru-class-select"
          v-model="selectedClassId"
          :items="classOptions"
          class="w-full min-w-0 sm:w-80"
        />
        <span v-else class="text-sm font-semibold">{{ selectedClass?.name }} ({{ selectedClass?.academic_year }})</span>
      </div>
    </div>

    <!-- Whole-dashboard error / empty -->
    <UAlert
      v-if="dashError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Dasbor kelas gagal dimuat."
      :description="apiErrorMessage(dashError, 'Periksa koneksi lalu coba lagi.')"
      :actions="[{ label: 'Coba lagi', color: 'neutral', variant: 'outline', onClick: () => refreshDash() }]"
    />

    <section v-else-if="dash && !dash.classes.length" class="dash-panel">
      <div class="dash-state">
        <UIcon name="i-lucide-book-open" class="size-7" />
        <strong>Belum ada kelas</strong>
        <span>Anda belum menjadi pengajar kelas mana pun. Minta admin institusi menautkan kelas ke akun Anda.</span>
      </div>
    </section>

    <template v-else>
      <!-- Stat strip -->
      <div class="dash-stats" aria-label="Ringkasan kelas">
        <template v-if="loading">
          <div v-for="n in 5" :key="n" class="dash-stat">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="mt-1 h-7 w-12" />
          </div>
        </template>
        <template v-else>
          <div class="dash-stat">
            <span class="dash-stat__label">Siswa di kelas</span>
            <span class="dash-stat__value">{{ students.length }}</span>
            <span class="dash-stat__hint">{{ selectedClass?.name }}</span>
          </div>
          <NuxtLink to="/guru/tugas" class="dash-stat hover:bg-elevated">
            <span class="dash-stat__label">Tugas perlu dinilai</span>
            <span class="dash-stat__value">{{ dash?.tugas_pending_grading ?? 0 }}</span>
            <span class="dash-stat__hint">Pengumpulan tugas menunggu nilai guru</span>
          </NuxtLink>
          <div class="dash-stat">
            <span class="dash-stat__label">Perlu dinilai</span>
            <span class="dash-stat__value">{{ dash?.grading_total ?? 0 }}</span>
            <span class="dash-stat__hint">Dokumen terbit tanpa nilai</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat__label">Belum ada aktivitas</span>
            <span class="dash-stat__value">{{ idleCount }}</span>
            <span class="dash-stat__hint">Siswa belum membuat dokumen</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat__label">SPT dilaporkan</span>
            <span class="dash-stat__value">{{ sptTotal }}</span>
            <span class="dash-stat__hint">PPN, PPh Unifikasi, PPh 21/26</span>
          </div>
        </template>
      </div>

      <div class="dash-grid dash-grid--main">
        <!-- Progress table -->
        <section class="dash-panel" aria-labelledby="guru-progress-title">
          <div class="dash-panel__head">
            <h2 id="guru-progress-title">Progres Siswa</h2>
            <small>Jumlah dokumen per langkah belajar</small>
          </div>
          <div v-if="loading" class="dash-panel__body space-y-3">
            <USkeleton v-for="n in 5" :key="n" class="h-8 w-full" />
          </div>
          <div v-else-if="!students.length" class="dash-state">
            <UIcon name="i-lucide-users" class="size-7" />
            <strong>Belum ada siswa terdaftar</strong>
            <span>Siswa ditambahkan ke kelas ini oleh admin institusi.</span>
          </div>
          <div v-else class="dash-table-wrap">
            <table class="dash-table">
              <caption class="sr-only">Progres tiap siswa pada kelas terpilih</caption>
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  <th scope="col" class="is-num" title="eBupot berstatus Telah Terbit (semua jenis)">eBupot terbit</th>
                  <th scope="col" class="is-num" title="Faktur pajak keluaran berstatus Telah Terbit">Faktur keluaran</th>
                  <th scope="col" class="is-num" title="Faktur pajak masukan yang sudah dikreditkan">Faktur masukan</th>
                  <th scope="col" class="is-num" title="SPT Masa berstatus Dilaporkan">SPT lapor</th>
                  <th scope="col" class="is-num" title="Kode billing berstatus Sudah Dibayar">Billing bayar</th>
                  <th scope="col">Aktivitas terakhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in students" :key="s.id" :class="{ 'is-idle': !s.has_activity }">
                  <th scope="row" class="font-semibold">
                    <div class="min-w-40">
                      {{ s.full_name }}
                      <div class="text-xs font-normal dash-muted">{{ s.identifier }}</div>
                    </div>
                  </th>
                  <td class="is-num">
                    <span :class="s.ebupot_issued ? 'dash-cell-count' : 'dash-cell-zero'">{{ s.ebupot_issued || '-' }}</span>
                    <div v-if="s.ebupot_draft" class="text-xs dash-muted">+{{ s.ebupot_draft }} konsep</div>
                  </td>
                  <td class="is-num"><span :class="s.faktur_keluaran_issued ? 'dash-cell-count' : 'dash-cell-zero'">{{ s.faktur_keluaran_issued || '-' }}</span></td>
                  <td class="is-num"><span :class="s.faktur_masukan_credited ? 'dash-cell-count' : 'dash-cell-zero'">{{ s.faktur_masukan_credited || '-' }}</span></td>
                  <td class="is-num">
                    <span :class="s.spt_reported ? 'dash-cell-count' : 'dash-cell-zero'">{{ s.spt_reported || '-' }}</span>
                    <div v-if="s.spt_reported" class="text-xs dash-muted">
                      {{ [s.spt_ppn && `PPN ${s.spt_ppn}`, s.spt_pph_unifikasi && `Unif. ${s.spt_pph_unifikasi}`, s.spt_pph_21_26 && `21/26 ${s.spt_pph_21_26}`].filter(Boolean).join(' · ') }}
                    </div>
                  </td>
                  <td class="is-num"><span :class="s.billing_paid ? 'dash-cell-count' : 'dash-cell-zero'">{{ s.billing_paid || '-' }}</span></td>
                  <td>
                    <UBadge v-if="!s.has_activity" color="warning" variant="subtle" icon="i-lucide-circle-alert">Belum ada aktivitas</UBadge>
                    <span v-else class="whitespace-nowrap text-sm">{{ formatRelative(s.last_activity_at) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Grading queue -->
        <section class="dash-panel" aria-labelledby="guru-queue-title">
          <div class="dash-panel__head">
            <h2 id="guru-queue-title">Perlu Dinilai</h2>
            <small v-if="dash">{{ dash.grading_total }} dokumen</small>
          </div>
          <div v-if="loading" class="dash-panel__body space-y-3">
            <USkeleton v-for="n in 4" :key="n" class="h-10 w-full" />
          </div>
          <div v-else-if="!dash?.grading_items.length" class="dash-state">
            <UIcon name="i-lucide-circle-check" class="size-7" />
            <strong>Semua sudah dinilai</strong>
            <span>Tidak ada dokumen terbit atau SPT dilaporkan yang menunggu nilai di kelas ini.</span>
          </div>
          <template v-else>
            <div class="flex flex-wrap gap-1.5 border-b border-default px-4 py-3">
              <NuxtLink
                v-for="m in dash.grading_by_module"
                :key="m.module"
                :to="guruMonitorPath(m.module)"
                class="dash-tag hover:bg-elevated"
                :title="`Buka monitor ${m.module_label}`"
              >
                {{ m.module_label }} · {{ m.count }}
              </NuxtLink>
            </div>
            <ul class="dash-rows">
              <li v-for="item in dash.grading_items" :key="`${item.module}-${item.id}`">
                <NuxtLink :to="guruMonitorPath(item.module)" class="dash-row">
                  <span class="dash-tag">{{ item.module_label }}</span>
                  <span class="dash-row__main">
                    <span class="dash-row__title">{{ item.title }}</span>
                    <span class="dash-row__sub">{{ item.siswa_name }}<template v-if="item.period"> · {{ item.period }}</template> · {{ formatRelative(item.at) }}</span>
                  </span>
                  <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 dash-muted" />
                </NuxtLink>
              </li>
            </ul>
            <p v-if="dash.grading_total > dash.grading_items.length" class="border-t border-default px-4 py-2 text-xs dash-muted">
              Menampilkan {{ dash.grading_items.length }} terbaru dari {{ dash.grading_total }}. Buka monitor modul untuk daftar lengkap.
            </p>
          </template>
        </section>
      </div>
    </template>

    <!-- Perlu perhatian (compact) -->
    <section class="dash-panel" aria-labelledby="guru-attention-title">
      <div class="dash-panel__head">
        <h2 id="guru-attention-title">Perlu Perhatian</h2>
        <UButton to="/guru/deposit" size="xs" color="neutral" variant="outline" icon="i-lucide-wallet" label="Rekap Deposit" />
      </div>
      <div class="dash-grid p-0 sm:grid-cols-3">
        <NuxtLink
          v-for="a in attention"
          :key="a.label"
          :to="a.to"
          class="dash-row border-b-0 hover:bg-elevated"
        >
          <span class="dash-row__main">
            <span class="dash-row__sub">{{ a.label }}</span>
            <span v-if="a.failed" class="text-sm font-semibold text-error">Gagal dimuat</span>
            <USkeleton v-else-if="a.value === null" class="h-6 w-8" />
            <span v-else class="text-xl font-extrabold">{{ a.value }}</span>
          </span>
          <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0 dash-muted" />
        </NuxtLink>
      </div>
    </section>

    <!-- Monitor quick links -->
    <section class="dash-panel" aria-labelledby="guru-monitor-title">
      <div class="dash-panel__head">
        <h2 id="guru-monitor-title">Monitor Modul</h2>
        <small>Buka daftar dokumen siswa untuk menilai</small>
      </div>
      <div class="dash-panel__body grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div v-for="g in monitorGroups" :key="g.title">
          <p class="mb-1.5 text-xs font-extrabold uppercase tracking-wide dash-muted">{{ g.title }}</p>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="l in g.links"
              :key="l.to"
              :to="l.to"
              size="sm"
              color="neutral"
              variant="outline"
              :label="l.label"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
