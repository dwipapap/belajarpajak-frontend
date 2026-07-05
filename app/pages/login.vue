<script setup lang="ts">
definePageMeta({ layout: false })

const auth = useAuth()

const state = reactive({
  email: '',
  password: '',
  tenant_slug: ''
})

function validate(state: { email?: string, password?: string }) {
  const errors: { name: string, message: string }[] = []
  if (!state.email) errors.push({ name: 'email', message: 'ID Pengguna wajib diisi' })
  if (!state.password) errors.push({ name: 'password', message: 'Kata sandi wajib diisi' })
  return errors
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const showPassword = ref(false)

async function onSubmit() {
  loading.value = true
  errorMessage.value = null
  try {
    const me = await auth.login(state.email, state.password, state.tenant_slug || undefined)
    await navigateTo(roleHome(me.role), { replace: true })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Login gagal. Periksa ID Pengguna dan kata sandi.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="app-login">
    <header class="app-login__header" aria-label="Header login">
      <div class="app-login__brand-row">
        <div class="app-login__crest" aria-hidden="true">
          <UIcon name="i-lucide-landmark" class="size-6" />
        </div>
        <span class="app-login__divider" aria-hidden="true" />
        <div class="app-login__brand-name">Sistem Pembelajaran Pajak Online</div>
      </div>
    </header>

    <section class="app-login__content">
      <div class="app-login__intro" aria-label="Informasi layanan">
        <div class="app-login__logo" aria-label="Sistem Pembelajaran Administrasi perpajakan">
          Sistem Pembelajaran Administrasi perpajakan
        </div>
        <h1>Konsultan Bisnis Sudarno</h1>
        <span class="app-login__accent" aria-hidden="true" />
      </div>

      <section class="app-login__panel" aria-labelledby="login-title">
        <h2 id="login-title">Selamat Datang!</h2>
        <p>Masuk untuk mengakses Sistem Pembelajaran Pajak Online</p>

        <UForm :state="state" :validate="validate" class="app-login__form" @submit="onSubmit">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UFormField name="email" label="ID Pengguna" required>
            <UInput
              v-model="state.email"
              icon="i-lucide-user"
              size="xl"
              placeholder="NIK/NPWP/NITKU identitas khusus untuk ILAP"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>

          <UFormField name="password" label="Kata Sandi" required>
            <UInput
              v-model="state.password"
              icon="i-lucide-lock-keyhole"
              size="xl"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Masukkan kata sandi Anda"
              autocomplete="current-password"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  @click="showPassword = !showPassword;"
                />
              </template>
            </UInput>
          </UFormField>

          <button class="app-login__forgot" type="button">Lupa Kata Sandi?</button>

          <UButton
            type="submit"
            label="Masuk"
            block
            :loading="loading"
            class="app-login__submit"
          />

        </UForm>
      </section>
    </section>

    <footer class="app-login__footer">
      2026 Projek Klien, Testing Build
    </footer>
  </main>
</template>

<style scoped>
.app-login {
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

.app-login::before,
.app-login::after {
  position: absolute;
  pointer-events: none;
  content: "";
}

.app-login::before {
  right: -7rem;
  bottom: -6rem;
  width: min(42vw, 42rem);
  aspect-ratio: 1;
  border: 2px solid oklch(0.96 0.01 255 / 0.42);
  border-radius: 36% 64% 48% 52%;
  box-shadow: inset 0 0 5rem oklch(0.67 0.035 255 / 0.14);
  transform: rotate(19deg);
}

.app-login::after {
  right: 7vw;
  top: 7vh;
  width: min(24vw, 27rem);
  aspect-ratio: 1.7;
  border: 2px solid oklch(0.99 0.006 250 / 0.5);
  border-radius: 52% 48% 59% 41%;
  transform: rotate(-10deg);
}

.app-login__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 3.5rem;
}

.app-login__brand-row,
.app-login__brand-name {
  display: flex;
  align-items: center;
}

.app-login__brand-row {
  gap: 1rem;
}

.app-login__crest {
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

.app-login__divider {
  width: 1px;
  height: 2.1rem;
  background: oklch(0.7 0.02 260);
}

.app-login__brand-name {
  color: oklch(0.31 0.095 270);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0;
}

.app-login__content {
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

.app-login__intro {
  display: grid;
  gap: 1.45rem;
}

.app-login__logo {
  color: oklch(0.31 0.095 270);
  font-size: 1.95rem;
  font-weight: 850;
  line-height: 1.12;
}

.app-login__intro h1 {
  max-width: 31rem;
  color: oklch(0.31 0.1 270);
  font-size: 2.15rem;
  font-weight: 850;
  line-height: 1.12;
}

.app-login__accent {
  width: 3.5rem;
  height: 0.24rem;
  border-radius: 999px;
  background: oklch(0.86 0.16 86);
}

.app-login__panel {
  border: 1px solid oklch(0.99 0.004 250 / 0.72);
  border-radius: 1.25rem;
  background: oklch(0.982 0.006 250 / 0.88);
  padding: 2.35rem 2rem 2.5rem;
  box-shadow: 0 1.4rem 3.75rem oklch(0.36 0.05 255 / 0.2);
}

.app-login__panel h2 {
  margin: 0;
  color: oklch(0.31 0.095 270);
  font-size: 2rem;
  font-weight: 850;
  line-height: 1.05;
}

.app-login__panel > p {
  margin-top: 0.65rem;
  color: oklch(0.51 0.025 260);
  font-size: 0.95rem;
}

.app-login__form {
  margin-top: 1.45rem;
  display: grid;
  gap: 1.05rem;
}

.app-login__forgot {
  width: max-content;
  border: 0;
  background: transparent;
  color: oklch(0.31 0.095 270);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0;
}

.app-login__submit {
  min-height: 2.85rem;
  border-radius: 0.42rem;
  background: oklch(0.34 0.12 263);
  color: oklch(0.98 0.005 250);
  font-weight: 800;
  box-shadow: 0 0.85rem 1.5rem oklch(0.31 0.095 270 / 0.24);
}

.app-login__footer {
  position: absolute;
  z-index: 1;
  left: 3.5rem;
  bottom: 1.6rem;
  color: oklch(0.47 0.035 255);
  font-size: 0.78rem;
}

@media (max-width: 1024px) {
  .app-login__header {
    padding-inline: 1.4rem;
  }

  .app-login__content {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 1rem 1.4rem 6rem;
  }

  .app-login__intro {
    max-width: 32rem;
    margin-inline: auto;
  }

  .app-login__panel {
    width: min(100%, 29rem);
    margin-inline: auto;
  }

  .app-login__footer {
    left: 1.4rem;
  }
}

@media (max-width: 640px) {
  .app-login {
    overflow: auto;
  }

  .app-login__header {
    padding: 1rem;
  }

  .app-login__brand-row {
    gap: 0.7rem;
  }

  .app-login__crest {
    width: 2.3rem;
    height: 2.3rem;
  }

  .app-login__brand-name {
    font-size: 1.25rem;
  }

  .app-login__content {
    min-height: auto;
    padding: 0.75rem 1rem 5.5rem;
  }

  .app-login__intro h1 {
    font-size: 1.65rem;
  }

  .app-login__logo {
    font-size: 1.85rem;
  }

  .app-login__panel {
    border-radius: 1rem;
    padding: 1.5rem 1rem;
  }

  .app-login__panel h2 {
    font-size: 1.65rem;
  }

  .app-login__footer {
    right: 1rem;
    bottom: 1rem;
    left: 1rem;
  }
}
</style>
