<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const auth = useAuth()

const schema = z.object({
  email: z.string().min(1, 'ID Pengguna wajib diisi'),
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
const showPassword = ref(false)

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
    errorMessage.value = apiErrorMessage(error, 'Login gagal. Periksa ID Pengguna dan kata sandi.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="coretax-login">
    <header class="coretax-login__header" aria-label="Header login">
      <div class="coretax-login__brand-row">
        <div class="coretax-login__crest" aria-hidden="true">
          <UIcon name="i-lucide-landmark" class="size-6" />
        </div>
        <span class="coretax-login__divider" aria-hidden="true" />
        <div class="coretax-login__djp-mark" aria-label="Logo layanan">
          <span class="coretax-login__djp-symbol" aria-hidden="true" />
        </div>
      </div>
      <button class="coretax-login__language" type="button" aria-label="Pilih bahasa">
        <span class="coretax-login__flag" aria-hidden="true" />
        <span>ID</span>
        <UIcon name="i-lucide-chevron-down" class="size-4" />
      </button>
    </header>

    <section class="coretax-login__content">
      <div class="coretax-login__intro" aria-label="Informasi layanan Coretax">
        <div class="coretax-login__logo" aria-label="Sistem Pembelajaran Administrasi perpajakan">
          Sistem Pembelajaran Administrasi perpajakan
        </div>
        <h1>Konsultan Bisnis Sudarno</h1>
        <span class="coretax-login__accent" aria-hidden="true" />
      </div>

      <section class="coretax-login__panel" aria-labelledby="login-title">
        <h2 id="login-title">Selamat Datang!</h2>
        <p>Masuk untuk mengakses Layanan Coretax DJP</p>

        <UForm :schema="schema" :state="state" class="coretax-login__form" @submit="onSubmit">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UFormField name="email" label="ID Pengguna" required>
            <div class="coretax-login__input-wrap">
              <UIcon name="i-lucide-user" class="coretax-login__input-icon" />
              <input
                v-model="state.email"
                class="coretax-login__input"
                type="text"
                placeholder="NIK/NPWP/NITKU identitas khusus untuk ILAP"
                autocomplete="username"
              >
            </div>
          </UFormField>

          <UFormField name="password" label="Kata Sandi" required>
            <div class="coretax-login__input-wrap">
              <UIcon name="i-lucide-lock-keyhole" class="coretax-login__input-icon" />
              <input
                v-model="state.password"
                class="coretax-login__input coretax-login__input--with-action"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan kata sandi Anda"
                autocomplete="current-password"
              >
              <button
                class="coretax-login__input-action"
                type="button"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showPassword = !showPassword"
              >
                <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-5" />
              </button>
            </div>
          </UFormField>

          <button class="coretax-login__forgot" type="button">Lupa Kata Sandi?</button>

          <UButton
            type="submit"
            label="Masuk"
            block
            :loading="loading"
            class="coretax-login__submit"
          />

        </UForm>
      </section>
    </section>

    <footer class="coretax-login__footer">
      2026 Projek Klien, Testing Build
    </footer>
  </main>
</template>

<style scoped>
.coretax-login {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at 4% 8%, oklch(0.95 0.055 95 / 0.78), transparent 24rem),
    radial-gradient(circle at 96% 70%, oklch(0.79 0.038 265 / 0.72), transparent 31rem),
    linear-gradient(126deg, oklch(0.985 0.006 250), oklch(0.952 0.013 245) 54%, oklch(0.887 0.03 255));
  color: oklch(0.25 0.075 270);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.coretax-login::before,
.coretax-login::after {
  position: absolute;
  pointer-events: none;
  content: "";
}

.coretax-login::before {
  right: -7rem;
  bottom: -6rem;
  width: min(42vw, 42rem);
  aspect-ratio: 1;
  border: 2px solid oklch(0.96 0.01 255 / 0.42);
  border-radius: 36% 64% 48% 52%;
  box-shadow: inset 0 0 5rem oklch(0.67 0.035 255 / 0.14);
  transform: rotate(19deg);
}

.coretax-login::after {
  right: 7vw;
  top: 7vh;
  width: min(24vw, 27rem);
  aspect-ratio: 1.7;
  border: 2px solid oklch(0.99 0.006 250 / 0.5);
  border-radius: 52% 48% 59% 41%;
  transform: rotate(-10deg);
}

.coretax-login__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 3.5rem;
}

.coretax-login__brand-row,
.coretax-login__djp-mark,
.coretax-login__language {
  display: flex;
  align-items: center;
}

.coretax-login__brand-row {
  gap: 1rem;
}

.coretax-login__crest {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border: 2px solid oklch(0.94 0.08 84);
  border-radius: 0.65rem;
  background: linear-gradient(145deg, oklch(0.46 0.13 257), oklch(0.29 0.1 265));
  color: oklch(0.93 0.14 92);
  box-shadow: 0 0.75rem 1.5rem oklch(0.5 0.04 250 / 0.13);
}

.coretax-login__divider {
  width: 1px;
  height: 2.1rem;
  background: oklch(0.7 0.02 260);
}

.coretax-login__djp-mark {
  color: oklch(0.31 0.095 270);
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: 0;
}

.coretax-login__djp-symbol {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 0.35rem;
  background:
    linear-gradient(90deg, oklch(0.93 0.16 93) 0 42%, transparent 42%),
    linear-gradient(180deg, transparent 0 47%, oklch(0.34 0.13 263) 47%),
    oklch(0.95 0.006 250);
  box-shadow: inset 0 0 0 0.2rem oklch(0.97 0.007 250);
}

.coretax-login__language {
  gap: 0.45rem;
  min-height: 2.6rem;
  border: 0;
  border-radius: 999px;
  background: oklch(0.99 0.004 250 / 0.96);
  color: oklch(0.31 0.095 270);
  padding: 0 0.85rem;
  font-weight: 700;
  box-shadow: 0 1rem 2.25rem oklch(0.45 0.03 260 / 0.11);
}

.coretax-login__flag {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  background: linear-gradient(180deg, oklch(0.61 0.23 28) 0 50%, oklch(0.99 0.004 250) 50%);
  box-shadow: 0 0 0 1px oklch(0.86 0.01 250);
}

.coretax-login__content {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: calc(100dvh - 8rem);
  grid-template-columns: minmax(20rem, 35rem) minmax(23rem, 29rem);
  align-items: center;
  justify-content: center;
  gap: 11vw;
  padding: 1.5rem 4rem 5.2rem;
}

.coretax-login__intro {
  display: grid;
  gap: 1.45rem;
}

.coretax-login__logo {
  color: oklch(0.31 0.095 270);
  font-size: 1.95rem;
  font-weight: 850;
  line-height: 1.12;
}

.coretax-login__intro h1 {
  max-width: 31rem;
  color: oklch(0.31 0.1 270);
  font-size: 2.15rem;
  font-weight: 850;
  line-height: 1.12;
}

.coretax-login__accent {
  width: 3.5rem;
  height: 0.24rem;
  border-radius: 999px;
  background: oklch(0.86 0.16 86);
}

.coretax-login__panel {
  border: 1px solid oklch(0.99 0.004 250 / 0.72);
  border-radius: 1.25rem;
  background: oklch(0.982 0.006 250 / 0.88);
  padding: 2.35rem 2rem 2.5rem;
  box-shadow: 0 1.4rem 3.75rem oklch(0.36 0.05 255 / 0.2);
}

.coretax-login__panel h2 {
  margin: 0;
  color: oklch(0.31 0.095 270);
  font-size: 2rem;
  font-weight: 850;
  line-height: 1.05;
}

.coretax-login__panel > p {
  margin-top: 0.65rem;
  color: oklch(0.51 0.025 260);
  font-size: 0.95rem;
}

.coretax-login__form {
  margin-top: 1.45rem;
  display: grid;
  gap: 1.05rem;
}

.coretax-login__input-wrap {
  position: relative;
}

.coretax-login__input-icon,
.coretax-login__input-action {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.coretax-login__input-icon {
  left: 1rem;
  width: 1.1rem;
  height: 1.1rem;
  color: oklch(0.31 0.095 270);
}

.coretax-login__input {
  width: 100%;
  height: 2.75rem;
  border: 1px solid oklch(0.83 0.018 258);
  border-radius: 0.42rem;
  background: oklch(0.99 0.004 250 / 0.84);
  color: oklch(0.25 0.075 270);
  font-size: 0.92rem;
  outline: none;
  padding: 0 1rem 0 3.2rem;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.coretax-login__input--with-action {
  padding-right: 3.15rem;
}

.coretax-login__input::placeholder {
  color: oklch(0.64 0.035 260);
}

.coretax-login__input:focus {
  border-color: oklch(0.55 0.13 252);
  background: oklch(0.995 0.004 250);
  box-shadow: 0 0 0 3px oklch(0.64 0.12 245 / 0.18);
}

.coretax-login__input-action {
  right: 0;
  display: grid;
  width: 3rem;
  height: 2.75rem;
  place-items: center;
  border: 0;
  border-radius: 0 0.42rem 0.42rem 0;
  background: oklch(0.96 0.009 255);
  color: oklch(0.31 0.095 270);
}

.coretax-login__forgot {
  width: max-content;
  border: 0;
  background: transparent;
  color: oklch(0.31 0.095 270);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0;
}

.coretax-login__submit {
  min-height: 2.85rem;
  border-radius: 0.42rem;
  background: oklch(0.34 0.12 263);
  color: oklch(0.98 0.005 250);
  font-weight: 800;
  box-shadow: 0 0.85rem 1.5rem oklch(0.31 0.095 270 / 0.24);
}

.coretax-login__footer {
  position: absolute;
  z-index: 1;
  left: 3.5rem;
  bottom: 1.6rem;
  color: oklch(0.47 0.035 255);
  font-size: 0.78rem;
}

@media (max-width: 1024px) {
  .coretax-login__header {
    padding-inline: 1.4rem;
  }

  .coretax-login__content {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 1rem 1.4rem 6rem;
  }

  .coretax-login__intro {
    max-width: 32rem;
    margin-inline: auto;
  }

  .coretax-login__panel {
    width: min(100%, 29rem);
    margin-inline: auto;
  }

  .coretax-login__footer {
    left: 1.4rem;
  }
}

@media (max-width: 640px) {
  .coretax-login {
    overflow: auto;
  }

  .coretax-login__header {
    padding: 1rem;
  }

  .coretax-login__brand-row {
    gap: 0.7rem;
  }

  .coretax-login__crest {
    width: 2.3rem;
    height: 2.3rem;
  }

  .coretax-login__djp-mark {
    font-size: 1.25rem;
  }

  .coretax-login__language {
    min-height: 2.35rem;
    padding-inline: 0.65rem;
  }

  .coretax-login__content {
    min-height: auto;
    padding: 0.75rem 1rem 5.5rem;
  }

  .coretax-login__intro h1 {
    font-size: 1.65rem;
  }

  .coretax-login__logo {
    font-size: 1.85rem;
  }

  .coretax-login__panel {
    border-radius: 1rem;
    padding: 1.5rem 1rem;
  }

  .coretax-login__panel h2 {
    font-size: 1.65rem;
  }

  .coretax-login__footer {
    right: 1rem;
    bottom: 1rem;
    left: 1rem;
  }
}
</style>
