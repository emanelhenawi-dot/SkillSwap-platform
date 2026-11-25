<script setup>
import { useI18n } from 'vue-i18n';
import { setLang } from '../i18n';

const { locale } = useI18n();
const toggle = () => setLang(locale.value === 'en' ? 'ar' : 'en');
</script>

<template>
  <button class="lang" @click="toggle">🌐 {{ locale === 'en' ? 'العربية' : 'English' }}</button>
</template>