<script setup>
import { reactive, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';
import { useAuthStore, homeFor } from '../stores/auth';
import { parseNationalId } from '../utils/nationalId';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const pg = auth.pendingGoogle; // جاي من Google Sign-in

const form = reactive({
  name: pg?.name || '',
  email: pg?.email || route.query.email || '',
  phone: '',
  nationalId: '',
  password: '',
  accountType: route.query.type === 'parent' ? 'parent' : '',
});
const guardian = reactive({ email: '', phone: '', nationalId: '' });
const error = ref('');
const loading = ref(false);

// الـ System يحسب العمر تلقائي أول ما الرقم القومي يكتمل 14 رقم
const info = computed(() => (form.nationalId.length === 14 ? parseNationalId(form.nationalId) : null));
const nidInvalid = computed(() => form.nationalId.length === 14 && !info.value);
const isMinor = computed(() => !!info.value && info.value.age < 18);
const isAdult = computed(() => !!info.value && info.value.age >= 18);

const digits = (obj, key) => (obj[key] = obj[key].replace(/\D/g, '').slice(0, 14));

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const payload = { ...form };
    if (pg) {
      payload.googleCredential = pg.credential;
      delete payload.password;
    }
    if (isMinor.value) payload.guardian = { ...guardian };
    const { data } = await api.post('/auth/register', payload);
    auth.pendingGoogle = null;
    auth.setSession(data.token, data.user);
    router.push(homeFor(data.user.role));
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card narrow">
    <h1>{{ t('register.title') }}</h1>
    <p class="muted">{{ t('register.sub') }}</p>
    <div v-if="pg" class="alert info">{{ t('register.googleNote') }}</div>

    <form @submit.prevent="submit">
      <label>{{ t('register.name') }}</label>
      <input v-model="form.name" required autocomplete="name" />

      <label>{{ t('register.email') }}</label>
      <input v-model="form.email" type="email" required :readonly="!!pg" autocomplete="email" />

      <label>{{ t('register.phone') }}</label>
      <input v-model="form.phone" type="tel" required inputmode="tel" autocomplete="tel" />

      <label>{{ t('register.nid') }} <span class="muted">({{ t('register.nidHint') }})</span></label>
      <input v-model="form.nationalId" required inputmode="numeric" maxlength="14" @input="digits(form, 'nationalId')" />
      <div v-if="nidInvalid" class="alert error">{{ t('errors.INVALID_NID') }}</div>
      <div v-else-if="info" class="alert info">{{ t('register.age', { age: info.age }) }}</div>

      <template v-if="!pg">
        <label>{{ t('register.password') }}</label>
        <input v-model="form.password" type="password" minlength="8" required autocomplete="new-password" />
      </template>

      <!-- أقل من 18: خانات ولي الأمر -->
      <template v-if="isMinor">
        <h2 style="margin-top: 22px">{{ t('register.guardianTitle') }}</h2>
        <div class="alert info" style="margin-top: 0">{{ t('register.guardianNote') }}</div>
        <label>{{ t('register.gEmail') }}</label>
        <input v-model="guardian.email" type="email" required />
        <label>{{ t('register.gPhone') }}</label>
        <input v-model="guardian.phone" type="tel" required inputmode="tel" />
        <label>{{ t('register.gNid') }}</label>
        <input v-model="guardian.nationalId" required inputmode="numeric" maxlength="14" @input="digits(guardian, 'nationalId')" />
      </template>

      <!-- 18 فأكتر: Account Type -->
      <template v-if="isAdult">
        <label>{{ t('register.accountType') }}</label>
        <select v-model="form.accountType" required>
          <option value="" disabled>{{ t('register.choose') }}</option>
          <option value="student_creator">{{ t('register.studentCreator') }}</option>
          <option value="parent">{{ t('register.parent') }}</option>
        </select>
      </template>

      <div v-if="error" class="alert error">{{ error }}</div>
      <button class="btn block" :disabled="loading || !info">{{ t('register.submit') }}</button>
    </form>

    <p class="muted" style="text-align: center; margin-top: 16px">
      {{ t('register.haveAccount') }} <RouterLink to="/login">{{ t('register.login') }}</RouterLink>
    </p>
  </div>
</template>