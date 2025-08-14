// stores/auth.js
import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
    // JSON.parse converts the "true" string back to a boolean
    isPrivateModeUnlocked: JSON.parse(sessionStorage.getItem('isPrivateModeUnlocked')) || false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async register(credentials) {
      // No need to store any state here, just call the API.
      // The component will handle the success/error message.
      await api.post('/api/auth/register', credentials);
    },

    async login(credentials) {
      const response = await api.post('/api/auth/login', credentials);
      const token = response.data.token;

      // Store the token
      this.token = token;
      localStorage.setItem('token', token);

      // We can also fetch user data right after login
      await this.fetchUser();
    },

    async fetchUser() {
      if (this.token) {
        try {
          const response = await api.get('/api/auth/me');
          this.user = response.data;
        } catch (error) {
          // If token is invalid/expired, log out
          console.error("Failed to fetch user. Token might be invalid.", error);
          this.logout();
        }
      }
    },

    async verifyPassword(password) {
      await api.post('/api/auth/verify-password', { password });
      this.isPrivateModeUnlocked = true;
      sessionStorage.setItem('isPrivateModeUnlocked', true);
    },

    logout() {
      this.token = null;
      this.user = null;
      this.isPrivateModeUnlocked = false;
      localStorage.removeItem('token');
      sessionStorage.removeItem('isPrivateModeUnlocked');
    },
  },
});
