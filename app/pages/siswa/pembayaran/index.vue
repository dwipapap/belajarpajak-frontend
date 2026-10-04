<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  BillingListResponse,
  BillingRead,
  BillingStatus
} from '~/types/api'
import { billingStatusColor, billingStatusLabel, billingStatusTabs } from '~/utils/spt'

definePageMeta({ middleware: 'role', roles: ['siswa'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const activeStatus = ref<BillingStatus>('unpaid')
const page = ref(1)
const pageSize = ref(50)

const { data: billingList, status: listStatus, refresh: refreshList } = useAsyncData(
  'siswa-billing-list',
  () => {
    const query = new URLSearchParams({
      status: activeStatus.value,
      page: String(page.value),
      size: String(pageSize.value)
    })
    return apiFetch<BillingListResponse>(`/api/v1/billings?${query.toString()}`)
  },
  { watch: [activeStatus, page, pageSize] }
)

watch([activeStatus, pageSize], () => {
  page.value = 1
})

const payTarget = ref<BillingRead | null>(null)
const payOpen = ref(false)
const busy = ref(false)

function setPayTarget(row: BillingRead) {
  payTarget.value = row
  payOpen.value = true
}

function closePay() {
  payTarget.value = null
  payOpen.value = false
}

async function refresh() {
  await refreshList()
}

async function pay() {
  const target = payTarget.value
  if (!target) return
  busy.value = true
  try {
    await apiFetch(`/api/v1/billings/${target.id}/pay`, { method: 'POST' })
    toast.add({
      title: 'Pembayaran berhasil',
      description: 'SPT terkait kini berstatus Dilaporkan.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    closePay()
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membayar', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

const columns: TableColumn<BillingRead>[] = [
  { accessorKey: 'code', header: 'Kode Billing' },
  { accessorKey: 'masa_pajak', header: 'Masa Pajak' },
  { accessorKey: 'kap_kjs', header: 'KAP-KJS' },
  { accessorKey: 'amount', header: 'Nominal (Rp)' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'paid_at', header: 'Tanggal Bayar' },
  { id: 'actions' }
]
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink to="/siswa">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>Pembayaran</strong>
    </div>

    <div class="bupot-shell">
      <aside class="bupot-side">
        <div class="bupot-side__identity">
          <strong>{{ auth.user.value?.tenant_id ?? '0000000000000000' }}</strong>
          <span>{{ auth.user.value?.full_name }}</span>
        </div>
        <div class="bupot-side__title">Kode Billing</div>
        <nav class="bupot-side__tabs" aria-label="Status billing">
          <button
            v-for="tab in billingStatusTabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeStatus === tab.value }"
            @click="activeStatus = tab.value"
          >
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <section class="bupot-main">
        <div class="bupot-main__header"><h1>Daftar Kode Billing</h1></div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refresh" />
        </div>

        <div class="faktur-table">
          <UTable :data="billingList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #code-cell="{ row }">
              <span class="font-mono font-semibold">{{ row.original.code }}</span>
            </template>
            <template #masa_pajak-cell="{ row }">{{ formatMasaPajak(row.original.masa_pajak) }}</template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount) }}</template>
            <template #status-cell="{ row }">
              <UBadge :color="billingStatusColor[row.original.status]" variant="subtle">
                {{ billingStatusLabel[row.original.status] }}
              </UBadge>
            </template>
            <template #paid_at-cell="{ row }">
              <span v-if="row.original.paid_at">{{ new Date(row.original.paid_at).toLocaleDateString('id-ID') }}</span>
              <span v-else>-</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="row.original.status === 'unpaid'"
                  icon="i-lucide-badge-dollar-sign"
                  size="xs"
                  color="success"
                  label="Bayar"
                  @click="setPayTarget(row.original)"
                />
                <UButton
                  v-if="row.original.spt_id"
                  :to="`/siswa/spt/${row.original.spt_id}`"
                  icon="i-lucide-eye"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  label="Lihat SPT"
                />
              </div>
            </template>
            <template #empty><p class="py-8 text-center text-sm text-muted">Tidak ada kode billing.</p></template>
          </UTable>
        </div>

        <div class="bupot-footer">
          <p>Total: {{ billingList?.total ?? 0 }} data</p>
          <div class="flex items-center gap-3">
            <UPagination v-model:page="page" :total="billingList?.total ?? 0" :items-per-page="pageSize" />
            <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-20" />
          </div>
        </div>
      </section>
    </div>

    <UModal v-model:open="payOpen" title="Bayar Kode Billing">
      <template #body>
        <p class="text-sm">
          Set bayar kode billing
          <span v-if="payTarget" class="font-mono font-semibold">{{ payTarget.code }}</span>
          sebesar
          <strong v-if="payTarget">Rp {{ formatCurrency(payTarget.amount) }}</strong>?
          SPT terkait akan langsung dilaporkan.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closePay" />
          <UButton label="Bayar" color="success" :loading="busy" @click="pay" />
        </div>
      </template>
    </UModal>
  </div>
</template>
