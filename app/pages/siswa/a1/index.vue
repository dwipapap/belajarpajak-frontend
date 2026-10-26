<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['siswa'] })
</script>

<template>
  <A1A2List form="A1" detail-base="/siswa/a1" data-key="siswa-a1-list">
    <template #home-link>
      <NuxtLink to="/siswa">Beranda</NuxtLink>
    </template>
  </A1A2List>
</template>
