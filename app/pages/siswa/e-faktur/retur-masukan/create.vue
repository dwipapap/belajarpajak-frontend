<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const invoiceId = computed(() => {
  const value = Number(route.query.faktur)
  return Number.isFinite(value) && value > 0 ? value : undefined
})
</script>

<template>
  <FakturReturMasukanForm :key="invoiceId ?? 'new'" :invoice-id="invoiceId" />
</template>
