<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['superadmin', 'admin', 'guru', 'siswa'] })

const auth = useAuth()
const toast = useToast()
const router = useRouter()

const state = reactive({
  current: '',
  next: '',
  confirm: ''
})

const loading = ref(false)

function validate(state: { current?: string, next?: string, confirm?: string }) {
  const errors: { name: string, message: string }[] = []
  if (!state.current) errors.push({ name: 'current', message: 'Kata sandi saat ini wajib diisi' })
  if (!state.next || state.next.length < 8) {
    errors.push({ name: 'next', message: 'Kata sandi baru minimal 8 karakter' })
  }
  if (state.next && state.next === state.current) {
    errors.push({ name: 'next', message: 'Kata sandi baru harus berbeda dari yang lama' })
  }
  if (state.confirm !== state.next) {
    errors.push({ name: 'confirm', message: 'Konfirmasi kata sandi tidak sama' })
  }
  return errors
}

async function onSubmit() {
  loading.value = true
  try {
    await auth.changePassword(state.current, state.next)
    toast.add({
      title: 'Kata sandi berhasil diubah',
      description: 'Selamat datang di Sistem Pembelajaran Pajak Online.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await router.replace(roleHome(auth.user.value?.role))
  } catch (error) {
    toast.add({
      title: 'Gagal mengubah kata sandi',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-16">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-warning/10 p-3">
            <UIcon name="i-lucide-key-round" class="size-6 text-warning" />
          </div>
          <div>
            <h1 class="font-semibold text-default">Ganti Kata Sandi</h1>
            <p class="text-sm text-muted">
              Akun Anda masih memakai kata sandi awal. Buat kata sandi pribadi untuk melanjutkan.
            </p>
          </div>
        </div>
      </template>

      <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
        <UFormField name="current" label="Kata Sandi Saat Ini" required>
          <UInput v-model="state.current" type="password" class="w-full" />
        </UFormField>
        <UFormField name="next" label="Kata Sandi Baru" required help="Minimal 8 karakter.">
          <UInput v-model="state.next" type="password" class="w-full" />
        </UFormField>
        <UFormField name="confirm" label="Konfirmasi Kata Sandi Baru" required>
          <UInput v-model="state.confirm" type="password" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Keluar"
            color="neutral"
            variant="ghost"
            @click="auth.logout()"
          />
          <UButton type="submit" label="Simpan Kata Sandi" :loading="loading" />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
