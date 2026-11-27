<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';

const { locale } = useI18n();
const isAr = computed(() => locale.value === 'ar');
const L = (ar, en) => (isAr.value ? ar : en);
const route = useRoute();
const router = useRouter();

const order = ref(null);
const receiver = ref(null);
const error = ref('');
const busy = ref(false);
const copied = ref(false);
const form = reactive({ senderPhone: '', senderRef: '' });
let timer;

const ERR = computed(() => ({
  INVALID_INPUT: L('تأكد من رقم الموبايل (11 رقم) ورقم العملية (6 حروف/أرقام أو أكتر).', 'Check your phone number (11 digits) and the transfer ID (6+ characters).'),
  ORDER_NOT_PENDING: L('الطلب ده مبقاش متاح للتعديل.', 'This order can no longer be changed.'),
  REF_ALREADY_USED: L('رقم العملية ده مستخدم قبل كده.', 'This transfer ID was already used.'),
  TOO_MANY_REQUESTS: L('محاولات كتير. جرّب بعد شوية.', 'Too many attempts. Try again later.'),
  NOT_FOUND: L('الطلب غير موجود.', 'Order not found.'),
}));
const errText = (c) => ERR.value[c] || L('حصلت مشكلة. حاول تاني.', 'Something went wrong. Please try again.');
const money = (v) => new Intl.NumberFormat(isAr.value ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v || 0);
const methodName = computed(() => (order.value?.provider === 'instapay' ? 'InstaPay' : 'Vodafone Cash'));

