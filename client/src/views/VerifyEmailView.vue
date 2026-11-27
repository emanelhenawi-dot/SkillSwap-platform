<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';
import { useAuthStore, homeFor } from '../stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const digits = ref(Array(6).fill(''));
const boxes = ref([]);
const error = ref('');
const info = ref('');
const loading = ref(false);
const cooldown = ref(60); // الكود اتبعت لسه
let timer;

const code = computed(() => digits.value.join(''));
const ready = computed(() => /^\d{6}$/.test(code.value));

function startCooldown(sec = 60) {
  cooldown.value = sec;
  clearInterval(timer);
  timer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) clearInterval(timer);
  }, 1000);
}
onMounted(() => { startCooldown(60); boxes.value[0]?.focus(); });
onUnmounted(() => clearInterval(timer));

function onInput(i, e) {
  const v = e.target.value.replace(/\D/g, '').slice(-1);
  digits.value[i] = v;
  e.target.value = v;
  if (v && i < 5) boxes.value[i + 1]?.focus();
}
function onKey(i, e) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) boxes.value[i - 1]?.focus();
}
function onPaste(e) {
  const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
  if (!d) return;
  e.preventDefault();
  digits.value = Array.from({ length: 6 }, (_, i) => d[i] || '');
  boxes.value[Math.min(d.length, 5)]?.focus();
}

async function submit() {
  error.value = info.value = '';
  loading.value = true;
  try {
    const { data } = await api.post('/auth/verify-email', { code: code.value });
    auth.user = data.user;
    router.push(homeFor(data.user.role));
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  } finally {
    loading.value = false;
  }
}

async function resend() {
  error.value = info.value = '';
  try {
    await api.post('/auth/resend-code');
    info.value = t('verify.sent');
    digits.value = Array(6).fill('');
    boxes.value[0]?.focus();
    startCooldown(60);
  } catch (e) {
    error.value = t('errors.' + errCode(e));
  }
}

const logout = () => { auth.logout(); router.push('/login'); };
</script>

<template>
  <div class="card narrow">
    <p class="muted" style="margin: 0">{{ t('verify.kicker') }}</p>
    <h1>{{ t('verify.title') }}</h1>
    <p class="muted">{{ t('verify.sentTo', { email: auth.user?.email }) }}</p>

    <div class="otp" @paste="onPaste">
      <input
        v-for="(_, i) in digits" :key="i"
        :ref="(el) => (boxes[i] = el)"
        :value="digits[i]"
        inputmode="numeric" maxlength="1" autocomplete="one-time-code"
        :aria-label="`${i + 1}`"
        @input="onInput(i, $event)" @keydown="onKey(i, $event)"
      />
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="info" class="alert ok">{{ info }}</div>

    <button class="btn block" :disabled="!ready || loading" @click="submit">{{ t('verify.submit') }}</button>
    <button class="btn ghost block" :disabled="cooldown > 0" @click="resend">
      {{ cooldown > 0 ? t('verify.resendIn', { s: cooldown }) : t('verify.resend') }}
    </button>
    <p class="muted" style="text-align: center; margin-top: 14px">
      <a href="#" @click.prevent="logout">{{ t('common.logout') }}</a>
    </p>
  </div>
</template>