import { defineStore } from 'pinia';
import api from '../services/api';

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'parent' ? '/parent' : '/app');

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token'),
    user: null,
    pendingGoogle: null, // { credential, name, email } لو مستخدم جديد دخل بجوجل
  }),
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
    },
    async fetchMe() {
      try {
        this.user = (await api.get('/auth/me')).data.user;
      } catch {
        this.logout();
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
    },
  },
});