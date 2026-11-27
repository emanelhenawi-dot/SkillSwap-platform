<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../../services/api';

const status = ref('submitted');
const orders = ref([]);
const err = ref('');

async function load() {
  err.value = '';
  orders.value = (await api.get('/admin/payments', { params: { status: status.value } })).data.orders;
}
async function confirmOrder(o) {
  if (!confirm(`Confirm ${o.amountEGP} EGP from ${o.senderPhone} (ref ${o.senderRef})?\nOnly confirm if the money is in your wallet.`)) return;
  try { await api.post(`/admin/payments/${o._id}/confirm`); } catch (e) { err.value = e?.response?.data?.code || 'ERROR'; }
  load();
}
async function rejectOrder(o) {
  const note = prompt('Reason (shown to the student):') ?? '';
  try { await api.post(`/admin/payments/${o._id}/reject`, { note }); } catch (e) { err.value = e?.response?.data?.code || 'ERROR'; }
  load();
}
watch(status, load);
onMounted(load);
</script>

<template>
  <div class="card">
    <div class="tabs">
      <button v-for="s in ['submitted', 'paid', 'failed', 'pending']" :key="s" :class="{ active: status === s }" @click="status = s">{{ s }}</button>
    </div>
    <div v-if="err" class="alert error">{{ err }}</div>
    <p v-if="!orders.length" class="muted">—</p>
    <div v-for="o in orders" :key="o._id" class="list-item">
      <div>
        <b>{{ o.user?.name }}</b> <span class="muted">{{ o.user?.email }}</span><br />
        {{ o.credits }} credits · <b>{{ o.amountEGP }} EGP</b> · {{ o.provider }}<br />
        <span class="muted">from {{ o.senderPhone || '—' }} · ref {{ o.senderRef || '—' }} · order {{ o.reference }}</span>
      </div>
      <div v-if="o.status === 'submitted'" class="row" style="flex: 0">
        <button class="btn ok sm" @click="confirmOrder(o)">Confirm</button>
        <button class="btn danger sm" @click="rejectOrder(o)">Reject</button>
      </div>
      <span v-else class="badge" :class="o.status === 'paid' ? 'approved' : 'rejected'">{{ o.status }}</span>
    </div>
  </div>
</template>