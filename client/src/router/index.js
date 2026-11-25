import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, homeFor } from '../stores/auth';

const routes = [
  { path: '/', redirect: '/register' }, // اللوجو (Splash) بعدين صفحة التسجيل
  { path: '/register', component: () => import('../views/RegisterView.vue'), meta: { guest: true } },
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
  { path: '/app', component: () => import('../views/student/StudentHome.vue'), meta: { roles: ['user'] } },
  { path: '/parent', component: () => import('../views/parent/ParentDashboard.vue'), meta: { roles: ['parent'] } },
  { path: '/admin', component: () => import('../views/admin/AdminDashboard.vue'), meta: { roles: ['admin'] } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.token && !auth.user) await auth.fetchMe();
  if (to.meta.guest && auth.user) return homeFor(auth.user.role);
  if (to.meta.roles) {
    if (!auth.user) return '/login';
    if (!to.meta.roles.includes(auth.user.role)) return homeFor(auth.user.role);
  }
});

export default router;