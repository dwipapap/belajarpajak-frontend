<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <A1A2List form="A1" detail-base="/guru/a1" data-key="guru-a1-list">
    <template #home-link>
      <NuxtLink to="/guru">Beranda</NuxtLink>
    </template>
  </A1A2List>
</template>
