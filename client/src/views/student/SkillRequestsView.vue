<script setup>

import { ref, onMounted, computed } from 'vue';

import { useI18n } from 'vue-i18n';

import api, { errCode } from '../../services/api';

import { useAuthStore } from '../../stores/auth';

const { locale } = useI18n();

const auth = useAuthStore();

const isAr = computed(() => locale.value === 'ar');

const L = (ar, en) => isAr.value ? ar : en;

const requests = ref([]);

const myRequests = ref([]);

const tab = ref('browse');

const loading = ref(false);

const busy = ref(false);

const error = ref('');

const success = ref('');

const form = ref({

  title: '',

  description: '',

  subject: '',

  language: 'ar',

  level: 'beginner',

  urgency: 'regular'

});

const selected = ref(null);

const response = ref({

  responseText: '',

  responseUrl: ''

});

const bounty = computed(() =>
  form.value.urgency === 'urgent' ? 5 : 3
);

async function load() {

  loading.value = true;

  error.value = '';

  try {

    const [all, mine] = await Promise.all([

      api.get('/skill-requests'),

      api.get('/skill-requests/mine')

    ]);

    requests.value = all.data.requests;

    myRequests.value = mine.data.requests;

  } catch (e) {

    error.value = errCode(e);

  } finally {

    loading.value = false;

  }

}

async function createRequest() {

  busy.value = true;

  error.value = '';

  success.value = '';

  try {

    const { data } = await api.post(
      '/skill-requests',
      form.value
    );

    auth.user.points = data.balance;

    success.value = L(
      'تم إرسال طلبك وحجز النقاط بنجاح.',
      'Your request was created and points were reserved.'
    );

    form.value = {

      title: '',

      description: '',

      subject: '',

      language: 'ar',

      level: 'beginner',

      urgency: 'regular'

    };

    tab.value = 'mine';

    await load();

  } catch (e) {

    error.value = errCode(e);

  } finally {

    busy.value = false;

  }

}

async function claimRequest(id) {

  busy.value = true;

  error.value = '';

  try {

    await api.post(`/skill-requests/${id}/claim`);
selected.value = id;
    success.value = L(
      'تم حجز الطلب لك.',
      'Request successfully claimed.'
    );

    await load();

  } catch (e) {

    error.value = errCode(e);

  } finally {

    busy.value = false;

  }

}

async function submitExplanation(id) {

  busy.value = true;

  error.value = '';

  try {

    await api.post(
      `/skill-requests/${id}/submit`,
      response.value
    );

    response.value = {
      responseText: '',
      responseUrl: ''
    };

    selected.value = null;

    await load();

  } catch (e) {

    error.value = errCode(e);

  } finally {

    busy.value = false;

  }

}

async function acceptRequest(id) {

  busy.value = true;

  error.value = '';

  try {

    await api.post(`/skill-requests/${id}/accept`);

    success.value = L(
      'تم قبول الشرح وتوزيع النقاط.',
      'Explanation accepted and bounty distributed.'
    );

    await load();

    await auth.fetchMe();

  } catch (e) {

    error.value = errCode(e);

  } finally {

    busy.value = false;

  }

}

const statusText = status => {

  const labels = {

    open: L('متاح', 'Open'),

    claimed: L('قيد التنفيذ', 'In progress'),

    submitted: L('بانتظار القبول', 'Awaiting acceptance'),

    accepted: L('مكتمل', 'Completed')

  };

  return labels[status] || status;

};

onMounted(load);

</script>

