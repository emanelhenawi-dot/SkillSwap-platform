<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';


const { locale } = useI18n();
const L = (ar, en) => (locale.value === 'ar' ? ar : en);
const id = useRoute().params.id;

const data = ref(null);
const error = ref('');
const starting = ref(false);
const checkpoints = ref([]);
const answered = ref(new Set());
const active = ref(null);                       // السؤال الظاهر دلوقتي
const quiz = reactive({ choice: null, result: null, busy: false });
const state = reactive({ playing: false, time: 0, duration: 0, maxPos: 0, completed: false, finishing: false, finishFailed: false });
const mount = ref(null);
let player = null, tickTimer = null, beatTimer = null;

const unlocked = computed(() => !!data.value?.video.provider);
const pct = computed(() => (state.duration ? Math.min(100, (state.time / state.duration) * 100) : 0));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const ERR = {
  INSUFFICIENT_CREDITS: ['رصيدك مش كفاية. اشحن من المحفظة.', 'Not enough credits. Top up in your wallet.'],
  NOT_FINISHED: ['لازم تكمل الفيديو وتجاوب على كل الأسئلة.', 'Finish the video and answer every question first.'],
  NOT_FOUND: ['الفيديو غير موجود.', 'Video not found.'],
};
const errText = (c) => (ERR[c] ? L(...ERR[c]) : L('حصلت مشكلة. حاول تاني.', 'Something went wrong. Please try again.'));

// ---------- player adapters (YouTube / mp4) ----------
function loadYT() {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
}

async function createPlayer(media, startAt) {
  if (media.provider === 'youtube') {
    const YT = await loadYT();
    const holder = document.createElement('div');
    mount.value.replaceChildren(holder);
    return new Promise((resolve) => {
      const p = new YT.Player(holder, {
        videoId: media.youtubeId, width: '100%', height: '100%',
        playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(startAt) },
        events: {
          onReady: () => resolve({
            play: () => p.playVideo(), pause: () => p.pauseVideo(), seek: (t) => p.seekTo(t, true),
            time: () => p.getCurrentTime() || 0, destroy: () => p.destroy(),
          }),
          onStateChange: (e) => { state.playing = e.data === 1; },
        },
      });
    });
  }
  const v = document.createElement('video');
  v.src = media.url; v.preload = 'metadata'; v.playsInline = true; v.controls = false;
  mount.value.replaceChildren(v);
  v.addEventListener('play', () => (state.playing = true));
  v.addEventListener('pause', () => (state.playing = false));
  v.addEventListener('ended', () => (state.playing = false));
  await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
  v.currentTime = startAt;
  return {
    play: () => v.play(), pause: () => v.pause(), seek: (t) => { v.currentTime = t; },
    time: () => v.currentTime, destroy: () => { v.pause(); v.removeAttribute('src'); v.load(); },
  };
}

// ---------- flow ----------
const nextPending = () => checkpoints.value.find((c) => !answered.value.has(c.id)) || null;

function applyView(r) {
  data.value = r;
  checkpoints.value = r.checkpoints;
  answered.value = new Set(r.session?.answered || []);
  state.maxPos = r.session?.maxPosition || 0;
  state.completed = !!r.session?.completed;
  state.duration = r.video.durationSec;
}

async function initPlayer() {
  await nextTick();
  const gate = nextPending();
  const resume = Math.max(0, Math.min(state.maxPos, gate ? gate.at : state.maxPos) - 3);
  player = await createPlayer(data.value.video, resume);
  state.time = resume;
  tickTimer = setInterval(onTick, 400);
  beatTimer = setInterval(() => { if (state.playing && !active.value) sendBeat(player.time()); }, 5000);
}

async function sendBeat(pos) {
  try { await api.post(`/videos/${id}/heartbeat`, { position: pos }); } catch {}
}

async function openQuiz(cp) {
  player.pause();
  player.seek(cp.at);
  await sendBeat(cp.at);              // السيرفر لازم يعرف إنه وصل للنقطة دي
  quiz.choice = null; quiz.result = null;
  active.value = cp;
}

