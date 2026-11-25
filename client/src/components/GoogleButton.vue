<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['credential']);
const box = ref(null);
const { locale } = useI18n();
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let initialized = false;

const loadScript = () =>
  new Promise((resolve) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    document.head.appendChild(s);
  });

function render() {
  if (!initialized) {
    window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => emit('credential', r.credential) });
    initialized = true;
  }
  box.value.innerHTML = '';
  window.google.accounts.id.renderButton(box.value, {
    theme: 'outline', size: 'large', width: 320, text: 'signin_with', locale: locale.value,
  });
}

onMounted(async () => {
  if (!clientId) return;
  await loadScript();
  render();
});
watch(locale, () => window.google?.accounts && clientId && render());
</script>

<template>
  <div style="display: flex; justify-content: center">
    <div ref="box"></div>
    <p v-if="!clientId" class="muted">Set VITE_GOOGLE_CLIENT_ID in client/.env</p>
  </div>
</template>