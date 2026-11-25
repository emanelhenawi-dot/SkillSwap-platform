<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';

const { t } = useI18n();
const tabs = ['overview', 'queue', 'flagged', 'users', 'economy'];
const tab = ref('overview');

const stats = ref({});
const videos = ref([]);
const ratings = ref([]);
const users = ref([]);
const q = ref('');
const eco = reactive({ videoCost: 1, creatorShare: 0.5, treasuryShare: 0.5 });
const views = ref(1000);
const sim = ref(null);
const saved = ref(false);

async function load() {
  if (tab.value === 'overview') stats.value = (await api.get('/admin/overview')).data;
  if (tab.value === 'queue') videos.value = (await api.get('/admin/videos')).data.videos;
  if (tab.value === 'flagged') ratings.value = (await api.get('/admin/ratings/flagged')).data.ratings;
  if (tab.value === 'users') searchUsers();
  if (tab.value === 'economy') Object.assign(eco, (await api.get('/admin/economy')).data);
}

const searchUsers = async () => (users.value = (await api.get('/admin/users', { params: { q: q.value } })).data.users);
const setVideo = async (id, status) => { await api.patch(`/admin/videos/${id}`, { status }); load(); };
const resolve = async (id, action, penalize = false) => { await api.post(`/admin/ratings/${id}/resolve`, { action, penalize }); load(); };
const freeze = async (u) => { u.frozen = (await api.patch(`/admin/users/${u._id}/freeze`)).data.frozen; };
const saveEco = async () => { await api.put('/admin/economy', eco); saved.value = true; setTimeout(() => (saved.value = false), 2000); };
const simulate = async () => { sim.value = (await api.post('/admin/simulate', { views: views.value, ...eco })).data; };

watch(tab, load);
onMounted(load);
</script>

<template>
  <h1>{{ t('admin.title') }}</h1>
  <div class="tabs">
    <button v-for="x in tabs" :key="x" :class="{ active: tab === x }" @click="tab = x">{{ t('admin.tabs.' + x) }}</button>
  </div>

  <!-- Overview -->
  <div v-if="tab === 'overview'" class="card">
    <div class="stats">
      <div v-for="(v, k) in stats" :key="k" class="stat"><b>{{ v }}</b>{{ t('admin.stats.' + k) }}</div>
    </div>
  </div>

  <!-- Review queue -->
  <div v-if="tab === 'queue'" class="card">
    <p v-if="!videos.length" class="muted">{{ t('admin.empty') }}</p>
    <div v-for="v in videos" :key="v._id" class="list-item">
      <div>
        <b>{{ v.title }}</b><br />
        <span class="muted">{{ v.creator?.name }} — {{ v.aiNotes || '' }}</span>
      </div>
      <div class="row" style="flex: 0">
        <button class="btn ok sm" @click="setVideo(v._id, 'accepted')">{{ t('admin.approve') }}</button>
        <button class="btn danger sm" @click="setVideo(v._id, 'rejected')">{{ t('admin.reject') }}</button>
      </div>
    </div>
  </div>

  <!-- Flagged ratings -->
  <div v-if="tab === 'flagged'" class="card">
    <p v-if="!ratings.length" class="muted">{{ t('admin.empty') }}</p>
    <div v-for="r in ratings" :key="r._id" class="list-item">
      <div>
        <b>{{ r.video?.title }}</b> — ⭐ {{ r.stars }}<br />
        <span class="muted">{{ r.student?.name }} — {{ r.flagReason }}</span>
      </div>
      <div class="row" style="flex: 0">
        <button class="btn danger sm" @click="resolve(r._id, 'delete')">{{ t('admin.deleteRating') }}</button>
        <button class="btn danger sm" @click="resolve(r._id, 'delete', true)">{{ t('admin.deletePenalize') }}</button>
        <button class="btn ghost sm" @click="resolve(r._id, 'dismiss')">{{ t('admin.dismiss') }}</button>
      </div>
    </div>
  </div>

  <!-- Users -->
  <div v-if="tab === 'users'" class="card">
    <input v-model="q" :placeholder="t('admin.search')" @input="searchUsers" />
    <div v-for="u in users" :key="u._id" class="list-item">
      <div>
        <b>{{ u.name }}</b> <span v-if="u.frozen" class="badge frozen">{{ t('admin.frozen') }}</span><br />
        <span class="muted">{{ u.email }} — {{ u.role }}</span>
      </div>
      <button class="btn sm" :class="u.frozen ? 'ok' : 'danger'" @click="freeze(u)">{{ u.frozen ? t('admin.unfreeze') : t('admin.freeze') }}</button>
    </div>
  </div>

  <!-- Economy + simulator -->
  <div v-if="tab === 'economy'" class="grid">
    <div class="card">
      <label>{{ t('admin.videoCost') }}</label><input v-model.number="eco.videoCost" type="number" step="0.1" min="0" />
      <label>{{ t('admin.creatorShare') }}</label><input v-model.number="eco.creatorShare" type="number" step="0.1" min="0" />
      <label>{{ t('admin.treasuryShare') }}</label><input v-model.number="eco.treasuryShare" type="number" step="0.1" min="0" />
      <button class="btn block" @click="saveEco">{{ t('admin.save') }}</button>
      <div v-if="saved" class="alert ok">{{ t('admin.saved') }}</div>
    </div>
    <div class="card">
      <label>{{ t('admin.views') }}</label><input v-model.number="views" type="number" min="0" />
      <button class="btn block" @click="simulate">{{ t('admin.simulate') }}</button>
      <div v-if="sim" class="stats" style="margin-top: 16px">
        <div class="stat"><b>{{ sim.pointsSpent }}</b>{{ t('admin.spent') }}</div>
        <div class="stat"><b>{{ sim.creatorsEarn }}</b>{{ t('admin.creators') }}</div>
        <div class="stat"><b>{{ sim.treasuryEarn }}</b>{{ t('admin.treasuryEarn') }}</div>
      </div>
    </div>
  </div>
</template>