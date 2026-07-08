<script setup lang="ts">
import type {
  Bp21ListResponse,
  Bp21Read,
  Bp21Summary,
  Bp26ListResponse,
  Bp26Read,
  Bp26Summary,
  DashboardSummary,
  SchoolClass
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()

const { data: summary } = useAsyncData(
  'siswa-summary',
  () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary')
)

const { data: classes, status: classesStatus } = useAsyncData(
  'siswa-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const { data: bp21Summary } = useAsyncData(
  'siswa-dashboard-bp21-summary',
  () => apiFetch<Bp21Summary>('/api/v1/bp21/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp26Summary } = useAsyncData(
  'siswa-dashboard-bp26-summary',
  () => apiFetch<Bp26Summary>('/api/v1/bp26/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp21List, status: bp21Status } = useAsyncData(
  'siswa-dashboard-bp21-list',
  () => apiFetch<Bp21ListResponse>('/api/v1/bp21?page=1&size=5'),
  { default: () => ({ items: [], total: 0, page: 1, size: 5 }) }
)

const { data: bp26List, status: bp26Status } = useAsyncData(
  'siswa-dashboard-bp26-list',
  () => apiFetch<Bp26ListResponse>('/api/v1/bp26?page=1&size=5'),
  { default: () => ({ items: [], total: 0, page: 1, size: 5 }) }
)

type RecentDocument = {
  id: number
  module: 'BP21' | 'BP26'
  to: string
  recipient_name: string
  tax_month: number
  tax_year: number
  status: Bp21Read['status']
  income_tax: number
  score: number | null
  updated_at: string | null
  created_at: string | null
}

const bupotTotal = computed(() => bp21Summary.value.total + bp26Summary.value.total)
const issuedTotal = computed(() => bp21Summary.value.issued + bp26Summary.value.issued)
const draftTotal = computed(() => bp21Summary.value.draft + bp26Summary.value.draft)
const invalidTotal = computed(() => bp21Summary.value.invalid + bp26Summary.value.invalid)

const statCards = computed(() => [
  {
    label: 'Kelas Saya',
    value: summary.value?.classes ?? 0,
    icon: 'i-lucide-book-open',
    tone: 'info'
  },
  {
    label: 'Total e-Bupot',
    value: bupotTotal.value,
    icon: 'i-lucide-scroll-text',
    tone: 'primary'
  },
  {
    label: 'Telah Terbit',
    value: issuedTotal.value,
    icon: 'i-lucide-badge-check',
    tone: 'success'
  },
  {
    label: 'Perlu Diselesaikan',
    value: draftTotal.value + invalidTotal.value,
    icon: 'i-lucide-triangle-alert',
    tone: 'warning'
  }
])

const modules = computed(() => [
  {
    title: 'BP21',
    description: 'Bukti pemotongan selain pegawai tetap',
    to: '/siswa/bp21',
    icon: 'i-lucide-file-text',
    summary: bp21Summary.value
  },
  {
    title: 'BP26',
    description: 'Bukti pemotongan wajib pajak luar negeri',
    to: '/siswa/bp26',
    icon: 'i-lucide-globe',
    summary: bp26Summary.value
  }
])

const recentDocuments = computed<RecentDocument[]>(() => {
  const bp21 = bp21List.value.items.map((item: Bp21Read) => ({
    ...item,
    module: 'BP21' as const,
    to: '/siswa/bp21'
  }))
  const bp26 = bp26List.value.items.map((item: Bp26Read) => ({
    ...item,
    module: 'BP26' as const,
    to: '/siswa/bp26'
  }))

  return [...bp21, ...bp26]
    .sort((a, b) => {
      const left = a.updated_at || a.created_at || ''
      const right = b.updated_at || b.created_at || ''
      return right.localeCompare(left)
    })
    .slice(0, 6)
})

const isDocumentsLoading = computed(
  () => bp21Status.value === 'pending' || bp26Status.value === 'pending'
)
</script>

<template>
  <div class="siswa-dashboard">
    <section class="siswa-dashboard__hero">
      <div>
        <p>{{ auth.user.value?.tenant_name || 'Institusi Simulasi' }}</p>
        <h1>Dasbor Siswa</h1>
        <span>{{ auth.user.value?.full_name }}</span>
      </div>
      <div class="siswa-dashboard__hero-actions">
        <UButton to="/siswa/bp21/create" icon="i-lucide-file-plus-2" label="Buat BP21" />
        <UButton
          to="/siswa/bp26/create"
          icon="i-lucide-file-plus-2"
          label="Buat BP26"
          color="neutral"
          variant="outline"
        />
      </div>
    </section>

    <section class="siswa-dashboard__stats" aria-label="Ringkasan siswa">
      <div v-for="card in statCards" :key="card.label" class="siswa-dashboard__stat">
        <div :class="['siswa-dashboard__stat-icon', `is-${card.tone}`]">
          <UIcon :name="card.icon" class="size-5" />
        </div>
        <div>
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </div>
      </div>
    </section>

    <section class="siswa-dashboard__grid">
      <div class="siswa-dashboard__panel">
        <header>
          <div>
            <h2>Simulasi yang Aktif</h2>
            <p>Masuk ke modul latihan yang paling sering dipakai.</p>
          </div>
        </header>

        <div class="siswa-dashboard__modules">
          <NuxtLink
            v-for="item in modules"
            :key="item.title"
            :to="item.to"
            class="siswa-dashboard__module"
          >
            <div class="siswa-dashboard__module-icon">
              <UIcon :name="item.icon" class="size-5" />
            </div>
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <div class="siswa-dashboard__module-counts">
              <UBadge color="warning" variant="subtle">{{ item.summary.draft }} konsep</UBadge>
              <UBadge color="success" variant="subtle">{{ item.summary.issued }} terbit</UBadge>
            </div>
            <UIcon name="i-lucide-arrow-right" class="size-5" />
          </NuxtLink>
        </div>
      </div>

      <div class="siswa-dashboard__panel">
        <header>
          <div>
            <h2>Dokumen Terbaru</h2>
            <p>BP21 dan BP26 yang terakhir Anda kerjakan.</p>
          </div>
        </header>

        <div v-if="isDocumentsLoading" class="siswa-dashboard__empty">Memuat dokumen...</div>
        <div v-else-if="recentDocuments.length === 0" class="siswa-dashboard__empty">
          Belum ada dokumen. Mulai dari BP21 atau BP26.
        </div>
        <ul v-else class="siswa-dashboard__documents">
          <li v-for="doc in recentDocuments" :key="`${doc.module}-${doc.id}`">
            <NuxtLink :to="doc.to">
              <div>
                <strong>{{ doc.module }}</strong>
                <span>{{ doc.recipient_name }}</span>
                <small>{{ formatPeriod(doc) }} · Rp {{ formatCurrency(doc.income_tax) }}</small>
              </div>
              <div class="siswa-dashboard__document-status">
                <UBadge :color="statusColor[doc.status]" variant="subtle">
                  {{ statusLabel[doc.status] }}
                </UBadge>
                <span v-if="doc.score !== null">Nilai {{ doc.score }}</span>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section class="siswa-dashboard__panel">
      <header>
        <div>
          <h2>Kelas yang Diikuti</h2>
          <p>Informasi kelas aktif untuk latihan pajak.</p>
        </div>
      </header>

      <div v-if="classesStatus === 'pending'" class="siswa-dashboard__empty">Memuat kelas...</div>
      <div v-else-if="classes.length === 0" class="siswa-dashboard__empty">
        Anda belum terdaftar di kelas mana pun.
      </div>
      <ul v-else class="siswa-dashboard__classes">
        <li v-for="c in classes" :key="c.id">
          <div class="siswa-dashboard__class-icon">
            <UIcon name="i-lucide-book-open" class="size-5" />
          </div>
          <div>
            <strong>{{ c.name }}</strong>
            <span>Tahun Ajaran {{ c.academic_year }}</span>
          </div>
          <UBadge color="neutral" variant="subtle">Aktif</UBadge>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.siswa-dashboard {
  display: grid;
  gap: 1rem;
}

.siswa-dashboard__hero,
.siswa-dashboard__panel,
.siswa-dashboard__stat {
  border: 1px solid oklch(0.89 0.014 255);
  border-radius: 0.45rem;
  background: oklch(0.99 0.004 250);
}

.siswa-dashboard__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
}

.siswa-dashboard__hero p,
.siswa-dashboard__hero span,
.siswa-dashboard__panel header p,
.siswa-dashboard__stat span,
.siswa-dashboard__module span,
.siswa-dashboard__documents small,
.siswa-dashboard__classes span {
  color: oklch(0.45 0.045 260);
  font-size: 0.84rem;
}

.siswa-dashboard__hero h1 {
  color: oklch(0.27 0.075 270);
  font-size: 1.35rem;
  font-weight: 850;
}

.siswa-dashboard__hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.5rem;
}

.siswa-dashboard__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.siswa-dashboard__stat {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
}

.siswa-dashboard__stat strong {
  display: block;
  color: oklch(0.26 0.075 270);
  font-size: 1.55rem;
  line-height: 1;
}

.siswa-dashboard__stat-icon,
.siswa-dashboard__module-icon,
.siswa-dashboard__class-icon {
  display: grid;
  width: 2.45rem;
  height: 2.45rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.45rem;
  background: oklch(0.93 0.025 250);
  color: oklch(0.31 0.095 270);
}

.siswa-dashboard__stat-icon.is-success {
  background: oklch(0.94 0.04 150);
  color: oklch(0.36 0.1 150);
}

.siswa-dashboard__stat-icon.is-warning {
  background: oklch(0.96 0.055 92);
  color: oklch(0.42 0.09 80);
}

.siswa-dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(24rem, 0.9fr);
  gap: 1rem;
}