<template>

  <section class="page-wrap">

    <div class="page-heading">

      <span class="eyebrow">
        SKILLS EXCHANGE
      </span>

      <h1>
        {{ L('طلبات الشرح', 'Skill Requests') }}
      </h1>

      <p>
        {{ L(
          'اطلب شرحًا يناسب احتياجك أو ساعد طالبًا آخر بمعرفتك.',
          'Request an explanation or share your knowledge with others.'
        ) }}
      </p>

    </div>

    <div class="stats">

      <div class="stat">

        <span class="muted">
          {{ L('رصيدك', 'Your balance') }}
        </span>

        <b>{{ auth.user?.points ?? 0 }}</b>

        <small>{{ L('نقطة', 'Points') }}</small>

      </div>

      <div class="stat">

        <span class="muted">
          {{ L('الطلبات المتاحة', 'Open requests') }}
        </span>

        <b>{{ requests.filter(r => r.status === 'open').length }}</b>

      </div>

      <div class="stat">

        <span class="muted">
          {{ L('طلباتي', 'My requests') }}
        </span>

        <b>{{ myRequests.length }}</b>

      </div>

    </div>

    <div class="tabs">

      <button
        :class="{ active: tab === 'browse' }"
        @click="tab = 'browse'"
      >
        {{ L('تصفح الطلبات', 'Browse Requests') }}
      </button>

      <button
        :class="{ active: tab === 'create' }"
        @click="tab = 'create'"
      >
        {{ L('طلب شرح جديد', 'Create Request') }}
      </button>

      <button
        :class="{ active: tab === 'mine' }"
        @click="tab = 'mine'"
      >
        {{ L('طلباتي', 'My Requests') }}
      </button>

    </div>

    <div v-if="error" class="alert error">
      {{ error }}
    </div>

    <div v-if="success" class="alert ok">
      {{ success }}
    </div>

    <!-- CREATE REQUEST -->

    <div v-if="tab === 'create'" class="card-panel">

      <h2>
        {{ L('إنشاء طلب شرح', 'Create a Skill Request') }}
      </h2>

      <form @submit.prevent="createRequest">

        <label>
          {{ L('عنوان الطلب', 'Request Title') }}
        </label>

        <input
          v-model="form.title"
          required
          minlength="3"
          maxlength="150"
          :placeholder="L('مثال: شرح Chapter 2 في الشبكات', 'Example: Explain Chapter 2 in Networks')"
        />

        <label>
          {{ L('المادة أو المجال', 'Subject') }}
        </label>

        <input
          v-model="form.subject"
          required
        />

        <label>
          {{ L('تفاصيل الطلب', 'Description') }}
        </label>

        <textarea
          v-model="form.description"
          required
          minlength="10"
          maxlength="1500"
          rows="5"
        />

        <div class="row">

          <div>

            <label>
              {{ L('اللغة', 'Language') }}
            </label>

            <select v-model="form.language">

              <option value="ar">العربية</option>

              <option value="en">English</option>

            </select>

          </div>

          <div>

            <label>
              {{ L('المستوى', 'Learning Level') }}
            </label>

            <select v-model="form.level">

              <option value="beginner">
                {{ L('مبتدئ', 'Beginner') }}
              </option>

              <option value="intermediate">
                {{ L('متوسط', 'Intermediate') }}
              </option>

              <option value="advanced">
                {{ L('متقدم', 'Advanced') }}
              </option>

            </select>

          </div>

        </div>

        <label>
          {{ L('درجة الاستعجال', 'Urgency') }}
        </label>

        <select v-model="form.urgency">

          <option value="regular">
            {{ L('عادي – 3 نقاط', 'Regular – 3 points') }}
          </option>

          <option value="urgent">
            {{ L('عاجل – 5 نقاط', 'Urgent – 5 points') }}
          </option>

        </select>

        <div class="alert info">

          {{ L(
            `سيتم حجز ${bounty} نقاط من محفظتك.`,
            `${bounty} points will be reserved from your wallet.`
          ) }}

        </div>

        <button
          class="btn block"
          :disabled="busy"
        >

          {{ busy
            ? L('جاري الإرسال...', 'Submitting...')
            : L('إرسال الطلب', 'Submit Request')
          }}

        </button>

      </form>

    </div>

    <!-- BROWSE REQUESTS -->

    <div v-if="tab === 'browse'">

      <div v-if="loading" class="card-panel">
        {{ L('جاري التحميل...', 'Loading...') }}
      </div>

      <div
        v-for="r in requests"
        :key="r._id"
        class="card-panel request-card"
      >

        <div class="request-top">

          <div>

            <span
              class="badge"
              :class="{ urgent: r.urgency === 'urgent' }"
            >

              {{ r.urgency === 'urgent'
                ? L('عاجل', 'URGENT')
                : L('عادي', 'REGULAR')
              }}

            </span>

            <h2>{{ r.title }}</h2>

            <p class="muted">
              {{ r.student?.name }} · {{ r.subject }}
            </p>

          </div>

          <strong class="request-points">
            {{ r.bounty }} ✦
          </strong>

        </div>

        <p>{{ r.description }}</p>

        <div class="request-meta">

          <span>{{ r.language === 'ar' ? 'العربية' : 'English' }}</span>

          <span>{{ r.level }}</span>

          <span>{{ statusText(r.status) }}</span>

        </div>

        <button
          v-if="r.status === 'open' && r.student?._id !== auth.user?.id"
          class="btn block"
          :disabled="busy"
          @click="claimRequest(r._id)"
        >

          {{ L('تنفيذ الطلب', 'Claim Request') }}

        </button>

        <div
          v-if="selected === r._id"
          class="response-form"
        >

          <label>
            {{ L('شرحك للطالب', 'Your explanation') }}
          </label>

          <textarea
            v-model="response.responseText"
            rows="4"
          />

          <label>
            {{ L('رابط الشرح (اختياري)', 'Explanation URL (optional)') }}
          </label>

          <input
            v-model="response.responseUrl"
            type="url"
            placeholder="https://..."
          />

          <button
            class="btn block"
            :disabled="busy"
            @click="submitExplanation(r._id)"
          >
            {{ L('تسليم الشرح', 'Submit Explanation') }}
          </button>

        </div>

      </div>

    </div>

    <!-- MY REQUESTS -->

    <div v-if="tab === 'mine'">

      <div
        v-for="r in myRequests"
        :key="r._id"
        class="card-panel"
      >

        <h2>{{ r.title }}</h2>

        <span class="badge">
          {{ statusText(r.status) }}
        </span>

        <p class="muted">
          {{ r.bounty }} {{ L('نقطة', 'points') }}
        </p>

        <div v-if="r.status === 'submitted'">

          <p>{{ r.responseText }}</p>

          <a
            v-if="r.responseUrl"
            :href="r.responseUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ L('فتح الشرح', 'Open explanation') }}
          </a>

          <button
            class="btn block"
            :disabled="busy"
            @click="acceptRequest(r._id)"
          >
            {{ L('قبول الشرح', 'Accept Explanation') }}
          </button>

        </div>

      </div>

      <p
        v-if="!myRequests.length"
        class="muted"
      >
        {{ L('لم تنشئي طلبات بعد.', 'You have no requests yet.') }}
      </p>

    </div>

  </section>

</template>

<style scoped>

.request-card {

  margin-bottom: 16px;

}

.request-top {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 12px;

}

.request-points {

  color: var(--primary);

  font-size: 23px;

  white-space: nowrap;

}

.request-meta {

  display: flex;

  flex-wrap: wrap;

  gap: 12px;

  color: var(--muted);

  font-size: 13px;

  margin-top: 16px;

}

.badge.urgent {

  background: #fee2e2;

  color: #b91c1c;

}

.response-form {

  margin-top: 20px;

  padding-top: 15px;

  border-top: 1px solid var(--border);

}

</style>