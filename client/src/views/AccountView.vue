<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const data = ref(null);
const profile = reactive({ name: '', phone: '' });
const pw = reactive({ current: '', next: '', confirm: '' });
const msg = reactive({ profile: '', pw: '', error: '' });

onMounted(async () => {
  try {
    data.value = (await api.get('/account')).data;
    profile.name = data.value.profile.name;
    profile.phone = data.value.profile.phone || '';
  } catch (e) {
    msg.error = t('errors.' + errCode(e));
  }
});

async function saveProfile() {
  msg.profile = msg.error = '';
  try {
    const r = await api.patch('/account', { name: profile.name, phone: profile.phone });
    auth.user = r.data.user;
    msg.profile = t('account.saved');
  } catch (e) {
    msg.error = t('errors.' + errCode(e));
  }
}

async function changePassword() {
  msg.pw = msg.error = '';
  if (pw.next !== pw.confirm) { msg.error = t('reset.noMatch'); return; }
  try {
    const r = await api.post('/account/change-password', { currentPassword: pw.current, newPassword: pw.next });
    auth.setSession(r.data.token, auth.user); // الجهاز ده يفضل مسجّل
    pw.current = pw.next = pw.confirm = '';
    msg.pw = t('account.pwChanged');
  } catch (e) {
    msg.error = t('errors.' + errCode(e));
  }
}
</script>

<template>
  <p class="muted">{{ t('account.kicker') }}</p>
  <h1>{{ t('account.title') }}</h1>
  <p class="muted">{{ t('account.sub') }}</p>
  <div v-if="msg.error" class="alert error">{{ msg.error }}</div>

  <div v-if="data" class="grid" style="margin-top: 16px">
    <div class="card">
      <h2>{{ t('account.profile') }}</h2>
      <form @submit.prevent="saveProfile">
        <label>{{ t('account.name') }}</label>
        <input v-model="profile.name" required minlength="2" maxlength="80" />
        <label>{{ t('account.email') }}</label>
        <input :value="data.profile.email" readonly />
        <label>{{ t('register.phone') }}</label>
        <input v-model="profile.phone" required inputmode="tel" />
        <div class="alert info">{{ t('account.nidPrivacy') }}</div>
        <div v-if="msg.profile" class="alert ok">{{ msg.profile }}</div>
        <button class="btn block">{{ t('common.save') }}</button>
      </form>
    </div>

    <div>
      <div class="card">
        <h2>{{ t('account.security') }}</h2>
        <form @submit.prevent="changePassword">
          <label>{{ t('account.currentPw') }}</label>
          <input v-model="pw.current" type="password" required autocomplete="current-password" />
          <label>{{ t('reset.new') }}</label>
          <input v-model="pw.next" type="password" required autocomplete="new-password" />
          <p class="muted">{{ t('reset.rules') }}</p>
          <label>{{ t('reset.confirm') }}</label>
          <input v-model="pw.confirm" type="password" required autocomplete="new-password" />
          <div v-if="msg.pw" class="alert ok">{{ msg.pw }}</div>
          <button class="btn block">{{ t('account.changePw') }}</button>
        </form>
      </div>

      <div v-if="data.profile.isMinor" class="card">
        <h2>{{ t('account.guardian') }}</h2>
        <div v-for="g in data.guardians" :key="g.email" class="list-item">
          <div><b>{{ g.name }}</b><br /><span class="muted">{{ g.email }}</span></div>
          <span class="badge approved">{{ t('account.linked') }}</span>
        </div>
        <div v-if="!data.guardians.length" class="list-item">
          <div><span class="muted">{{ data.pendingGuardianEmail }}</span></div>
          <span class="badge pending">{{ t('account.notLinked') }}</span>
        </div>
        <p class="muted" style="margin-top: 12px">{{ t('account.guardianNote') }}</p>
      </div>
    </div>
  </div>
</template>