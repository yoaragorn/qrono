// This file uses the official vue-router library to define all the possible "pages" (routes)
// in your application. It maps specific URL paths (like /dashboard or /album/123) to the
// corresponding Vue components that should be rendered for that path. Crucially, it also
// implements a navigation guard, which is a security checkpoint that runs before every navigation,
// to protect certain routes and ensure that only authenticated users can access private content.

import { createRouter, createWebHistory } from 'vue-router'; // Import Vue Router for routing
import { useAuthStore } from '@/stores/auth'; // Import Auth Store to manage authentication state

const router = createRouter({ // Create a new router instance
  history: createWebHistory(import.meta.env.BASE_URL), // Use HTML5 history mode for cleaner URLs
  routes: [ // Define the application routes
    {
      path: '/', // Default route
      name: 'landing', // Name of the route
      component: () => import('../views/LandingView.vue'), // Public page
    },
    {
      path: '/login', // Login route
      name: 'login', // Name of the route
      component: () => import('../views/LoginView.vue'), // Public page
    },
    {
      path: '/register', // Registration route
      name: 'register', // Name of the route
      component: () => import('../views/RegisterView.vue'), // Public page
    },
    {
      path: '/dashboard', // Dashboard route
      name: 'dashboard', // Name of the route
      component: () => import('../views/DashboardView.vue'), // Main application page
      meta: { requiresAuth: true }, // This route requires login
    },
    {
      path: '/album/:id', // Album view route
      name: 'album-view', // Name of the route
      component: () => import('../views/AlbumView.vue'), // Album details page
      meta: { requiresAuth: true }, // This route requires login
    },
    {
      path: '/memory/:id', // Memory view route
      name: 'memory-view', // Name of the route
      component: () => import('../views/MemoryView.vue'), // Memory details page
      meta: { requiresAuth: true }, // This route requires login
    },
  ],
});

// --- Navigation Guard ---
router.beforeEach((to, from, next) => { // This function runs before each route change
  const authStore = useAuthStore(); // Access the authentication store to check login status
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth); // Check if the route requires authentication

  if (requiresAuth && !authStore.isAuthenticated) { // If the route requires authentication and the user is not logged in
    // If route requires auth and user is not logged in, redirect to login page.
    next({ name: 'login' }); // Redirect to the login page
  } else { // If the route does not require authentication or the user is logged in
    // Otherwise, proceed as normal.
    next(); // Allow the navigation to continue
  }
});

export default router; // Export the router instance so it can be used in the main application
