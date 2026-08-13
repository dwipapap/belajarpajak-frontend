<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const invoiceId = computed(() => Number(route.params.id))
</script>

<template>
  <FakturKeluaranForm :invoice-id="invoiceId" />
</template>