async function load() {
  try {
    const { data } = await api.get(`/wallet/orders/${route.params.id}`);
    order.value = data.order;
    receiver.value = data.receiver;
    if (data.order.status !== 'submitted') { clearInterval(timer); timer = null; }
    else if (!timer) timer = setInterval(load, 15000); // نتابع لحد ما الأدمن يأكد
  } catch (e) { error.value = errText(errCode(e)); }
}
async function submit() {
  busy.value = true; error.value = '';
  try { await api.post(`/wallet/orders/${order.value.id}/submit`, form); await load(); }
  catch (e) { error.value = errText(errCode(e)); }
  finally { busy.value = false; }
}
async function cancel() {
  busy.value = true;
  try { await api.post(`/wallet/orders/${order.value.id}/cancel`); router.push('/wallet'); }
  catch (e) { error.value = errText(errCode(e)); busy.value = false; }
}
async function copy() {
  try { await navigator.clipboard.writeText(receiver.value.number); copied.value = true; setTimeout(() => (copied.value = false), 1500); } catch {}
}
onMounted(load);
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <section class="page-wrap" v-if="order">
    <div class="page-heading">
      <span class="eyebrow">{{ L('المحفظة / حالة الدفع', 'CREDIT WALLET / PAYMENT STATUS') }}</span>
      <h1 v-if="order.status === 'pending'">{{ L('حوّل المبلغ وبلّغنا.', 'Send the transfer, then tell us.') }}</h1>
      <h1 v-else-if="order.status === 'submitted'">{{ L('في انتظار تأكيد الدفع.', 'Waiting for payment confirmation.') }}</h1>
      <h1 v-else-if="order.status === 'paid'">{{ L('تم تأكيد الدفع.', 'Payment confirmed.') }}</h1>
      <h1 v-else>{{ L('الطلب مش نشط.', 'This order is not active.') }}</h1>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>

    <div class="card-panel" style="max-width: 640px">
      <span class="eyebrow">{{ order.status === 'paid' ? L('اكتمل', 'SETTLED') : L('بانتظار التسوية', 'PENDING SETTLEMENT') }}</span>
      <h2>{{ order.credits }} {{ L('نقطة', 'Skill Credits') }} · {{ money(order.amountEGP) }}</h2>

      <!-- pending: تعليمات التحويل -->
      <template v-if="order.status === 'pending'">
        <div v-if="!receiver" class="alert error">{{ L('الدفع غير متاح حالياً.', 'Payments are currently unavailable.') }}</div>
        <template v-else>
          <div class="soft-note">
            <b>{{ L(`1) حوّل ${money(order.amountEGP)} عبر ${methodName} إلى:`, `1) Send ${money(order.amountEGP)} via ${methodName} to:`) }}</b>
            <p style="font-size: 24px; font-weight: 800; direction: ltr; text-align: start; margin: 8px 0">{{ receiver.number }}</p>
            <p v-if="receiver.name" class="muted">{{ receiver.name }}</p>
            <button class="btn ghost sm" @click="copy">{{ copied ? L('تم النسخ ✓', 'Copied ✓') : L('نسخ الرقم', 'Copy number') }}</button>
          </div>
          <div class="soft-note">
            <b>{{ L('2) لو في خانة ملاحظات، اكتب الكود ده:', '2) If there is a note field, add this code:') }}</b>
            <p style="font-size: 20px; font-weight: 800; direction: ltr; text-align: start">{{ order.reference }}</p>
          </div>
          <form @submit.prevent="submit">
            <b>{{ L('3) بعد التحويل اكتب بياناته:', '3) After transferring, enter its details:') }}</b>
            <label>{{ L('رقم الموبايل اللي حوّلت منه', 'Phone number you sent from') }}</label>
            <input v-model="form.senderPhone" required inputmode="numeric" maxlength="11" placeholder="01XXXXXXXXX" @input="form.senderPhone = form.senderPhone.replace(/\D/g, '')" />
            <label>{{ L('رقم العملية (من رسالة التأكيد)', 'Transfer ID (from the confirmation message)') }}</label>
            <input v-model="form.senderRef" required maxlength="30" style="direction: ltr" />
            <p class="muted tiny">{{ L('النقاط بتتضاف بعد ما نتأكد إن المبلغ وصل. بيتأكد يدوياً وممكن ياخد وقت.', 'Credits are added after we verify the money arrived. This is manual and can take a while.') }}</p>
            <button class="btn block" :disabled="busy">{{ L('بلّغنا إني حوّلت', 'I have sent the transfer') }}</button>
          </form>
          <button class="btn ghost block" :disabled="busy" @click="cancel">{{ L('إلغاء الطلب', 'Cancel order') }}</button>
        </template>
      </template>

      <!-- submitted: شاشة الانتظار -->
      <template v-else-if="order.status === 'submitted'">
        <h3>{{ L('لسه ما اتضافتش لرصيدك', 'Not added to your balance yet') }}</h3>
        <div class="soft-note"><b>{{ L('رصيدك الحالي ما اتغيرش', 'Your existing balance is unchanged') }}</b>
          <p>{{ L('الطلب ده لسه مش عملية شراء مكتملة.', 'This pending payment is not a completed purchase.') }}</p></div>
        <p class="muted">{{ L('بيانات التحويل:', 'Transfer details:') }} {{ order.senderPhone }} · {{ order.senderRef }}</p>
        <p class="muted tiny">{{ L('ما تبعتش نفس الدفع تاني. الصفحة بتتحدّث لوحدها.', 'Do not submit the same payment again. This page refreshes on its own.') }}</p>
      </template>

      <!-- paid / failed / expired -->
      <template v-else-if="order.status === 'paid'">
        <div class="alert ok">{{ L(`تمت إضافة ${order.credits} نقطة لرصيدك.`, `${order.credits} credits were added to your balance.`) }}</div>
      </template>
      <template v-else>
        <div class="alert error">
          {{ order.status === 'failed' ? L('لم نتمكن من تأكيد التحويل.', 'We could not confirm the transfer.') : L('الطلب منتهي أو ملغي.', 'This order expired or was cancelled.') }}
          <span v-if="order.reviewNote"> — {{ order.reviewNote }}</span>
        </div>
      </template>

      <RouterLink to="/wallet" class="btn block">{{ L('الرجوع للمحفظة', 'Return to wallet') }}</RouterLink>
    </div>
  </section>
</template>