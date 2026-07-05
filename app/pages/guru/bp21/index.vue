<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <BupotGuruMonitor module="bp21" />
</template>
