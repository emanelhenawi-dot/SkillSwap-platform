<script setup>
import { useRouter } from 'vue-router';
import AppLogo from './AppLogo.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const logout = () => {
  auth.logout();
  router.push('/login');
};
</script>

<template>
  <header class="header">
    <div class="container">
      <RouterLink to="/" style="text-decoration: none"><AppLogo /></RouterLink>
      <nav
  v-if="auth.user?.role === 'user'"
  class="header-nav"
>

  <RouterLink to="/app">
    {{ $t('common.home') }}
  </RouterLink>

  <RouterLink to="/videos">
    {{ $t('common.videos') }}
  </RouterLink>

  <RouterLink to="/skill-requests">
    {{ $t('requests.nav') }}
  </RouterLink>

  <RouterLink to="/wallet">
    {{ $t('wallet.nav') }}
  </RouterLink>

</nav>
      <div class="actions">
        <span class="badge">🛡 {{ $t('common.ssl') }}</span>
        <LanguageSwitcher />
        <button v-if="auth.user" class="btn ghost sm" @click="logout">{{ $t('common.logout') }}</button>
      </div>
    </div>
  </header>
</template>