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
    <footer class="site-footer">
      <div class="footer-inner">
        <span class="safety-note">♧ {{ $t('common.safeguards') }}</span>
        <nav><a href="#safeguards">{{ $t('common.safetyHelp') }}</a><a href="#terms">{{ $t('common.terms') }}</a><a href="#privacy">{{ $t('common.privacy') }}</a></nav>
      </div>
    </footer>
  </template>
</template>