
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const isArabic = computed(() => locale.value.startsWith('ar'));

const order = ref(null);
const loading = ref(true);
const error = ref('');
const finished = ref(false);

let pollingTimer = null;

async function checkOrder() {
  try {
    const { data } = await api.get(
      `/wallet/orders/${route.params.id}`
    );

    order.value = data.order;

    if (order.value.status === 'paid') {
      finished.value = true;
      clearInterval(pollingTimer);
    }

    if (
      order.value.status === 'failed' ||
      order.value.status === 'expired'
    ) {
      clearInterval(pollingTimer);
    }

  } catch {
    error.value = isArabic.value
      ? 'تعذر تحميل بيانات طلب الدفع.'
      : 'Could not load payment order.';
    clearInterval(pollingTimer);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await checkOrder();

  if (
    order.value?.status === 'pending' &&
    new Date(order.value.expiresAt) > new Date()
  ) {
    pollingTimer = setInterval(checkOrder, 5000);
  }
});

onUnmounted(() => {
  clearInterval(pollingTimer);
});

const statusText = computed(() => {
  if (!order.value) return '';

  const labels = {
    pending: isArabic.value ? 'في انتظار الدفع' : 'Payment pending',
    paid: isArabic.value ? 'تم الدفع بنجاح' : 'Payment successful',
    failed: isArabic.value ? 'فشل الدفع' : 'Payment failed',
    expired: isArabic.value ? 'انتهت صلاحية الطلب' : 'Order expired'
  };

  return labels[order.value.status];
});
</script>

<template>
  <section class="card narrow pending-page" :dir="isArabic ? 'rtl' : 'ltr'">
    <div class="pending-icon">
      {{ finished ? '✓' : '◷' }}
    </div>

    <p class="muted">
      {{ isArabic ? 'حالة عملية الشراء' : 'PURCHASE STATUS' }}
    </p>

    <h1>
      {{
        finished
          ? (isArabic ? 'تم الدفع بنجاح' : 'Payment completed')
          : (isArabic ? 'في انتظار تأكيد الدفع' : 'Waiting for confirmation')
      }}
    </h1>

    <div v-if="loading" class="alert info">
      {{ isArabic ? 'جارٍ تحميل الطلب...' : 'Loading order...' }}
    </div>

    <template v-else-if="order">
      <span class="badge" :class="order.status">
        {{ statusText }}
      </span>

      <div class="order-details">
        <div>
          <span>{{ isArabic ? 'رقم الطلب' : 'Order ID' }}</span>
          <strong>{{ order._id }}</strong>
        </div>

        <div>
          <span>{{ isArabic ? 'الباقة' : 'Package' }}</span>
          <strong>{{ order.packageId }}</strong>
        </div>

        <div>
          <span>{{ isArabic ? 'الرصيد' : 'Credits' }}</span>
          <strong>{{ order.credits }}</strong>
        </div>

        <div>
          <span>{{ isArabic ? 'المبلغ' : 'Amount' }}</span>
          <strong>{{ order.amountEGP }} EGP</strong>
        </div>

        <div>
          <span>{{ isArabic ? 'الحالة' : 'Status' }}</span>
          <strong>{{ statusText }}</strong>
        </div>
      </div>

      <div v-if="order.status === 'pending'" class="alert info">
        {{
          isArabic
            ? 'سيتم تحديث حالة الطلب تلقائيًا عند وصول تأكيد الدفع. لم يتم إضافة الرصيد بعد.'
            : 'The order will update when payment is verified. Credits have not been added yet.'
        }}
      </div>

      <div v-else-if="finished" class="alert ok">
        {{
          isArabic
            ? 'تم تأكيد الدفع. يمكنك الرجوع للمحفظة لتحديث الرصيد.'
            : 'Payment verified. Return to your wallet to refresh your balance.'
        }}
      </div>

      <div v-else class="alert error">
        {{
          isArabic
            ? 'لم تكتمل عملية الدفع. يمكنك إنشاء طلب جديد.'
            : 'Payment was not completed. You can create a new order.'
        }}
      </div>
    </template>

    <div v-if="error" class="alert error">
      {{ error }}
    </div>

    <button
      class="btn block"
      @click="router.push('/wallet')"
    >
      {{ isArabic ? 'العودة إلى المحفظة' : 'Back to wallet' }}
    </button>
  </section>
</template>

<style scoped>
.pending-page { text-align:center; margin-top:35px; }
.pending-icon { width:76px; height:76px; display:grid; place-items:center; border-radius:50%; background:var(--soft); color:var(--primary); font-size:42px; margin:0 auto 20px; }
.order-details { text-align:start; background:var(--soft); border-radius:12px; padding:16px; margin-top:20px; }
.order-details div { display:flex; justify-content:space-between; gap:10px; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px; }
.order-details div:last-child { border:0; }
.order-details span { color:var(--muted); }
</style>
