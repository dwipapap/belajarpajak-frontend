<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <DocumentGuruMonitor module="bp26" />
</template>
