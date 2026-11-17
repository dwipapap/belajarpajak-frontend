<script setup lang="ts">
import type { DashQuotaUsage } from '~/types/api'

const props = defineProps<{ label: string, usage: DashQuotaUsage }>()

const percent = computed(() => quotaPercent(props.usage.used, props.usage.limit))
const fillClass = computed(() => quotaFillClass(props.usage.used, props.usage.limit))
</script>

<template>
  <div class="dash-meter">
    <div class="dash-meter__top">
      <span>{{ label }}</span>
      <strong>
        {{ usage.used }} / {{ usage.limit ?? 'Tanpa batas' }}
        <template v-if="usage.full"> (penuh)</template>
      </strong>
    </div>
    <div
      class="dash-meter__track"
      role="progressbar"
      :aria-label="`Pemakaian kuota ${label}`"
      aria-valuemin="0"
      :aria-valuemax="usage.limit ?? undefined"
      :aria-valuenow="usage.used"
    >
      <div class="dash-meter__fill" :class="fillClass" :style="{ width: `${usage.limit ? percent : 0}%` }" />
    </div>
  </div>
</template>
