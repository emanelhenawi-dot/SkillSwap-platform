<script setup>
import { ref, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const liveState = ref(''); // '' | pending | approved | declined | error
const error = ref('');
let timer;

async function requestLive() {
  error.value = '';
  try {
    const { data } = await api.post('/student/live/request');
    if (data.status === 'approved') return (liveState.value = 'approved');
    liveState.value = 'pending';
    timer = setInterval(async () => {
      const r = await api.get(`/student/live/request/${data.id}`);
      if (r.data.status !== 'pending') {
        liveState.value = r.data.status;
        clearInterval(timer);
      }
    }, 5000);
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  }
}

const demo = (type) => api.post('/student/activity', { type, title: 'Intro to Calculus' });
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="card">
    <h1>{{ t('student.welcome', { name: auth.user.name }) }}</h1>
    <p class="muted">{{ t('student.roleNote') }}</p>
    <p><span class="badge">{{ t('student.points') }}: {{ auth.user.points }}</span></p>

    <button class="btn" :disabled="liveState === 'pending'" @click="requestLive">{{ t('student.requestLive') }}</button>
    <div v-if="liveState === 'pending'" class="alert info">{{ t('student.waiting') }}</div>
    <div v-if="liveState === 'approved'" class="alert ok">{{ t('student.approved') }}</div>
    <div v-if="liveState === 'declined'" class="alert error">{{ t('student.declined') }}</div>
    <div v-if="error" class="alert error">{{ error }}</div>
  </div>

  <div v-if="auth.user.isMinor" class="card">
    <h2>{{ t('student.demo') }}</h2>
    <div class="row">
      <button class="btn ghost" @click="demo('watched')">{{ t('student.demoWatch') }}</button>
      <button class="btn ghost" @click="demo('posted')">{{ t('student.demoPost') }}</button>
    </div>
  </div>
</template>