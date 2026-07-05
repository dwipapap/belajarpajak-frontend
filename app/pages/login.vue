<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const auth = useAuth()

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
  tenant_slug: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: '',
  password: '',
  tenant_slug: ''
})

const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  errorMessage.value = null
  try {
    const me = await auth.login(
      event.data.email,
      event.data.password,
      event.data.tenant_slug || undefined
    )
    await navigateTo(roleHome(me.role), { replace: true })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Login gagal. Periksa email dan kata sandi.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <div class="text-center">
        <UIcon name="i-lucide-calculator" class="mx-auto size-8 text-primary" />
        <h1 class="mt-2 text-xl font-semibold text-default">Simulator Pajak</h1>
        <p class="mt-1 text-sm text-muted">Masuk ke akun Anda</p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
      />

      <UFormField name="email" label="Email" required>
        <UInput
          v-model="state.email"
          type="text"
          placeholder="nama@sekolah.sch.id"
          autocomplete="username"
          class="w-full"
        />
      </UFormField>

      <UFormField name="password" label="Kata Sandi" required>
        <UInput
          v-model="state.password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UFormField
        name="tenant_slug"
        label="Kode Sekolah/Lembaga"
        hint="Opsional"
        help="Isi jika email Anda terdaftar di lebih dari satu institusi."
      >
        <UInput v-model="state.tenant_slug" type="text" placeholder="mis. smkn1-pku" class="w-full" />
      </UFormField>

      <UButton type="submit" label="Masuk" block :loading="loading" />
    </UForm>
  </UCard>
</template>
