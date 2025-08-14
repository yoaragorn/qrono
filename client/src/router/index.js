// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingView.vue'), // Public page
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'), // Public page
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'), // Public page
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }, // This route requires login
    },
    {
      path: '/album/:id',
      name: 'album-view',
      component: () => import('../views/AlbumView.vue'),
      meta: { requiresAuth: true }, // This route requires login
    },
    {
      path: '/memory/:id',
      name: 'memory-view',
      component: () => import('../views/MemoryView.vue'),
      meta: { requiresAuth: true }, // This route requires login
    },
  ],
});

// --- Navigation Guard ---
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !authStore.isAuthenticated) {
    // If route requires auth and user is not logged in, redirect to login page.
    next({ name: 'login' });
  } else {
    // Otherwise, proceed as normal.
    next();
  }
});

export default router;
