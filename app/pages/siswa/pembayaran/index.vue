<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  BillingListResponse,
  BillingRead,
  BillingStatus
} from '~/types/api'
import { billingStatusTabs, isBillingExpired, kanalLabel, kanalOptions } from '~/utils/spt'

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
const payKanal = ref('teller')
const busy = ref(false)
const detailTarget = ref<BillingRead | null>(null)
const detailOpen = ref(false)

function setPayTarget(row: BillingRead) {
  payTarget.value = row
  payKanal.value = row.kanal || 'teller'
  payOpen.value = true
}

function openDetail(row: BillingRead) {
  detailTarget.value = row
  detailOpen.value = true
}

function closePay() {
  payTarget.value = null
  payOpen.value = false
}

function closeDetail() {
  detailOpen.value = false
}

async function refresh() {
  await refreshList()
}

/** BATAL: kembalikan SPT terkait ke konsep (membatalkan kode billing ini). */
async function batalBilling(row: BillingRead) {
  if (!row.spt_id) return
  busy.value = true
  try {
    await apiFetch(`/api/v1/spt/${row.spt_id}/batal`, { method: 'POST' })
    toast.add({ title: 'SPT dibatalkan ke konsep', color: 'success', icon: 'i-lucide-undo-2' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membatalkan SPT', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

async function downloadPdf(billing: BillingRead) {
  try {
    const blob = await apiFetch<Blob>(`/api/v1/billings/${billing.id}/pdf`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BILLING_${billing.code}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ title: 'Gagal mengunduh PDF', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

async function pay() {
  const target = payTarget.value
  if (!target) return
  busy.value = true
  try {
    await apiFetch(`/api/v1/billings/${target.id}/pay`, {
      method: 'POST',
      body: { kanal: payKanal.value }
    })
    // Bila billing berasal dari tagihan, lunaskan tagihan otomatis.
    if (target.tagihan_id) {
      try {
        await apiFetch(`/api/v1/tagihan/${target.tagihan_id}/lunaskan-dari-billing`, {
          method: 'POST',
          body: { billing_id: target.id }
        })
        toast.add({
          title: 'Pembayaran + pelunasan tagihan berhasil',
          description: `NTPN ${target.code} via ${kanalLabel(payKanal.value)}. Tagihan dilunasi otomatis.`,
          color: 'success',
          icon: 'i-lucide-check-circle'
        })
      } catch (lunaskanError) {
        toast.add({
          title: 'Billing lunas, pelunasan tagihan gagal',
          description: `${apiErrorMessage(lunaskanError)} — lunasi manual di menu Tagihan.`,
          color: 'warning',
          icon: 'i-lucide-triangle-alert'
        })
      }
    } else {
      toast.add({
        title: 'Pembayaran berhasil',
        description: target.spt_id ? 'SPT terkait kini berstatus Dilaporkan.' : `Billing mandiri lunas via ${kanalLabel(payKanal.value)}.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
    closePay()
    await refresh()
  } catch (error) {
    toast.add({ title: 'Gagal membayar', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

const columns: TableColumn<BillingRead>[] = [
  { accessorKey: 'code', header: 'Kode Billing / NTPN' },
  { accessorKey: 'masa_pajak', header: 'Masa Pajak' },
  { accessorKey: 'kap_kjs', header: 'KAP-KJS' },
  { accessorKey: 'amount', header: 'Nominal (Rp)' },
  { accessorKey: 'kanal', header: 'Kanal' },
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
        <div class="bupot-main__header">
          <div>
            <h1>Daftar Kode Billing</h1>
            <p class="text-sm text-muted">Billing SPT + mandiri + tagihan. Berlaku 14 hari (simulasi PENG-4/PJ/2025); guru menilai via SPT.</p>
            <p v-if="activeStatus === 'unpaid'" class="text-sm text-muted">Gunakan tombol BATAL untuk mengubah status SPT dari MENUNGGU PEMBAYARAN ke KONSEP.</p>
          </div>
          <div class="bupot-actions">
            <UButton to="/siswa/pembayaran/mandiri" icon="i-lucide-plus" label="Buat Billing Mandiri" class="bupot-primary-button" />
          </div>
        </div>

        <div class="bupot-toolbar">
          <UButton icon="i-lucide-refresh-cw" color="info" variant="soft" :loading="listStatus === 'pending'" @click="refresh" />
        </div>

        <div class="faktur-table">
          <UTable :data="billingList?.items ?? []" :columns="columns" :loading="listStatus === 'pending'">
            <template #code-cell="{ row }">
              <div class="flex flex-col">
                <button type="button" class="font-mono font-semibold text-left underline decoration-dotted" @click="openDetail(row.original)">
                  {{ row.original.code }}
                </button>
                <span v-if="row.original.ntpn" class="text-xs text-muted">NTPN: <span class="font-mono">{{ row.original.ntpn }}</span></span>
                <span v-if="row.original.no_bpn" class="text-xs text-muted">No. BPN: <span class="font-mono">{{ row.original.no_bpn }}</span></span>
                <span v-if="row.original.tagihan_id" class="text-xs text-muted">Tagihan #{{ row.original.tagihan_id }}</span>
              </div>
            </template>
            <template #masa_pajak-cell="{ row }">{{ formatMasaPajak(row.original.masa_pajak) }}</template>
            <template #amount-cell="{ row }">Rp {{ formatCurrency(row.original.amount) }}</template>
            <template #kanal-cell="{ row }">
              <span class="text-sm">{{ kanalLabel(row.original.kanal) }}</span>
            </template>
            <template #status-cell="{ row }">
              <div class="flex flex-col gap-1">
                <UBadge v-if="row.original.status === 'paid'" color="success" variant="subtle">Sudah Dibayar</UBadge>
                <UBadge v-else-if="row.original.status === 'cancelled'" color="neutral" variant="subtle">Dibatalkan</UBadge>
                <UBadge v-else-if="isBillingExpired(row.original.created_at, row.original.status)" color="error" variant="soft" title="Masa berlaku simulasi 14 hari habis — buat kode billing baru bila masih perlu membayar">
                  Kedaluwarsa — buat billing baru
                </UBadge>
                <UBadge v-else color="warning" variant="subtle">Belum Dibayar</UBadge>
                <UBadge v-if="!row.original.spt_id && !row.original.tagihan_id && row.original.status !== 'paid' && !isBillingExpired(row.original.created_at, row.original.status)" color="neutral" variant="subtle">
                  Mandiri
                </UBadge>
              </div>
            </template>
            <template #paid_at-cell="{ row }">
              <span v-if="row.original.paid_at">{{ new Date(row.original.paid_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}</span>
              <span v-else>—</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton icon="i-lucide-eye" size="xs" color="neutral" variant="soft" label="Detail" @click="openDetail(row.original)" />
                <UButton
                  icon="i-lucide-file-down"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  label="PDF"
                  @click="downloadPdf(row.original)"
                />
                <UButton
                  v-if="row.original.status === 'unpaid'"
                  icon="i-lucide-badge-dollar-sign"
                  size="xs"
                  color="success"
                  label="Bayar"
                  @click="setPayTarget(row.original)"
                />
                <UButton
                  v-if="row.original.status === 'unpaid' && row.original.spt_id"
                  icon="i-lucide-undo-2"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  label="Batal"
                  title="Gunakan tombol BATAL untuk mengubah status SPT dari MENUNGGU PEMBAYARAN ke KONSEP"
                  @click="batalBilling(row.original)"
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

    <!-- Modal bayar: pilih kanal -->
    <UModal v-model:open="payOpen" title="Bayar Kode Billing">
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm">
            Bayar kode billing
            <span v-if="payTarget" class="font-mono font-semibold">{{ payTarget.code }}</span>
            sebesar
            <strong v-if="payTarget">Rp {{ formatCurrency(payTarget.amount) }}</strong>?
            <span v-if="payTarget?.spt_id">SPT terkait akan langsung dilaporkan.</span>
            <span v-else-if="payTarget?.tagihan_id">Tagihan terkait akan dilunasi otomatis setelah bayar.</span>
            <span v-else>Billing mandiri ini tidak terikat SPT.</span>
          </p>
          <UFormField name="kanal" label="Kanal Pembayaran" required>
            <USelect v-model="payKanal" :items="kanalOptions" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closePay" />
          <UButton label="Bayar" color="success" :loading="busy" @click="pay" />
        </div>
      </template>
    </UModal>

    <!-- Modal detail: NTPN / No BPN / kanal / baris multi-KJS -->
    <UModal v-model:open="detailOpen" title="Detail Kode Billing">
      <template #body>
        <div v-if="detailTarget" class="flex flex-col gap-3 text-sm">
          <div class="grid grid-cols-2 gap-2">
            <div><p class="text-muted">Kode Billing</p><p class="font-mono font-semibold">{{ detailTarget.code }}</p></div>
            <div><p class="text-muted">Status</p><p>{{ detailTarget.status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar' }}</p></div>
            <div><p class="text-muted">NTPN</p><p class="font-mono">{{ detailTarget.ntpn || '—' }}</p></div>
            <div><p class="text-muted">No. BPN</p><p class="font-mono">{{ detailTarget.no_bpn || '—' }}</p></div>
            <div><p class="text-muted">Kanal</p><p>{{ kanalLabel(detailTarget.kanal) }}</p></div>
            <div><p class="text-muted">Metode</p><p>{{ detailTarget.metode || 'billing' }}</p></div>
            <div v-if="detailTarget.tagihan_id"><p class="text-muted">Tagihan</p><p>#{{ detailTarget.tagihan_id }}</p></div>
            <div><p class="text-muted">Nominal</p><p class="font-semibold">Rp {{ formatCurrency(detailTarget.amount) }}</p></div>
          </div>
          <div v-if="detailTarget.uraian"><p class="text-muted">Uraian</p><p>{{ detailTarget.uraian }}</p></div>
          <div>
            <p class="mb-1 font-semibold">Rincian Setoran ({{ detailTarget.lines?.length ?? 0 }} baris)</p>
            <table v-if="(detailTarget.lines?.length ?? 0) > 0" class="spt-table">
              <thead><tr><th>KAP-KJS</th><th>Masa Pajak</th><th class="text-right">Nominal (Rp)</th></tr></thead>
              <tbody>
                <tr v-for="line in detailTarget.lines" :key="line.id">
                  <td class="font-mono">{{ line.kap_kjs }}</td>
                  <td>{{ formatMasaPajak(line.masa_pajak) }}</td>
                  <td class="text-right">{{ formatCurrency(line.amount) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-muted">Satu baris: {{ detailTarget.kap_kjs }} · {{ formatMasaPajak(detailTarget.masa_pajak) }} · Rp {{ formatCurrency(detailTarget.amount) }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton label="Tutup" color="neutral" variant="ghost" @click="closeDetail" />
        </div>
      </template>
    </UModal>
  </div>
</template>
