// This file uses the Axios library to create a single, reusable "API client." Its main purpose
// is to pre-configure all outgoing requests with the correct backend server URL. Most importantly,
// it uses an Axios Interceptor to automatically attach the user's authentication token (JWT)
// to the header of every single request made by the application. This centralizes API and authentication
// logic, keeping the rest of the codebase (like the Pinia stores) clean and simple.

import axios from 'axios'; // Import Axios for making HTTP requests
import { useAuthStore } from '@/stores/auth'; // Import Auth Store to manage authentication state

const apiClient = axios.create({ // Create an Axios instance with default settings
  baseURL: import.meta.env.VITE_API_BASE_URL, // Base URL for the API, set via environment variable
  headers: { // Default headers for all requests
    'Content-Type': 'application/json', // Set content type to JSON
  },
});

// --- Axios Interceptor ---
// This is a powerful feature that lets us run code on every outgoing request.
apiClient.interceptors.request.use( // Interceptor to modify requests before they are sent
  (config) => { // Access the authentication store to get the current user's token
    const authStore = useAuthStore(); // Get the authentication store instance
    const token = authStore.token; // Get the authentication token from the store
    if (token) { // Check if a token exists
      // If a token exists, add it to the 'x-auth-token' header
      config.headers['x-auth-token'] = token; // Set the token in the request headers
    }
    return config; // Return the modified config object
  },
  (error) => { // Handle any errors that occur before the request is sent
    return Promise.reject(error); // Reject the promise with the error
  }
);

export default apiClient; // Export the configured Axios instance for use in other parts of the application
