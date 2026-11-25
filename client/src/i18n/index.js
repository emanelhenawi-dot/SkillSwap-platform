import { createI18n } from 'vue-i18n';
import en from './en.json';
import ar from './ar.json';

const saved = localStorage.getItem('lang') || 'en';

export const i18n = createI18n({ legacy: false, locale: saved, fallbackLocale: 'en', messages: { en, ar } });

// تبديل اللغة + اتجاه الصفحة RTL/LTR فوراً (REQ-2, REQ-50)
export function setLang(lang) {
  i18n.global.locale.value = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
setLang(saved);