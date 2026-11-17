<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })

const route = useRoute()
const returId = computed(() => Number(route.params.id))
</script>

<template>
  <FakturReturMasukanForm :retur-id="returId" />
</template>
