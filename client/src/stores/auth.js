// This Pinia store is the single source of truth for user authentication. It manages the user's JWT
// (authentication token), their profile data, and the special "unlocked" status for private albums.
// It encapsulates all API calls related to authentication and provides a clean, reactive interface for
// any component in the application to check if a user is logged in. Crucially, it handles the
// persistence of the user's session across page reloads and browser restarts.

import { defineStore } from 'pinia'; // Import Pinia for state management
import api from '@/services/api'; // Import the API client we configured earlier

export const useAuthStore = defineStore('auth', { // Define a new Pinia store named 'auth'
  state: () => ({ // Initial state of the store
    token: localStorage.getItem('token') || null, // JWT token for authentication, stored in localStorage
    user: null, // User details, initially null
    // JSON.parse converts the "true" string back to a boolean
    isPrivateModeUnlocked: JSON.parse(sessionStorage.getItem('isPrivateModeUnlocked')) || false,
  }),

  getters: { // Define computed properties for the store
    isAuthenticated: (state) => !!state.token, // Check if the user is authenticated by checking if a token exists
  },

  actions: { // Define actions to modify the state
    async register(credentials) { // Register a new user
      // No need to store any state here, just call the API.
      // The component will handle the success/error message.
      await api.post('/api/auth/register', credentials);
    },

    async login(credentials) { // Log in an existing user
      const response = await api.post('/api/auth/login', credentials); // Send login credentials to the API
      const token = response.data.token; // Extract the JWT token from the response

      // Store the token
      this.token = token;
      localStorage.setItem('token', token);

      await this.fetchUser(); // Fetch user details after successful login
    },

    async fetchUser() { // Fetch the current user's details from the API
      if (this.token) { // Check if a token exists
        try { // Make an API call to get the user details
          const response = await api.get('/api/auth/me'); // Use the API client to get user details
          this.user = response.data; // Store the user details in the state
        } catch (error) { // Handle any errors that occur during the fetch
          // If token is invalid/expired, log out
          console.error("Failed to fetch user. Token might be invalid.", error);
          this.logout();
        }
      }
    },

    async verifyPassword(password) { // Verify the user's password for private mode
      await api.post('/api/auth/verify-password', { password }); // Send the password to the API for verification
      this.isPrivateModeUnlocked = true; // Set private mode as unlocked
      sessionStorage.setItem('isPrivateModeUnlocked', true); // Store the unlocked state in sessionStorage
    },

    logout() { // Log out the user
      this.token = null; // Clear the token from the state
      this.user = null; // Clear the user details from the state
      this.isPrivateModeUnlocked = false; // Reset private mode state
      localStorage.removeItem('token'); // Remove the token from localStorage
      sessionStorage.removeItem('isPrivateModeUnlocked'); // Remove the private mode state from sessionStorage
    },
  },
});
