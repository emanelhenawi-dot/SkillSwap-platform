<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';
import { useAuthStore, homeFor } from '../stores/auth';
import GoogleButton from '../components/GoogleButton.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const form = reactive({ email: '', nationalId: '', password: '' });
const showPass = ref(false);
const error = ref('');
const loading = ref(false);

// أول ما الإيميل = إيميل الأدمن، خانة الرقم القومي بتختفي
const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
const isAdmin = computed(() => !!adminEmail && form.email.trim().toLowerCase() === adminEmail);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const payload = { email: form.email, password: form.password };
    if (!isAdmin.value) payload.nationalId = form.nationalId;
    const { data } = await api.post('/auth/login', payload);
    auth.setSession(data.token, data.user);
    router.push(homeFor(data.user.role));
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  } finally {
    loading.value = false;
  }
}

async function google(credential) {
  error.value = '';
  try {
    const { data } = await api.post('/auth/google', { credential });
    if (data.needsRegistration) {
      auth.pendingGoogle = { credential, ...data.profile };
      router.push('/register');
    } else {
      auth.setSession(data.token, data.user);
      router.push(homeFor(data.user.role));
    }
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  }
}
</script>

<template>
  <div class="card narrow">
    <h1>{{ t('login.title') }}</h1>
    <p class="muted">{{ t('login.sub') }}</p>

    <form @submit.prevent="submit">
      <label>{{ t('login.email') }}</label>
      <input v-model="form.email" type="email" required autocomplete="username" />

      <template v-if="!isAdmin">
        <label>{{ t('login.nid') }}</label>
        <input v-model="form.nationalId" required inputmode="numeric" maxlength="14" @input="form.nationalId = form.nationalId.replace(/\D/g, '')" />
      </template>
      <div v-else class="alert info">{{ t('login.adminMode') }}</div>

      <label>{{ t('login.password') }}</label>
      <div class="row">
        <input v-model="form.password" :type="showPass ? 'text' : 'password'" required autocomplete="current-password" />
        <button type="button" class="btn ghost sm" style="flex: 0" @click="showPass = !showPass">{{ showPass ? '🙈' : '👁' }}</button>
      </div>

      <div v-if="error" class="alert error">{{ error }}</div>
      <button class="btn block" :disabled="loading">{{ t('login.submit') }}</button>
    </form>

    <div class="divider"><span>{{ t('login.or') }}</span></div>
    <GoogleButton @credential="google" />

    <p class="muted" style="text-align: center; margin-top: 18px">
      {{ t('login.noAccount') }} <RouterLink to="/register">{{ t('login.create') }}</RouterLink>
    </p>
  </div>
</template>