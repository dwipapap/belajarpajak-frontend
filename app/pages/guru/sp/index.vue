<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <DocumentGuruMonitor module="sp" label="SP" group="eBupot" />
</template>