.siswa-dashboard__panel {
  overflow: hidden;
}

.siswa-dashboard__panel header {
  border-bottom: 1px solid oklch(0.9 0.013 255);
  padding: 0.9rem 1rem;
}

.siswa-dashboard__panel h2 {
  color: oklch(0.27 0.075 270);
  font-weight: 800;
}

.siswa-dashboard__modules,
.siswa-dashboard__documents,
.siswa-dashboard__classes {
  display: grid;
}

.siswa-dashboard__module,
.siswa-dashboard__documents a,
.siswa-dashboard__classes li {
  display: grid;
  align-items: center;
  gap: 0.8rem;
  border-bottom: 1px solid oklch(0.91 0.012 255);
  color: oklch(0.28 0.075 270);
  text-decoration: none;
}

.siswa-dashboard__module {
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  padding: 0.9rem 1rem;
}

.siswa-dashboard__module:hover,
.siswa-dashboard__documents a:hover {
  background: oklch(0.975 0.006 250);
}

.siswa-dashboard__module strong,
.siswa-dashboard__documents strong,
.siswa-dashboard__classes strong {
  display: block;
  font-weight: 800;
}

.siswa-dashboard__documents span,
.siswa-dashboard__documents small {
  display: block;
}

.siswa-dashboard__module-counts,
.siswa-dashboard__document-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.35rem;
}

.siswa-dashboard__documents a {
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.78rem 1rem;
}

.siswa-dashboard__document-status span {
  color: oklch(0.36 0.08 150);
  font-size: 0.78rem;
  font-weight: 750;
}

.siswa-dashboard__classes li {
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 0.85rem 1rem;
}

.siswa-dashboard__empty {
  color: oklch(0.45 0.045 260);
  font-size: 0.9rem;
  padding: 1.2rem;
  text-align: center;
}

@media (max-width: 1180px) {
  .siswa-dashboard__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .siswa-dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .siswa-dashboard__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .siswa-dashboard__hero-actions {
    justify-content: flex-start;
  }

  .siswa-dashboard__stats {
    grid-template-columns: 1fr;
  }

  .siswa-dashboard__module,
  .siswa-dashboard__documents a,
  .siswa-dashboard__classes li {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .siswa-dashboard__module-counts,
  .siswa-dashboard__document-status {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
