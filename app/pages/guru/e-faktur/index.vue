<script setup lang="ts">
// Guru have no e-Faktur dashboard of their own yet — the only live module is
// Pajak Keluaran, so the menu entry lands straight on its monitor.
definePageMeta({ middleware: 'role', roles: ['guru'] })

await navigateTo('/guru/e-faktur/keluaran', { replace: true })
</script>

<template>
  <div />
</template>
