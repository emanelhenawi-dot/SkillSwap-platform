<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';

const { locale } = useI18n();
const L = (ar, en) => (locale.value === 'ar' ? ar : en);
const router = useRouter();
const form = reactive({ title: '', description: '', videoUrl: '', durationMin: 10, language: 'ar', transcript: '' });
const error = ref('');
const busy = ref(false);

const ERR = {
  INVALID_VIDEO_URL: ['الرابط لازم يكون https من يوتيوب أو ملف mp4/webm مباشر.', 'The link must be https from YouTube or a direct mp4/webm file.'],
  INVALID_INPUT: ['راجع الحقول: العنوان، المدة (2 دقيقة على الأقل)، والنص (500 حرف على الأقل).', 'Check the fields: title, duration (min 2 minutes) and transcript (min 500 characters).'],
};
async function submit() {
  busy.value = true; error.value = '';
  try { await api.post('/videos', form); router.push('/videos'); }
  catch (e) { const c = errCode(e); error.value = ERR[c] ? L(...ERR[c]) : L('حصلت مشكلة.', 'Something went wrong.'); }
  finally { busy.value = false; }
}
</script>

<template>
  <section class="page-wrap">
    <div class="card-panel" style="max-width: 720px">
      <h1>{{ L('رفع فيديو جديد', 'Upload a new video') }}</h1>
      <p class="muted">{{ L('الـ AI هيولّد أسئلة من نص الفيديو، والأدمن بيراجع قبل النشر.', 'AI generates questions from the transcript; an admin reviews before publishing.') }}</p>
      <form @submit.prevent="submit">
        <label>{{ L('العنوان', 'Title') }}</label>
        <input v-model="form.title" required minlength="3" maxlength="120" />
        <label>{{ L('الوصف', 'Description') }}</label>
        <input v-model="form.description" maxlength="1000" />
        <label>{{ L('رابط الفيديو (يوتيوب أو mp4)', 'Video link (YouTube or mp4)') }}</label>
        <input v-model="form.videoUrl" required type="url" placeholder="https://youtu.be/..." style="direction: ltr" />
        <div class="row">
          <div><label>{{ L('المدة بالدقائق', 'Duration (minutes)') }}</label><input v-model.number="form.durationMin" type="number" min="2" max="240" required /></div>
          <div><label>{{ L('لغة الفيديو', 'Language') }}</label>
            <select v-model="form.language"><option value="ar">العربية</option><option value="en">English</option></select></div>
        </div>
        <label>{{ L('النص الكامل للفيديو (transcript)', 'Full transcript') }}</label>
        <textarea v-model="form.transcript" required minlength="500" rows="10" style="width: 100%; padding: 11px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--soft); font: inherit"></textarea>
        <p class="muted tiny">{{ L('الأسئلة بتتبني على النص ده، فلازم يطابق اللي بتقوله في الفيديو.', 'Questions are built from this text, so it must match what is said in the video.') }}</p>
        <div v-if="error" class="alert error">{{ error }}</div>
        <button class="btn block" :disabled="busy">{{ L('رفع', 'Upload') }}</button>
      </form>
    </div>
  </section>
</template>