<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })
</script>

<template>
  <A1A2List form="A2" detail-base="/siswa/a2" data-key="siswa-a2-list">
    <template #home-link>
      <NuxtLink to="/siswa">Beranda</NuxtLink>
    </template>
  </A1A2List>
</template>
