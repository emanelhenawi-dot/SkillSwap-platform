<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';

const { t } = useI18n();
const route = useRoute();
const token = String(route.query.token || '');
const email = String(route.query.email || '');

const password = ref('');
const confirm = ref('');
const show = ref(false);
const done = ref(false);
const error = ref('');
const loading = ref(false);

const rules = computed(() => {
  const p = password.value;
  return p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
});
const match = computed(() => !!confirm.value && password.value === confirm.value);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await api.post('/auth/reset-password', { token, password: password.value });
    done.value = true;
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card narrow">
    <template v-if="done">
      <p class="muted" style="margin: 0">{{ t('reset.doneKicker') }}</p>
      <h1>{{ t('reset.doneTitle') }}</h1>
      <p class="muted">{{ t('reset.doneSub') }}</p>
      <RouterLink to="/login" class="btn block">{{ t('reset.toLogin') }}</RouterLink>
    </template>

    <template v-else>
      <p class="muted" style="margin: 0">{{ t('reset.kicker') }}</p>
      <h1>{{ t('reset.title') }}</h1>
      <p v-if="email" class="muted">{{ t('reset.account', { email }) }}</p>

      <div v-if="!token" class="alert error">{{ t('errors.INVALID_RESET_TOKEN') }}</div>
      <form v-else @submit.prevent="submit">
        <label>{{ t('reset.new') }}</label>
        <div class="row">
          <input v-model="password" :type="show ? 'text' : 'password'" required autocomplete="new-password" />
          <button type="button" class="btn ghost sm" style="flex: 0" @click="show = !show">{{ show ? '🙈' : '👁' }}</button>
        </div>
        <p class="muted" :style="{ color: rules ? 'var(--ok)' : '' }">{{ rules ? t('reset.strong') : t('reset.rules') }}</p>

        <label>{{ t('reset.confirm') }}</label>
        <input v-model="confirm" :type="show ? 'text' : 'password'" required autocomplete="new-password" />
        <p v-if="confirm" class="muted" :style="{ color: match ? 'var(--ok)' : 'var(--danger)' }">
          {{ match ? t('reset.match') : t('reset.noMatch') }}
        </p>

        <div class="alert info">{{ t('reset.private') }}</div>
        <div v-if="error" class="alert error">{{ error }}</div>
        <button class="btn block" :disabled="!rules || !match || loading">{{ t('reset.submit') }}</button>
      </form>
    </template>
  </div>
</template>