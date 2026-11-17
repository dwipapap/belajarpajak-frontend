<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })
</script>

<template>
  <FakturReturList side="masukan" />
</template>
