<script setup>
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../services/api';

const props = defineProps({ videoId: { type: String, default: '' } });
const { locale } = useI18n();
const L = (ar, en) => (locale.value === 'ar' ? ar : en);

const open = ref(false);
const input = ref('');
const busy = ref(false);
const logEl = ref(null);
const msgs = ref([]);

function toggle() {
  open.value = !open.value;
  if (open.value && !msgs.value.length) msgs.value.push({ role: 'bot', text: L('أهلاً! أنا معلّمك الذكي. اسألني عن الدرس 👋', "Hi! I'm your AI tutor. Ask me about this lesson 👋") });
}
const scroll = () => nextTick(() => logEl.value && (logEl.value.scrollTop = logEl.value.scrollHeight));

async function send() {
  const text = input.value.trim();
  if (!text || busy.value) return;
  msgs.value.push({ role: 'user', text });
  input.value = '';
  busy.value = true;
  scroll();
  try {
    const { data } = await api.post('/ai/chat', { message: text, videoId: props.videoId || undefined });
    msgs.value.push({ role: 'bot', text: data.reply });
  } catch (e) {
    const c = errCode(e);
    msgs.value.push({ role: 'err', text: c === 'TOO_MANY_REQUESTS' ? L('استنى شوية قبل السؤال الجاي.', 'Please wait a moment.') : L('المعلّم مش متاح دلوقتي.', 'The tutor is unavailable right now.') });
  } finally {
    busy.value = false;
    scroll();
  }
}
</script>

<template>
  <button class="tc-fab" :aria-label="L('المعلّم الذكي', 'AI tutor')" @click="toggle">💬</button>
  <div v-if="open" class="tc-box">
    <div class="tc-head">{{ L('المعلّم الذكي', 'AI tutor') }}<span @click="open = false">✕</span></div>
    <div ref="logEl" class="tc-log">
      <div v-for="(m, i) in msgs" :key="i" class="tc-msg" :class="m.role">{{ m.text }}</div>
      <div v-if="busy" class="tc-msg bot">…</div>
    </div>
    <form class="tc-form" @submit.prevent="send">
      <input v-model="input" :placeholder="L('اكتب سؤالك...', 'Ask a question...')" maxlength="1000" autocomplete="off" />
      <button class="btn sm" :disabled="busy">{{ L('إرسال', 'Send') }}</button>
    </form>
  </div>
</template>

<style scoped>
.tc-fab { position: fixed; inset-inline-end: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--primary); color: #fff; font-size: 26px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25); z-index: 50; }
.tc-box { position: fixed; inset-inline-end: 20px; bottom: 88px; width: 340px; max-width: calc(100vw - 40px); height: 460px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 8px 28px rgba(0,0,0,.25); display: flex; flex-direction: column; overflow: hidden; z-index: 50; }
.tc-head { background: var(--primary); color: #fff; padding: 12px 14px; font-weight: 700; display: flex; justify-content: space-between; }
.tc-head span { cursor: pointer; }
.tc-log { flex: 1; overflow-y: auto; padding: 12px; background: var(--bg); }
.tc-msg { max-width: 85%; margin: 6px 0; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.tc-msg.bot { background: #fff; border: 1px solid var(--border); }
.tc-msg.user { background: var(--primary); color: #fff; margin-inline-start: auto; }
.tc-msg.err { background: #fee2e2; color: var(--danger); }
.tc-form { display: flex; gap: 6px; padding: 10px; border-top: 1px solid var(--border); }
</style>