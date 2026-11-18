<script setup lang="ts">
import type { SchoolClass, SiswaDashboard, SiswaTodo } from '~/types/api'
import { formatCurrency, statusColor, statusLabel } from '~/utils/bupot'
import { sptStatusLabel } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()

const { data: dash, status: dashStatus, error: dashError, refresh: refreshDash } = useAsyncData(
  'siswa-dashboard-main',
  () => apiFetch<SiswaDashboard>('/api/v1/dashboard/siswa')
)

const { data: classes, status: classesStatus, error: classesError } = useAsyncData(
  'siswa-dashboard-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const loading = computed(() => dashStatus.value === 'pending' && !dash.value)

const quickActions = [
  { label: 'Tugas Kelas', to: '/siswa/tugas', primary: true },
  { label: 'Buat Faktur', to: '/siswa/e-faktur/keluaran/create' },
  { label: 'Buat BPPU', to: '/siswa/bppu/create' },
  { label: 'Buat BP21', to: '/siswa/bp21/create' },
  { label: 'Buat SPT', to: '/siswa/spt/create' }
]

/** Langkah belajar — done/not-done derived from the student's own rows. */
const steps = computed(() => {
  const d = dash.value
  const made = d ? d.ebupot.total + d.faktur_keluaran.total + d.faktur_masukan.total : 0
  const issued = d ? d.ebupot.issued + d.faktur_keluaran.issued : 0
  return [
    {
      title: 'Buat',
      desc: 'Buat e-Bupot / e-Faktur sebagai konsep.',
      to: '/siswa/bp21',
      done: made > 0,
      state: made > 0 ? `${made} dokumen dibuat` : 'Belum ada dokumen'
    },
    {
      title: 'Terbitkan',
      desc: 'Terbitkan dokumen pada tab Telah Terbit.',
      to: '/siswa/bppu',
      done: issued > 0,
      state: issued > 0 ? `${issued} telah terbit` : 'Belum ada yang terbit'
    },
    {
      title: 'SPT',
      desc: 'Laporkan dalam SPT Masa.',
      to: '/siswa/spt',
      done: !!d && d.spt.reported > 0 && d.spt.unreported === 0,
      state: d && d.spt.reported > 0
        ? `${d.spt.reported} dilaporkan${d.spt.unreported ? `, ${d.spt.unreported} belum` : ''}`
        : (d?.spt.unreported ? `${d.spt.unreported} belum dilaporkan` : 'Belum ada SPT')
    },
    {
      title: 'Bayar',
      desc: 'Bayar kode billing SPT.',
      to: '/siswa/pembayaran',
      done: !!d && d.billing.paid > 0 && d.billing.unpaid === 0,
      state: d && d.billing.paid > 0
        ? `${d.billing.paid} dibayar${d.billing.unpaid ? `, ${d.billing.unpaid} belum` : ''}`
        : (d?.billing.unpaid ? `${d.billing.unpaid} belum dibayar` : 'Belum ada pembayaran')
    },
    {
      title: 'Dinilai',
      desc: 'Guru menilai dokumen terbit.',
      to: '/siswa/dokumen-saya',
      done: !!d && d.grades.reviewed > 0,
      state: d && d.grades.reviewed > 0 ? `${d.grades.reviewed} dinilai` : 'Belum dinilai'
    }
  ]
})

const stats = computed(() => {
  const d = dash.value
  if (!d) return []
  return [
    {
      label: 'Tugas aktif',
      value: d.open_tugas_count ?? 0,
      hint: 'Tugas kelas belum dikumpulkan',
      to: '/siswa/tugas'
    },
    { label: 'eBupot', value: d.ebupot.total, hint: `${d.ebupot.issued} terbit, ${d.ebupot.draft} konsep`, to: '/siswa/bp21' },
    {
      label: 'e-Faktur',
      value: d.faktur_keluaran.issued,
      hint: `keluaran terbit; ${d.faktur_masukan.not_credited} masukan menunggu kredit`,
      to: '/siswa/e-faktur/keluaran'
    },
    {
      label: 'SPT belum dilaporkan',
      value: d.spt.unreported,
      hint: `${d.spt.draft} konsep, ${d.spt.awaiting_payment} menunggu bayar`,
      to: '/siswa/spt'
    },
    {
      label: 'Billing belum dibayar',
      value: d.billing.unpaid,
      hint: d.billing.unpaid ? `Rp ${formatCurrency(d.billing.unpaid_amount)}` : 'Tidak ada tagihan',
      to: '/siswa/pembayaran'
    },
    {
      label: 'Nilai rata-rata',
      value: d.grades.average === null ? '-' : String(d.grades.average).replace('.', ','),
      hint: `${d.grades.reviewed} dokumen dinilai`,
      to: '/siswa/dokumen-saya'
    }
  ]
})

function todoLink(t: SiswaTodo): string {
  if (t.kind === 'billing') return '/siswa/pembayaran'
  if (t.kind === 'tugas') return t.id ? `/siswa/tugas/${t.id}` : '/siswa/tugas'
  return siswaDocumentPath(t.module, t.id ?? undefined)
}

const todoIcon: Record<SiswaTodo['kind'], string> = {
  draft: 'i-lucide-file-pen-line',
  spt: 'i-lucide-clipboard-list',
  billing: 'i-lucide-wallet',
  masukan: 'i-lucide-receipt-text',
  tugas: 'i-lucide-clipboard-check'
}

function docStatusLabel(module: string, status: string): string {
  if (module === 'spt') return (sptStatusLabel as Record<string, string>)[status] ?? status
  return (statusLabel as Record<string, string>)[status] ?? status
}

function docStatusColor(module: string, status: string) {
  if (module === 'spt') return status === 'reported' ? 'success' : 'warning'
  return (statusColor as Record<string, 'warning' | 'success' | 'error'>)[status] ?? 'neutral'
}
</script>

<template>
  <div class="dash-page">
    <div class="dash-head">
      <div>
        <h1>Dasbor Siswa</h1>
        <p>{{ auth.user.value?.full_name }}</p>
      </div>
      <div class="dash-head__actions" aria-label="Aksi cepat">
        <UButton
          v-for="a in quickActions"
          :key="a.to"
          :to="a.to"
          icon="i-lucide-file-plus-2"
          :label="a.label"
          :color="a.primary ? 'primary' : 'neutral'"
          :variant="a.primary ? 'solid' : 'outline'"
        />
      </div>
    </div>

    <UAlert
      v-if="dashError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Ringkasan belajar gagal dimuat."
      :description="apiErrorMessage(dashError, 'Periksa koneksi lalu coba lagi.')"
      :actions="[{ label: 'Coba lagi', color: 'neutral', variant: 'outline', onClick: () => refreshDash() }]"
    />

    <!-- Langkah belajar -->
    <section class="dash-panel" aria-labelledby="siswa-steps-title">
      <div class="dash-panel__head">
        <h2 id="siswa-steps-title">Langkah belajar</h2>
        <small>Buat draf, terbitkan, lalu lanjut ke SPT, pembayaran, dan nilai dari guru.</small>
      </div>
      <ol class="dash-steps">
        <li v-for="(s, i) in steps" :key="s.title">
          <NuxtLink :to="s.to" class="dash-step" :class="{ 'is-done': s.done }">
            <span class="dash-step__mark">
              <span class="dash-step__num" aria-hidden="true">
                <UIcon v-if="s.done" name="i-lucide-check" class="size-3.5" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              {{ s.title }}
            </span>
            <span class="dash-step__desc">{{ s.desc }}</span>
            <USkeleton v-if="loading" class="h-3 w-24" />
            <span v-else class="dash-step__state">{{ s.done ? 'Selesai' : 'Belum selesai' }} · {{ s.state }}</span>
          </NuxtLink>
        </li>
      </ol>
    </section>

    <!-- Stat strip -->
    <div class="dash-stats" aria-label="Ringkasan">
      <template v-if="loading">
        <div v-for="n in 5" :key="n" class="dash-stat">
          <USkeleton class="h-3 w-24" />
          <USkeleton class="mt-1 h-7 w-12" />
        </div>
      </template>
      <NuxtLink v-for="s in stats" :key="s.label" :to="s.to" class="dash-stat hover:bg-elevated">
        <span class="dash-stat__label">{{ s.label }}</span>
        <span class="dash-stat__value">{{ s.value }}</span>
        <span class="dash-stat__hint">{{ s.hint }}</span>
      </NuxtLink>
    </div>

    <div class="dash-grid dash-grid--main">
      <div class="dash-grid">
        <!-- To-do -->
        <section class="dash-panel" aria-labelledby="siswa-todo-title">
          <div class="dash-panel__head">
            <h2 id="siswa-todo-title">Yang perlu dikerjakan</h2>
            <small v-if="dash">{{ dash.todo_total }} tugas</small>
          </div>
          <div v-if="loading" class="dash-panel__body space-y-3">
            <USkeleton v-for="n in 3" :key="n" class="h-10 w-full" />
          </div>
          <div v-else-if="!dash?.todos.length" class="dash-state">
            <UIcon name="i-lucide-circle-check" class="size-7" />
            <strong>Tidak ada tugas tertunda</strong>
            <span>Tidak ada draf, SPT, billing, atau faktur masukan yang menunggu. Mulai dengan membuat dokumen baru.</span>
          </div>
          <ul v-else class="dash-rows">
            <li v-for="(t, i) in dash.todos.slice(0, 6)" :key="`${t.kind}-${t.module}-${t.id}-${i}`">
              <NuxtLink :to="todoLink(t)" class="dash-row">
                <UIcon :name="todoIcon[t.kind]" class="size-5 shrink-0 dash-muted" />
                <span class="dash-row__main">
                  <span class="dash-row__title">{{ t.title }}</span>
                  <span class="dash-row__sub">{{ t.module_label }}<template v-if="t.detail"> · {{ t.detail }}</template></span>
                </span>
                <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 dash-muted" />
              </NuxtLink>
            </li>
          </ul>
          <p v-if="dash && dash.todo_total > 6" class="border-t border-default px-4 py-2 text-xs dash-muted">
            Menampilkan 6 dari {{ dash.todo_total }} tugas. Buka modul terkait untuk melihat semuanya.
          </p>
        </section>

        <!-- Recent documents -->
        <section class="dash-panel" aria-labelledby="siswa-recent-title">
          <div class="dash-panel__head">
            <h2 id="siswa-recent-title">Dokumen terbaru</h2>
            <small>Semua modul</small>
          </div>
          <div v-if="loading" class="dash-panel__body space-y-3">
            <USkeleton v-for="n in 4" :key="n" class="h-10 w-full" />
          </div>
          <div v-else-if="!dash?.recent.length" class="dash-state">
            <UIcon name="i-lucide-file-text" class="size-7" />
            <strong>Belum ada dokumen</strong>
            <span>Dokumen yang Anda buat akan muncul di sini.</span>
          </div>
          <ul v-else class="dash-rows">
            <li v-for="d in dash.recent" :key="`${d.module}-${d.id}`">
              <NuxtLink :to="siswaDocumentPath(d.module, d.id)" class="dash-row">
                <span class="dash-tag">{{ d.module_label }}</span>
                <span class="dash-row__main">
                  <span class="dash-row__title">{{ d.title }}</span>
                  <span class="dash-row__sub">{{ d.period ?? '-' }}<template v-if="d.amount"> · Rp {{ formatCurrency(d.amount) }}</template> · {{ formatRelative(d.at) }}</span>
                </span>
                <UBadge :color="docStatusColor(d.module, d.status)" variant="subtle" size="sm">{{ docStatusLabel(d.module, d.status) }}</UBadge>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>

      <div class="dash-grid">
        <!-- Grades -->
        <section class="dash-panel" aria-labelledby="siswa-grades-title">
          <div class="dash-panel__head">
            <h2 id="siswa-grades-title">Nilai &amp; umpan balik guru</h2>
            <UButton to="/siswa/dokumen-saya" size="xs" color="neutral" variant="ghost" label="Dokumen Saya" trailing-icon="i-lucide-arrow-right" />
          </div>
          <div v-if="loading" class="dash-panel__body space-y-3">
            <USkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
          </div>
          <div v-else-if="!dash?.graded.length" class="dash-state">
            <UIcon name="i-lucide-message-square-text" class="size-7" />
            <strong>Belum ada penilaian</strong>
            <span>Nilai dan komentar muncul setelah guru menilai dokumen yang telah terbit.</span>
          </div>
          <ul v-else class="dash-rows">
            <li v-for="g in dash.graded" :key="`${g.module}-${g.id}`">
              <NuxtLink :to="siswaDocumentPath(g.module, g.id)" class="dash-row items-start">
                <span class="grid w-11 shrink-0 justify-items-center">
                  <span class="text-xl font-extrabold leading-none">{{ g.score }}</span>
                  <span class="text-[0.65rem] font-bold uppercase dash-muted">nilai</span>
                </span>
                <span class="dash-row__main">
                  <span class="dash-row__title">{{ g.module_label }}: {{ g.title }}</span>
                  <span class="text-[0.82rem] leading-snug">{{ g.teacher_feedback || 'Tanpa komentar.' }}</span>
                  <span class="dash-row__sub">{{ formatRelative(g.at) }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Classes -->
        <section class="dash-panel" aria-labelledby="siswa-class-title">
          <div class="dash-panel__head">
            <h2 id="siswa-class-title">Kelas yang diikuti</h2>
          </div>
          <div v-if="classesStatus === 'pending'" class="dash-panel__body">
            <USkeleton class="h-10 w-full" />
          </div>
          <div v-else-if="classesError" class="dash-state">
            <strong>Daftar kelas gagal dimuat</strong>
          </div>
          <div v-else-if="!classes.length" class="dash-state">
            <UIcon name="i-lucide-book-open" class="size-7" />
            <strong>Belum terdaftar di kelas</strong>
            <span>Minta admin atau guru menambahkan Anda ke kelas.</span>
          </div>
          <ul v-else class="dash-rows">
            <li v-for="c in classes" :key="c.id" class="dash-row">
              <span class="dash-row__main">
                <span class="dash-row__title">{{ c.name }}</span>
                <span class="dash-row__sub">Tahun ajaran {{ c.academic_year }}<template v-if="c.guru"> · {{ c.guru.full_name }}</template></span>
              </span>
              <UBadge :color="c.archived ? 'neutral' : 'success'" variant="subtle" size="sm">{{ c.archived ? 'Arsip' : 'Aktif' }}</UBadge>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
