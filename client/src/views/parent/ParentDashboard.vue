<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';
import { useAuthStore } from '../../stores/auth';

const { t, locale } = useI18n();
const auth = useAuthStore();
const data = ref({ children: [], pendingChildren: [], notifications: [], liveRequests: [] });
const form = reactive({ email: '', nationalId: '' });
const msg = ref('');
const err = ref('');
let timer;

const when = (d) => new Date(d).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-GB');

async function load() {
  data.value = (await api.get('/parent/overview')).data;
}

async function addChild() {
  msg.value = err.value = '';
  try {
    const { data: r } = await api.post('/parent/children', form);
    msg.value = t(r.status === 'linked' ? 'parent.linked' : 'parent.invited');
    form.email = form.nationalId = '';
    await load();
  } catch (e) {
    err.value = t('errors.' + errCode(e));
  }
}

async function decide(id, decision) {
  try {
    await api.post(`/parent/live-requests/${id}/decision`, { decision });
  } catch (e) {
    err.value = t('errors.' + errCode(e));
  }
  await load();
}

async function readAll() {
  await api.post('/parent/notifications/read');
  await load();
}

onMounted(() => {
  load();
  timer = setInterval(load, 10000); // تحديث كل 10 ثواني (ممكن نستبدله بـ Socket.io بعدين)
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="card">
    <h1>{{ t('parent.title') }} — {{ auth.user.name }}</h1>
    <div class="alert info" style="margin-top: 8px">🔒 {{ t('parent.restrictions') }}</div>
  </div>

  <div class="grid" style="margin-top: 16px">
    <!-- My Children -->
    <div class="card">
      <h2>{{ t('parent.myChildren') }}</h2>
      <p v-if="!data.children.length" class="muted">{{ t('parent.noChildren') }}</p>
      <div v-for="c in data.children" :key="c._id" class="list-item">
        <div><b>{{ c.name }}</b><br /><span class="muted">{{ c.email }}</span></div>
        <span class="badge">⚡ {{ c.points }} {{ t('parent.points') }}</span>
      </div>

      <template v-if="data.pendingChildren.length">
        <h2 style="margin-top: 20px">{{ t('parent.pendingInvites') }}</h2>
        <div v-for="p in data.pendingChildren" :key="p._id" class="list-item">
          <span>{{ p.email }}</span><span class="badge pending">{{ t('parent.status.pending') }}</span>
        </div>
      </template>

      <h2 style="margin-top: 22px">{{ t('parent.add') }}</h2>
      <form @submit.prevent="addChild">
        <label>{{ t('parent.childEmail') }}</label>
        <input v-model="form.email" type="email" required />
        <label>{{ t('parent.childNid') }}</label>
        <input v-model="form.nationalId" required inputmode="numeric" maxlength="14" @input="form.nationalId = form.nationalId.replace(/\D/g, '')" />
        <div v-if="msg" class="alert ok">{{ msg }}</div>
        <div v-if="err" class="alert error">{{ err }}</div>
        <button class="btn block">{{ t('parent.link') }}</button>
      </form>
    </div>

    <div>
      <!-- Live consent -->
      <div class="card">
        <h2>{{ t('parent.live') }}</h2>
        <p v-if="!data.liveRequests.length" class="muted">{{ t('parent.noLive') }}</p>
        <div v-for="r in data.liveRequests" :key="r._id" class="list-item">
          <div>
            <b>{{ t('parent.wants', { name: r.child?.name }) }}</b><br />
            <span class="muted">{{ when(r.createdAt) }}</span>
          </div>
          <div v-if="r.status === 'pending'" class="row" style="flex: 0">
            <button class="btn ok sm" @click="decide(r._id, 'approved')">{{ t('parent.approve') }}</button>
            <button class="btn danger sm" @click="decide(r._id, 'declined')">{{ t('parent.decline') }}</button>
          </div>
          <span v-else class="badge" :class="r.status">{{ t('parent.status.' + r.status) }}</span>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card">
        <div class="row">
          <h2>{{ t('parent.notifications') }}</h2>
          <button class="btn ghost sm" style="flex: 0; white-space: nowrap" @click="readAll">{{ t('parent.markRead') }}</button>
        </div>
        <p v-if="!data.notifications.length" class="muted">{{ t('parent.noNotifications') }}</p>
        <div v-for="n in data.notifications" :key="n._id" class="list-item" :class="{ unread: !n.read }">
          <span>{{ t('notif.' + n.type, n.data || {}) }}</span>
          <span class="muted" style="white-space: nowrap">{{ when(n.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>