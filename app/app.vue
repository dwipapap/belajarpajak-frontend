<template>
  <UApp :locale="id">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { id } from '@nuxt/ui/locale'

useHead({
  title: 'Simulator Pajak',
  htmlAttrs: { lang: 'id' }
})
</script>
