<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Bp21ListResponse, Bp21Read, Bp21Status, Bp21Summary } from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<Bp21Status>('draft')
const page = ref(1)
const pageSize = 10

const { data: summary, refresh: refreshSummary } = useAsyncData(
  'siswa-bp21-summary',
  () => apiFetch<Bp21Summary>('/api/v1/bp21/summary'),
  { default: () => ({ draft: 0, issued: 0, invalid: 0, total: 0 }) }
)

const { data: bp21List, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-bp21-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize)
    })
    return apiFetch<Bp21ListResponse>(`/api/v1/bp21?${query.toString()}`)
  },
  { watch: [activeStatus, page] }
)

watch(activeStatus, () => {
  page.value = 1
})

const columns: TableColumn<Bp21Read>[] = [
  { accessorKey: 'tax_month', header: 'Masa Pajak' },
  { accessorKey: 'withholding_number', header: 'Nomor Pemotongan' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'recipient_identity_number', header: 'Nomor Identitas WP' },
  { accessorKey: 'recipient_name', header: 'Nama' },
  { accessorKey: 'ptkp_status', header: 'PTKP' },
  { accessorKey: 'tax_object_code', header: 'Kode Objek Pajak' },
  { accessorKey: 'dpp', header: 'DPP (Rp)' },
  { accessorKey: 'income_tax', header: 'PPh (Rp)' },
  { id: 'actions' }
]

async function issueSlip(slip: Bp21Read) {
  try {
    await apiFetch<Bp21Read>(`/api/v1/bp21/${slip.id}/issue`, { method: 'POST' })
    toast.add({
      title: 'BP21 diterbitkan',
      description: `Nomor pemotongan dibuat untuk ${slip.recipient_name}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await Promise.all([refreshList(), refreshSummary()])
  } catch (error) {
    toast.add({
      title: 'Gagal menerbitkan BP21',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function refreshAll() {
  await Promise.all([refreshList(), refreshSummary()])
}
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>eBupot</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>BP 21 - Bukti Pemotongan Selain Pegawai Tetap</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">
          BP 21 - Bukti Pemotongan Selain Pegawai Tetap
        </div>
        <nav class="bupot-side__tabs" aria-label="Status BP21">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeStatus === tab.value }"
            @click="activeStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
            <UBadge color="neutral" variant="subtle">
              {{ summary[tab.value] }}
            </UBadge>
          </button>
        </nav>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>EBUPOT BP21 {{ activeStatus === 'draft' ? 'NOT ISSUED' : statusLabel[activeStatus].toUpperCase() }}</h1>
          <div class="bupot-actions">
            <UButton
              to="/siswa/bp21/create"
              icon="i-lucide-plus"
              label="Create eBupot BP21"
              class="bupot-primary-button"
            />
            <UButton icon="i-lucide-trash-2" label="Hapus" color="neutral" disabled />
            <UButton icon="i-lucide-send" label="Terbitkan" color="neutral" disabled />
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="refreshAll" />
          </div>
        </div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" @click="refreshAll" />
          <UButton icon="i-lucide-file" color="neutral" variant="solid" disabled />
          <UButton icon="i-lucide-file-spreadsheet" color="success" variant="solid" disabled />
          <UButton icon="i-lucide-file-text" color="error" variant="solid" disabled />
          <UButton icon="i-lucide-filter-x" color="neutral" variant="soft" disabled />
        </div>

        <div class="bupot-table">
          <UTable
            :data="bp21List?.items ?? []"
            :columns="columns"
            :loading="listStatus === 'pending'"
          >
            <template #tax_month-cell="{ row }">
              <span class="font-medium">{{ formatPeriod(row.original) }}</span>
            </template>

            <template #withholding_number-cell="{ row }">
              <span>{{ row.original.withholding_number || '-' }}</span>
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="statusColor[row.original.status]" variant="subtle">
                {{ statusLabel[row.original.status] }}
              </UBadge>
            </template>

            <template #dpp-cell="{ row }">
              Rp {{ formatCurrency(row.original.dpp) }}
            </template>

            <template #ptkp_status-cell="{ row }">
              <UBadge color="neutral" variant="subtle">
                {{ row.original.ptkp_status || '-' }}
              </UBadge>
            </template>

            <template #income_tax-cell="{ row }">
              Rp {{ formatCurrency(row.original.income_tax) }}
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="row.original.status === 'draft'"
                  icon="i-lucide-send"
                  label="Terbitkan"
                  size="xs"
                  @click="issueSlip(row.original)"
                />
                <UBadge
                  v-else-if="row.original.score !== null"
                  color="success"
                  variant="subtle"
                >
                  Nilai {{ row.original.score }}
                </UBadge>
              </div>
            </template>

            <template #empty>
              <p class="py-8 text-center text-sm text-muted">
                Tidak ada data yang ditemukan.
              </p>
            </template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ bp21List?.total ?? 0 }} data</p>
          <UPagination
            v-model:page="page"
            :total="bp21List?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </section>
    </div>
  </div>
</template>
