<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <A1A2List form="A2" detail-base="/guru/a2" data-key="guru-a2-list">
    <template #home-link>
      <NuxtLink to="/guru">Beranda</NuxtLink>
    </template>
  </A1A2List>
</template>
