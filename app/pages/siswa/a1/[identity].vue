<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const identity = computed(() => String(route.params.identity))
const taxYear = computed(() => Number(route.query.tax_year ?? new Date().getFullYear()))
const dataKey = computed(() => `siswa-a1-detail-${identity.value}-${taxYear.value}`)
</script>

<template>
  <A1A2Detail
    form="A1"
    :identity="identity"
    :tax-year="taxYear"
    :data-key="dataKey"
    back-link="/siswa/a1"
  >
    <template #home-link>
      <NuxtLink to="/siswa">Beranda</NuxtLink>
    </template>
  </A1A2Detail>
</template>
