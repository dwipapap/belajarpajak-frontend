<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <FakturReturList side="masukan" />
</template>
