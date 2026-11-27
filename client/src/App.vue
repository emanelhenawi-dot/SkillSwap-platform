<script setup>
import { ref, onMounted } from 'vue';

import SplashScreen from './components/SplashScreen.vue';
import AppHeader from './components/AppHeader.vue';
import TutorChat from './components/TutorChat.vue';

import { useAuthStore } from './stores/auth';

const ready = ref(false);

const auth = useAuthStore();

onMounted(() => {
  setTimeout(() => {
    ready.value = true;
  }, 1800);
});
</script>

<template>

  <SplashScreen v-if="!ready" />

  <template v-else>

    <AppHeader />

    <main class="container">

      <RouterView />

    </main>

    <footer class="site-footer">

      <div class="footer-inner">

        <span class="safety-note">
          ♧ {{ $t('common.safeguards') }}
        </span>

        <nav>
          <a href="#safeguards">
            {{ $t('common.safetyHelp') }}
          </a>

          <a href="#terms">
            {{ $t('common.terms') }}
          </a>

          <a href="#privacy">
            {{ $t('common.privacy') }}
          </a>
        </nav>

      </div>

    </footer>

    <!-- AI Tutor for authenticated students/creators -->

    <TutorChat
      v-if="auth.user?.role === 'user'"
    />

  </template>

</template>