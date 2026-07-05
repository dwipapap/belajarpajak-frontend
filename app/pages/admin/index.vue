<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  DashboardSummary,
  Role,
  Tenant,
  User,
  UserListResponse
} from '~/types/api'

definePageMeta({ middleware: 'role', roles: ['admin', 'superadmin'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const isSuperadmin = computed(() => auth.user.value?.role === 'superadmin')

// ---- Summary cards -------------------------------------------------------
const { data: summary, refresh: refreshSummary } = useAsyncData(
  'admin-summary',
  () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary')
)

const statCards = computed(() => {
  const s = summary.value
  if (!s) return []
  if (isSuperadmin.value) {
    return [
      { label: 'Institusi', value: s.tenants ?? 0, icon: 'i-lucide-building-2' },
      { label: 'Pengguna', value: s.users ?? 0, icon: 'i-lucide-users' },
      { label: 'Kelas', value: s.classes ?? 0, icon: 'i-lucide-book-open' }
    ]
  }
  return [
    { label: 'Guru', value: s.guru ?? 0, icon: 'i-lucide-user-check' },
    { label: 'Siswa', value: s.siswa ?? 0, icon: 'i-lucide-graduation-cap' },
    { label: 'Kelas', value: s.classes ?? 0, icon: 'i-lucide-book-open' }
  ]
})

// ---- Tenant switcher (superadmin only) ------------------------------------
const selectedTenantId = ref<number | undefined>(undefined)

const { data: tenants } = useAsyncData(
  'admin-tenants',
  async () => (isSuperadmin.value ? await apiFetch<Tenant[]>('/api/v1/tenants') : []),
  { default: () => [] as Tenant[] }
)

const tenantOptions = computed(() => [
  { label: 'Semua Institusi', value: undefined as number | undefined },
  ...tenants.value.map(t => ({ label: t.name, value: t.id as number | undefined }))
])

// ---- Users table (server-side pagination) ---------------------------------
const page = ref(1)
const pageSize = 10
const roleFilter = ref<Role | 'semua'>('semua')

const roleFilterOptions = [
  { label: 'Semua Peran', value: 'semua' },
  { label: 'Admin', value: 'admin' },
  { label: 'Guru', value: 'guru' },
  { label: 'Siswa', value: 'siswa' }
]

const { data: userList, status: usersStatus, refresh: refreshUsers } = useAsyncData(
  'admin-users',
  () => {
    const query = new URLSearchParams({ page: String(page.value), size: String(pageSize) })
    if (roleFilter.value !== 'semua') query.set('role', roleFilter.value)
    if (isSuperadmin.value && selectedTenantId.value !== undefined) {
      query.set('tenant_id', String(selectedTenantId.value))
    }
    return apiFetch<UserListResponse>(`/api/v1/users?${query.toString()}`)
  },
  { watch: [page, roleFilter, selectedTenantId] }
)

const columns: TableColumn<User>[] = [
  { accessorKey: 'full_name', header: 'Nama' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Peran' },
  { accessorKey: 'is_active', header: 'Status' }
]

// ---- "Tambah User" modal ---------------------------------------------------
const modalOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

function openModal() {
  createError.value = null
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

const newUser = reactive({
  full_name: '',
  email: '',
  password: '',
  role: 'siswa' as Role,
  tenant_id: undefined as number | undefined
})

const creatableRoles = computed(() =>
  isSuperadmin.value
    ? [
        { label: 'Admin', value: 'admin' },
        { label: 'Guru', value: 'guru' },
        { label: 'Siswa', value: 'siswa' }
      ]
    : [
        { label: 'Guru', value: 'guru' },
        { label: 'Siswa', value: 'siswa' }
      ]
)

function validateNewUser(state: Partial<typeof newUser>) {
  const errors: { name: string, message: string }[] = []
  if (!state.full_name) errors.push({ name: 'full_name', message: 'Nama wajib diisi' })
  if (!state.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) {
    errors.push({ name: 'email', message: 'Email tidak valid' })
  }
  if (!state.password || state.password.length < 8) {
    errors.push({ name: 'password', message: 'Kata sandi minimal 8 karakter' })
  }
  if (isSuperadmin.value && !state.tenant_id) {
    errors.push({ name: 'tenant_id', message: 'Pilih institusi tujuan' })
  }
  return errors
}

async function onCreateUser() {
  creating.value = true
  createError.value = null
  try {
    await apiFetch<User>('/api/v1/users', {
      method: 'POST',
      body: {
        full_name: newUser.full_name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        ...(isSuperadmin.value ? { tenant_id: newUser.tenant_id } : {})
      }
    })
    toast.add({
      title: 'Pengguna berhasil dibuat',
      description: newUser.email,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    modalOpen.value = false
    Object.assign(newUser, { full_name: '', email: '', password: '', role: 'siswa', tenant_id: undefined })
    await Promise.all([refreshUsers(), refreshSummary()])
  } catch (error) {
    createError.value = apiErrorMessage(error, 'Gagal membuat pengguna.')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold text-default">Dasbor Admin</h1>
      <USelect
        v-if="isSuperadmin"
        v-model="selectedTenantId"
        :items="tenantOptions"
        placeholder="Pilih institusi"
        class="w-56"
      />
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard v-for="card in statCards" :key="card.label">
        <div class="flex items-center gap-4">
          <div class="rounded-lg bg-primary/10 p-3">
            <UIcon :name="card.icon" class="size-6 text-primary" />
          </div>
          <div>
            <p class="text-sm text-muted">{{ card.label }}</p>
            <p class="text-2xl font-semibold text-default">{{ card.value }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Users table -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-semibold text-default">Pengguna</h2>
          <div class="flex items-center gap-2">
            <USelect v-model="roleFilter" :items="roleFilterOptions" class="w-40" />
            <UButton icon="i-lucide-plus" label="Tambah User" @click="openModal" />
          </div>
        </div>
      </template>

      <UTable
        :data="userList?.items ?? []"
        :columns="columns"
        :loading="usersStatus === 'pending'"
      >
        <template #role-cell="{ row }">
          <UBadge color="neutral" variant="subtle">{{ row.original.role }}</UBadge>
        </template>
        <template #is_active-cell="{ row }">
          <UBadge :color="row.original.is_active ? 'success' : 'neutral'" variant="subtle">
            {{ row.original.is_active ? 'Aktif' : 'Nonaktif' }}
          </UBadge>
        </template>
        <template #empty>
          <p class="py-6 text-center text-sm text-muted">Belum ada pengguna.</p>
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted">Total: {{ userList?.total ?? 0 }} pengguna</p>
          <UPagination
            v-model:page="page"
            :total="userList?.total ?? 0"
            :items-per-page="pageSize"
          />
        </div>
      </template>
    </UCard>

    <!-- Tambah User modal -->
    <UModal v-model:open="modalOpen" title="Tambah User" description="Buat akun baru untuk institusi Anda.">
      <template #body>
        <UForm :state="newUser" :validate="validateNewUser" class="space-y-4" @submit="onCreateUser">
          <UAlert
            v-if="createError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="createError"
          />

          <UFormField name="full_name" label="Nama Lengkap" required>
            <UInput v-model="newUser.full_name" class="w-full" />
          </UFormField>

          <UFormField name="email" label="Email" required>
            <UInput v-model="newUser.email" type="text" class="w-full" />
          </UFormField>

          <UFormField name="password" label="Kata Sandi" required help="Minimal 8 karakter.">
            <UInput v-model="newUser.password" type="password" class="w-full" />
          </UFormField>

          <UFormField name="role" label="Peran" required>
            <USelect v-model="newUser.role" :items="creatableRoles" class="w-full" />
          </UFormField>

          <UFormField v-if="isSuperadmin" name="tenant_id" label="Institusi" required>
            <USelect
              v-model="newUser.tenant_id"
              :items="tenants.map(t => ({ label: t.name, value: t.id }))"
              placeholder="Pilih institusi"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="Batal" color="neutral" variant="ghost" @click="closeModal" />
            <UButton type="submit" label="Simpan" :loading="creating" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
