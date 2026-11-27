<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';

const { t } = useI18n();
const email = ref('');
const sent = ref(false);
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await api.post('/auth/forgot-password', { email: email.value });
    sent.value = true; // نفس الرسالة دايماً (للخصوصية)
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card narrow">
    <p class="muted" style="margin: 0">{{ t('forgot.kicker') }}</p>
    <h1>{{ t('forgot.title') }}</h1>
    <p class="muted">{{ t('forgot.sub') }}</p>

    <div v-if="sent" class="alert ok">{{ t('forgot.done') }}</div>
    <form v-else @submit.prevent="submit">
      <label>{{ t('login.email') }}</label>
      <input v-model="email" type="email" required autocomplete="username" />
      <p class="muted">{{ t('forgot.hint') }}</p>
      <div v-if="error" class="alert error">{{ error }}</div>
      <button class="btn block" :disabled="loading">{{ t('forgot.submit') }}</button>
    </form>

    <p class="muted" style="text-align: center; margin-top: 18px">
      <RouterLink to="/login">{{ t('forgot.back') }}</RouterLink>
    </p>
  </div>
</template>