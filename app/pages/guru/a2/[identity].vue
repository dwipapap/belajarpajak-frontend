<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })

const route = useRoute()
const identity = computed(() => String(route.params.identity))
const taxYear = computed(() => Number(route.query.tax_year ?? new Date().getFullYear()))
const dataKey = computed(() => `guru-a2-detail-${identity.value}-${taxYear.value}`)
</script>

<template>
  <A1A2Detail
    form="A2"
    :identity="identity"
    :tax-year="taxYear"
    :data-key="dataKey"
    back-link="/guru/a2"
  >
    <template #home-link>
      <NuxtLink to="/guru">Beranda</NuxtLink>
    </template>
  </A1A2Detail>
</template>
