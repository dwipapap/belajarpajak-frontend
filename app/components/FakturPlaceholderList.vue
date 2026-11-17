<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { fakturPlaceholders } from '~/utils/fakturPlaceholder'

// Empty list for e-Faktur menu entries that are not modelled yet.
const props = defineProps<{ slug: string }>()

const auth = useAuth()
const config = computed(() => fakturPlaceholders[props.slug]!)
const base = computed(() => (auth.user.value?.role === 'guru' ? '/guru' : '/siswa'))
const columns = computed<TableColumn<Record<string, string>>[]>(() =>
  config.value.columns.map(header => ({ accessorKey: header, header }))
)
const notAvailable = 'Belum tersedia di simulator'
</script>

<template>
  <div class="bupot-page">
    <div class="bupot-breadcrumb">
      <NuxtLink :to="base">Beranda</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <NuxtLink :to="`${base}/e-faktur`">e-Faktur</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <span>{{ config.group }}</span>
      <UIcon name="i-lucide-chevron-right" class="size-3.5" />
      <strong>{{ config.title }}</strong>
    </div>

    <div class="bupot-shell">
      <section class="bupot-main">
        <div class="bupot-main__header">
          <h1>{{ config.title }}</h1>
        </div>

        <div class="faktur-toolbar">
          <UTooltip v-for="button in config.toolbar" :key="button.label" :text="notAvailable">
            <span>
              <UButton
                :icon="button.icon"
                :trailing-icon="button.menu ? 'i-lucide-chevron-down' : undefined"
                :label="button.label"
                class="bupot-primary-button"
                disabled
              />
            </span>
          </UTooltip>
        </div>

        <div class="px-4 pb-3">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Fitur ini belum tersedia di simulator; daftar akan terisi pada pembaruan berikutnya."
          />
        </div>

        <div class="faktur-table">
          <UTable :data="[]" :columns="columns">
            <template #empty>
              <p class="py-8 text-center text-sm text-muted">
                Tidak ada data yang ditemukan.
              </p>
            </template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
