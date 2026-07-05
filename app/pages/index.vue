<script setup lang="ts">
// Landing router: send the user to their role dashboard.
// auth.global middleware guarantees a logged-in user here.
const auth = useAuth()

await navigateTo(roleHome(auth.user.value?.role), { replace: true })
</script>

<template>
  <div />
</template>
