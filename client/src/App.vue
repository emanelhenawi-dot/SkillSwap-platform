<script setup>
import { ref, onMounted } from 'vue';
import SplashScreen from './components/SplashScreen.vue';
import AppHeader from './components/AppHeader.vue';

const ready = ref(false);
onMounted(() => setTimeout(() => (ready.value = true), 1800)); // اللوجو الأول
</script>

<template>
  <SplashScreen v-if="!ready" />
  <template v-else>
    <AppHeader />
    <main class="container"><RouterView /></main>
  </template>
</template>