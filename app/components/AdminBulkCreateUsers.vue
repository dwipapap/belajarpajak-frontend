<script setup lang="ts">
import type { Role, UserBulkResult } from '~/types/api'

/** Bulk provisioning of guru/siswa accounts with the bootstrap password. */
const props = defineProps<{
  /** Superadmin picks the target institution; admin is pinned to its own. */
  tenants?: { id: number, name: string }[]
}>()

const emit = defineEmits<{ created: [] }>()

const { apiFetch } = useApi()
const toast = useToast()

const open = ref(false)

function openModal() {
  open.value = true
}

function closeModal() {
  open.value = false
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}
const busy = ref(false)
const role = ref<Role>('siswa')
const tenantId = ref<number | undefined>(undefined)

interface Row {
  full_name: string
  email: string
  username: string
}

const rows = ref<Row[]>([
  { full_name: '', email: '', username: '' },
  { full_name: '', email: '', username: '' },
  { full_name: '', email: '', username: '' }
])

const roleOptions = [
  { label: 'Siswa', value: 'siswa' as Role },
  { label: 'Guru', value: 'guru' as Role }
]

const tenantOptions = computed(() => [
  { label: 'Pilih Instansi', value: undefined as number | undefined },
  ...(props.tenants ?? []).map(t => ({ label: t.name, value: t.id as number | undefined }))
])

function addRow() {
  rows.value.push({ full_name: '', email: '', username: '' })
}

function filledRows() {
  return rows.value.filter(r => r.full_name.trim())
}

function validate() {
  const errors: { name: string, message: string }[] = []
  if (!filledRows().length) {
    errors.push({ name: 'rows', message: 'Isi minimal satu baris akun' })
  }
  if (role.value === 'siswa') {
    for (const row of filledRows()) {
      if (!row.username.trim()) {
        errors.push({ name: 'rows', message: 'Setiap siswa wajib punya NISN/NIK (username)' })
        break
      }
    }
  } else {
    for (const row of filledRows()) {
      if (!row.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) {
        errors.push({ name: 'rows', message: 'Setiap guru wajib punya email yang valid' })
        break
      }
    }
  }
  if (props.tenants && tenantId.value === undefined) {
    errors.push({ name: 'tenant_id', message: 'Pilih instansi tujuan' })
  }
  return errors
}

async function onSubmit() {
  const errors = validate()
  const first = errors.at(0)
  if (first) {
    toast.add({ title: 'Periksa isian', description: first.message, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  busy.value = true
  try {
    const payload = {
      role: role.value,
      accounts: filledRows().map((row) => ({
        full_name: row.full_name.trim(),
        ...(role.value === 'guru' ? { email: row.email.trim() } : { username: row.username.trim() })
      })),
      ...(tenantId.value !== undefined ? { tenant_id: tenantId.value } : {})
    }
    const result = await apiFetch<UserBulkResult>('/api/v1/users/bulk', {
      method: 'POST',
      body: payload
    })
    toast.add({
      title: `${result.created} akun dibuat${result.failed ? `, ${result.failed} gagal` : ''}`,
      description: 'Kata sandi awal: Password123! — akun wajib menggantinya saat login pertama.',
      color: result.failed ? 'warning' : 'success',
      icon: 'i-lucide-users'
    })
    open.value = false
    rows.value = [
      { full_name: '', email: '', username: '' },
      { full_name: '', email: '', username: '' },
      { full_name: '', email: '', username: '' }
    ]
    emit('created')
  } catch (error) {
    toast.add({ title: 'Gagal membuat akun massal', description: apiErrorMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <span>
    <UButton icon="i-lucide-users" label="Tambah Akun Massal" color="neutral" variant="soft" @click="openModal" />

    <UModal v-model:open="open" title="Tambah Akun Massal">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Peran" required>
            <USelect v-model="role" :items="roleOptions" class="w-full" />
          </UFormField>
          <UFormField v-if="tenants" label="Instansi" required>
            <USelect v-model="tenantId" :items="tenantOptions" class="w-full" />
          </UFormField>
        </div>

        <p class="text-xs text-muted">
          {{ role === 'siswa'
            ? 'Siswa login dengan NIK/NISN (username).'
            : 'Guru login dengan email. Semua akun baru memakai kata sandi awal Password123! dan wajib menggantinya saat login pertama.' }}
        </p>

        <div class="space-y-2">
          <div v-for="(row, index) in rows" :key="index" class="flex items-center gap-2">
            <span class="w-5 text-xs text-muted">{{ index + 1 }}</span>
            <UInput v-model="row.full_name" placeholder="Nama lengkap" class="flex-1" size="sm" />
            <UInput
              v-if="role === 'guru'"
              v-model="row.email"
              placeholder="Email"
              class="flex-1"
              size="sm"
            />
            <UInput
              v-else
              v-model="row.username"
              placeholder="NISN/NIK"
              class="flex-1"
              size="sm"
            />
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="soft"
              :disabled="rows.length <= 1"
              @click="removeRow(index)"
            />
          </div>
        </div>
        <UButton icon="i-lucide-plus" size="xs" variant="soft" label="Tambah Baris" @click="addRow" />
      </div>
    </template>
    <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="ghost" @click="closeModal" />
          <UButton label="Buat Akun" :loading="busy" @click="onSubmit" />
        </div>
      </template>
    </UModal>
  </span>
</template>
