<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { errCode } from '../../services/api';
import { useRouter } from 'vue-router';
const router = useRouter();
const { locale } = useI18n();
const isAr = computed(() => locale.value === 'ar');
const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const notice = ref('');
const wallet = ref({ balance: 0, packages: [], providers: [], transactions: [], orders: [] });
const selectedPackage = ref('starter');
const provider = ref('vodafone_cash');
const selected = computed(() => wallet.value.packages.find(p => p.id === selectedPackage.value));
const money = value => new Intl.NumberFormat(isAr.value ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);

async function loadWallet() {
  loading.value = true; error.value = '';
  try { wallet.value = (await api.get('/wallet')).data; }
  catch (e) { error.value = e?.response?.data?.code || errCode(e); }
  finally { loading.value = false; }
}

async function createOrder() {
  if (!selected.value) return;
  submitting.value = true; error.value = ''; notice.value = '';
  try {
    const { data } = await api.post('/wallet/orders', { packageId: selectedPackage.value, provider: provider.value });
    router.push(`/wallet/orders/${data.order.id}`);
  } catch (e) { error.value = errCode(e); }
  finally { submitting.value = false; }
}

function transactionLabel(type) {
  const labels = { purchase: isAr.value ? 'شراء نقاط' : 'Credit purchase', creator_earn: isAr.value ? 'أرباح مبدع' : 'Creator earnings', spend: isAr.value ? 'استخدام نقاط' : 'Credits spent', refund: isAr.value ? 'استرداد' : 'Refund' };
  return labels[type] || type || (isAr.value ? 'معاملة' : 'Transaction');
}
onMounted(loadWallet);
</script>

<template>
  <section class="page-wrap">
    <div class="page-heading">
      <span class="eyebrow">{{ isAr ? 'المحفظة / الدفع الآمن' : 'CREDIT WALLET / SECURE CHECKOUT' }}</span>
      <h1>{{ isAr ? 'وقت أكتر لإتقان اللي يهمك.' : 'More time to master what matters.' }}</h1>
      <p>{{ isAr ? 'راجع رصيدك واختار باقة نقاط Skill Credits المناسبة.' : 'Review your balance and choose the Skill Credits pack that works for you.' }}</p>
    </div>

    <div class="wallet-balance card-panel">
      <div><span class="muted">{{ isAr ? 'رصيدك الحالي' : 'Available balance' }}</span><strong>{{ loading ? '—' : wallet.balance }} <small>{{ isAr ? 'نقطة' : 'Skill Credits' }}</small></strong></div>
      <div class="balance-icon">✦</div>
    </div>

    <div v-if="error" class="alert error">{{ isAr ? 'حصلت مشكلة أثناء تحميل المحفظة. جرّبي تسجيل الدخول مرة تانية.' : 'We could not load your wallet. Please sign in again and retry.' }} <small>({{ error }})</small></div>
    <div v-if="notice" class="alert info">{{ notice }}</div>

    <div class="wallet-layout">
      <section class="card-panel">
        <div class="section-title"><div><span class="eyebrow">{{ isAr ? 'اختاري باقتك' : 'CHOOSE YOUR PACK' }}</span><h2>{{ isAr ? 'باقات Skill Credits' : 'Skill Credit packages' }}</h2></div></div>
        <div v-if="loading" class="empty-state">{{ isAr ? 'جارٍ تحميل الباقات...' : 'Loading packages...' }}</div>
        <div v-else class="package-grid">
          <button v-for="pack in wallet.packages" :key="pack.id" class="package-card" :class="{ chosen: selectedPackage === pack.id }" @click="selectedPackage = pack.id">
            <span class="package-mark">✦</span><b>{{ isAr ? ({starter:'الباقة المبدئية',scholar:'باقة المتعلم',master:'الباقة المتقدمة'}[pack.id]) : pack.name }}</b>
            <strong>{{ pack.credits }} <small>{{ isAr ? 'نقطة' : 'Credits' }}</small></strong>
            <span class="package-price">{{ money(pack.priceEGP) }}</span>
            <span class="package-choice">{{ selectedPackage === pack.id ? (isAr ? 'تم الاختيار' : 'Selected') : (isAr ? 'اختاري الباقة' : 'Select pack') }}</span>
          </button>
        </div>
        <div class="checkout-box">
          <h3>{{ isAr ? 'طريقة الدفع' : 'Payment method' }}</h3>
      <label class="provider-option"><input v-model="provider" type="radio" value="vodafone_cash"><span><b>Vodafone Cash</b><small>{{ isAr ? 'تحويل من محفظتك على رقم المنصة' : 'Transfer from your wallet to the platform number' }}</small></span></label>
<label class="provider-option"><input v-model="provider" type="radio" value="instapay"><span><b>InstaPay</b><small>{{ isAr ? 'تحويل فوري عبر إنستا باي' : 'Instant transfer via InstaPay' }}</small></span></label>
<p class="muted tiny">{{ isAr ? 'هتحوّل المبلغ بنفسك، وبعد ما نتأكد من وصوله بتتضاف النقاط. ما تدخلش بيانات كارت.' : 'You transfer the amount yourself; credits are added once we confirm it arrived. Never enter card details.' }}</p>
  
          <button class="btn block" :disabled="submitting || loading || !selected" @click="createOrder">{{ submitting ? (isAr ? 'جارٍ إنشاء الطلب...' : 'Creating order...') : (isAr ? 'متابعة لمراجعة الطلب' : 'Continue to payment review') }}</button>
        </div>
      </section>

      <aside class="side-stack">
        <section class="card-panel order-summary">
          <h2>{{ isAr ? 'ملخص الباقة' : 'Your selected pack' }}</h2>
          <h3>{{ selected ? (isAr ? ({starter:'الباقة المبدئية',scholar:'باقة المتعلم',master:'الباقة المتقدمة'}[selected.id]) : selected.name) : '—' }}</h3>
          <strong class="summary-credits">{{ selected?.credits || 0 }} {{ isAr ? 'نقطة' : 'Skill Credits' }}</strong>
          <span class="muted">{{ isAr ? 'الإجمالي' : 'Total to pay' }}</span>
          <strong class="summary-price">{{ money(selected?.priceEGP) }}</strong>
          <div class="soft-note"><b>{{ isAr ? 'لا توجد رسوم مخفية' : 'No hidden processing fees' }}</b><p>{{ isAr ? 'تُضاف النقاط بعد تأكيد بوابة الدفع للعملية بنجاح.' : 'Credits are added only after the payment gateway confirms settlement.' }}</p></div>
          <p class="muted tiny">{{ isAr ? 'طرق الدفع المدعومة عند تفعيل الربط: Paymob وFawry.' : 'Payment providers planned for integration: Paymob and Fawry.' }}</p>
        </section>
        <section class="card-panel">
          <h2>{{ isAr ? 'آخر المعاملات' : 'Recent transactions' }}</h2>
          <div v-if="!wallet.transactions.length" class="empty-state">{{ isAr ? 'لسه مفيش معاملات.' : 'No transactions yet.' }}</div>
          <div v-for="tx in wallet.transactions" :key="tx._id" class="transaction-row"><div><b>{{ transactionLabel(tx.type) }}</b><small>{{ new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') }}</small></div><strong>{{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}</strong></div>
        </section>
      </aside>
    </div>
  </section>
</template>