function onTick() {
  if (!player || active.value) return;
  const t = player.time();
  state.time = t;
  const gate = nextPending();
  if (gate && t >= gate.at) { openQuiz(gate); return; }   // وقّف فجأة (وكمان لو حاول يقفز)
  if (state.playing) state.maxPos = Math.max(state.maxPos, t);
  if (!gate && !state.completed && !state.finishing && !state.finishFailed && t >= state.duration - 1.5) finish();
}

async function submitAnswer() {
  quiz.busy = true;
  try {
    const { data: r } = await api.post(`/videos/${id}/checkpoints/${active.value.id}/answer`, { choice: quiz.choice });
    quiz.result = r;
    if (r.correct) answered.value = new Set([...answered.value, active.value.id]);
  } catch (e) { error.value = errText(errCode(e)); }
  finally { quiz.busy = false; }
}

function afterQuiz() {
  const cp = active.value, r = quiz.result;
  active.value = null;
  player.seek(r.correct ? cp.at : r.rewindTo ?? cp.from); // غلط → يعيد الجزء
  player.play();
}

async function finish() {
  state.finishing = true;
  player.pause();
  await sendBeat(state.duration);
  try { await api.post(`/videos/${id}/complete`); state.completed = true; }
  catch (e) { state.finishFailed = true; error.value = errText(errCode(e)); }
  finally { state.finishing = false; }
}

async function start() {
  starting.value = true; error.value = '';
  try { applyView((await api.post(`/videos/${id}/start`)).data); await initPlayer(); }
  catch (e) { error.value = errText(errCode(e)); }
  finally { starting.value = false; }
}

const toggle = () => { if (!player || active.value) return; state.playing ? player.pause() : player.play(); };
function seekBar(e) {                                     // رجوع للخلف فقط، مش قفز لقدّام
  if (!player || active.value) return;
  const r = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - r.left) / r.width;
  const target = (locale.value === 'ar' ? 1 - ratio : ratio) * state.duration;
  if (target <= state.maxPos) player.seek(Math.max(0, target));
}
const onHidden = () => { if (document.hidden && state.playing) player?.pause(); };  // سابت التاب → وقّف

onMounted(async () => {
  document.addEventListener('visibilitychange', onHidden);
  try {
    applyView((await api.get(`/videos/${id}`)).data);
    if (unlocked.value) await initPlayer();
  } catch (e) { error.value = errText(errCode(e)); }
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onHidden);
  clearInterval(tickTimer); clearInterval(beatTimer);
  try { player?.destroy(); } catch {}
});
</script>

