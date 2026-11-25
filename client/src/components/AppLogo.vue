<script setup>
defineProps({ size: { type: Number, default: 40 }, showText: { type: Boolean, default: true } });
</script>

<template>
  <div class="logo">
    <svg :width="size" :height="size" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#4338ca" />
      <path d="M13 19h20m0 0-5-5m5 5-5 5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M35 30H15m0 0 5-5m-5 5 5 5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <div v-if="showText">
      <b>SkillSwap</b>
      <small>{{ $t('common.tagline') }}</small>
    </div>
  </div>
</template>