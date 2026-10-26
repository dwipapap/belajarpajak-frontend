<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const identity = computed(() => String(route.params.identity))
const taxYear = computed(() => Number(route.query.tax_year ?? new Date().getFullYear()))
const dataKey = computed(() => `siswa-a2-detail-${identity.value}-${taxYear.value}`)
</script>

<template>
  <A1A2Detail
    form="A2"
    :identity="identity"
    :tax-year="taxYear"
    :data-key="dataKey"
    back-link="/siswa/a2"
  >
    <template #home-link>
      <NuxtLink to="/siswa">Beranda</NuxtLink>
    </template>
  </A1A2Detail>
</template>
