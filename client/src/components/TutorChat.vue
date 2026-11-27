<script setup>

import { ref, nextTick } from 'vue';

import { useI18n } from 'vue-i18n';

import api, { errCode } from '../services/api';

const { locale } = useI18n();

const L = (ar, en) =>
  locale.value === 'ar' ? ar : en;

const open = ref(false);

const input = ref('');

const busy = ref(false);

const logEl = ref(null);

const msgs = ref([]);

function toggle() {

  open.value = !open.value;

  if (open.value && !msgs.value.length) {

    msgs.value.push({

      role: 'bot',

      text: L(
        'أهلاً بك في SkillSwap! أنا مساعدك التعليمي الذكي. اسألني عن أي موضوع دراسي وسأساعدك على فهمه.',
        'Welcome to SkillSwap! I am your AI learning assistant. Ask me about any educational topic.'
      )

    });

  }

}

const scroll = () => nextTick(() => {

  if (logEl.value) {

    logEl.value.scrollTop =
      logEl.value.scrollHeight;

  }

});

async function send() {

  const message = input.value.trim();

  if (!message || busy.value) return;

  msgs.value.push({

    role: 'user',

    text: message

  });

  input.value = '';

  busy.value = true;

  scroll();

  try {

    const { data } = await api.post('/ai/chat', {

      message

    });

    msgs.value.push({

      role: 'bot',

      text: data.reply

    });

  } catch (e) {

    const code = errCode(e);

    msgs.value.push({

      role: 'err',

      text: code === 'TOO_MANY_REQUESTS'

        ? L(
            'استنى شوية قبل ما تبعت سؤال جديد.',
            'Please wait before sending another question.'
          )

        : L(
            'المساعد الذكي غير متاح حاليًا. حاول مرة أخرى.',
            'The AI assistant is temporarily unavailable.'
          )

    });

  } finally {

    busy.value = false;

    scroll();

  }

}

</script>

<template>

  <button
    class="tc-fab"
    @click="toggle"
    :aria-label="L('افتح المساعد الذكي', 'Open AI tutor')"
  >

    <span v-if="!open">✦</span>
    <span v-else>×</span>

  </button>

  <div v-if="open" class="tc-box">

    <div class="tc-head">

      <div>

        <strong>
          {{ L('SkillSwap AI Tutor', 'SkillSwap AI Tutor') }}
        </strong>

        <small>
          {{ L('مساعدك التعليمي', 'Your learning assistant') }}
        </small>

      </div>

      <button @click="open = false">
        ×
      </button>

    </div>

    <div ref="logEl" class="tc-log">

      <div
        v-for="(m, i) in msgs"
        :key="i"
        class="tc-msg"
        :class="m.role"
      >

        {{ m.text }}

      </div>

      <div v-if="busy" class="tc-msg bot">

        {{ L('جاري التفكير...', 'Thinking...') }}

      </div>

    </div>

    <form
      class="tc-form"
      @submit.prevent="send"
    >

      <input
        v-model="input"
        :placeholder="L('اكتب سؤالك هنا...', 'Ask your question...')"
        maxlength="1000"
        autocomplete="off"
      />

      <button
        class="btn sm"
        :disabled="busy || !input.trim()"
      >

        {{ L('إرسال', 'Send') }}

      </button>

    </form>

    <div class="tc-footer">

      {{ L(
        'المساعد مخصص للتعلم والمساعدة الدراسية.',
        'AI assistant for educational support.'
      ) }}

    </div>

  </div>

</template>

<style scoped>

.tc-fab {

  position: fixed;

  inset-inline-end: 24px;

  bottom: 24px;

  width: 60px;

  height: 60px;

  border-radius: 50%;

  border: none;

  background: var(--primary);

  color: white;

  font-size: 28px;

  cursor: pointer;

  box-shadow: 0 6px 20px rgba(56,32,189,.25);

  z-index: 100;

}

.tc-box {

  position: fixed;

  inset-inline-end: 24px;

  bottom: 96px;

  width: 370px;

  max-width: calc(100vw - 32px);

  height: 490px;

  max-height: calc(100vh - 130px);

  background: white;

  border: 1px solid var(--border);

  border-radius: 20px;

  box-shadow: 0 12px 40px rgba(30,20,80,.16);

  display: flex;

  flex-direction: column;

  overflow: hidden;

  z-index: 100;

}

.tc-head {

  background: var(--primary);

  color: white;

  padding: 17px;

  display: flex;

  justify-content: space-between;

  align-items: center;

}

.tc-head small {

  display: block;

  opacity: .8;

  margin-top: 4px;

}

.tc-head button {

  background: transparent;

  color: white;

  border: none;

  font-size: 24px;

  cursor: pointer;

}

.tc-log {

  flex: 1;

  overflow-y: auto;

  padding: 15px;

  background: var(--bg);

}

.tc-msg {

  max-width: 88%;

  padding: 11px 14px;

  margin: 8px 0;

  border-radius: 13px;

  font-size: 14px;

  line-height: 1.7;

  white-space: pre-wrap;

  overflow-wrap: anywhere;

}

.tc-msg.bot {

  background: white;

  border: 1px solid var(--border);

}

.tc-msg.user {

  background: var(--primary);

  color: white;

  margin-inline-start: auto;

}

.tc-msg.err {

  background: #fee2e2;

  color: var(--danger);

}

.tc-form {

  display: flex;

  gap: 8px;

  padding: 12px;

  border-top: 1px solid var(--border);

}

.tc-footer {

  padding: 8px;

  text-align: center;

  font-size: 11px;

  color: var(--muted);

  border-top: 1px solid var(--border);

}

@media(max-width: 480px) {

  .tc-box {

    inset-inline: 12px;

    width: auto;

    bottom: 90px;

  }

}

</style>