<template>
  <section class="page-wrap">
    <div v-if="error" class="alert error">{{ error }} <RouterLink v-if="error.includes('credits') || error.includes('رصيدك')" to="/wallet">{{ L('المحفظة', 'Wallet') }}</RouterLink></div>

    <div v-if="data" class="watch-layout">
      <div class="card-panel">
        <span class="eyebrow">{{ L('التعلّم / مشغّل الدرس', 'MY LEARNING / LESSON PLAYER') }}</span>
        <h1 style="margin: 6px 0 4px">{{ data.video.title }}</h1>
        <p class="muted">{{ data.video.creatorName }} · {{ fmt(data.video.durationSec) }}</p>

        <div v-if="!unlocked" class="soft-note">
          <b>{{ L(`المشاهدة بتكلّف ${data.video.cost} نقطة`, `Watching costs ${data.video.cost} credit(s)`) }}</b>
          <p>{{ L('هتظهر لك أسئلة قصيرة في أوقات عشوائية أثناء الفيديو للتأكد إنك فاهم.', 'Short questions will pop up at random moments to check you are following.') }}</p>
          <button class="btn block" :disabled="starting" @click="start">{{ L('ابدأ المشاهدة', 'Start watching') }}</button>
        </div>

        <template v-else>
          <div class="player-frame">
            <div ref="mount" class="player-mount"></div>
            <div class="shield" @click="toggle"></div>

            <div v-if="active" class="quiz-overlay">
              <div class="quiz-card">
                <span class="eyebrow">{{ L('سؤال سريع', 'QUICK CHECK') }}</span>
                <h3>{{ active.question }}</h3>
                <label v-for="(o, i) in active.options" :key="i" class="quiz-opt" :class="{ chosen: quiz.choice === i }">
                  <input v-model="quiz.choice" type="radio" :value="i" :disabled="!!quiz.result" /> {{ o }}
                </label>
                <button v-if="!quiz.result" class="btn block" :disabled="quiz.choice === null || quiz.busy" @click="submitAnswer">{{ L('تأكيد الإجابة', 'Submit answer') }}</button>
                <template v-else>
                  <div class="alert" :class="quiz.result.correct ? 'ok' : 'error'">
                    <template v-if="quiz.result.correct">✓ {{ L('إجابة صحيحة.', 'Correct.') }} {{ quiz.result.explanation }}</template>
                    <template v-else>{{ L('مش دقيق. هنرجّعك لبداية الجزء تتفرج عليه تاني وبعدين تجرّب.', 'Not quite. We will take you back to rewatch this part, then you can try again.') }}</template>
                  </div>
                  <button class="btn block" @click="afterQuiz">{{ quiz.result.correct ? L('كمّل الفيديو', 'Continue') : L('أعد الجزء', 'Rewatch this part') }}</button>
                </template>
              </div>
            </div>
          </div>

          <div class="controls">
            <button class="btn ghost sm" @click="toggle">{{ state.playing ? '⏸' : '▶' }}</button>
            <div class="bar" @click="seekBar"><div class="fill" :style="{ width: pct + '%' }"></div></div>
            <span class="muted">{{ fmt(state.time) }} / {{ fmt(state.duration) }}</span>
          </div>

          <div v-if="state.completed" class="alert ok">🎉 {{ L('خلّصت الدرس وجاوبت على كل الأسئلة!', 'Lesson complete — every question answered!') }}</div>
          <p class="muted tiny">{{ L('الفيديو بيقف لو سبت التاب. ما ينفعش تتخطى سؤال.', 'Playback pauses if you leave the tab. Questions cannot be skipped.') }}</p>
        </template>
      </div>

      <aside class="card-panel">
        <h2>{{ L('تقدّمك', 'Your progress') }}</h2>
        <p v-if="unlocked">{{ L('أسئلة اتجاوبت', 'Questions answered') }}: <b>{{ answered.size }} / {{ checkpoints.length }}</b></p>
        <p class="muted">{{ data.video.description }}</p>
        <RouterLink to="/videos" class="btn ghost block">{{ L('كل الفيديوهات', 'All videos') }}</RouterLink>
      </aside>
    </div>
    
  </section>
</template>

<style scoped>
.watch-layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr); }
@media (max-width: 860px) { .watch-layout { grid-template-columns: 1fr; } }
.player-frame { position: relative; aspect-ratio: 16 / 9; background: #0f1330; border-radius: 14px; overflow: hidden; margin-top: 12px; }
.player-mount, .player-mount :deep(iframe), .player-mount :deep(video) { position: absolute; inset: 0; width: 100%; height: 100%; }
.shield { position: absolute; inset: 0; z-index: 2; cursor: pointer; }
.quiz-overlay { position: absolute; inset: 0; z-index: 3; background: rgba(15, 19, 48, .88); display: grid; place-items: center; padding: 14px; overflow: auto; }
.quiz-card { background: #fff; border-radius: 14px; padding: 18px; width: min(560px, 100%); }
.quiz-opt { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; margin-top: 8px; cursor: pointer; font-weight: 500; }
.quiz-opt.chosen { border-color: var(--primary); background: var(--soft); }
.quiz-opt input { width: auto; }
.controls { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
.bar { flex: 1; height: 10px; background: var(--soft); border-radius: 999px; overflow: hidden; cursor: pointer; }
.fill { height: 100%; background: var(--primary); }
[dir='rtl'] .fill { margin-inline-start: auto; }
</style>