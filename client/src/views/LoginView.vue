<!-- This Vue component renders the Login Page of the application. Its sole purpose is to
 provide a form for existing users to enter their credentials and sign in. It manages the
 form's state (username, password, loading, and error states) and, upon submission, calls
 the appropriate action in the Pinia auth store to perform the authentication. On a successful
 login, it is responsible for redirecting the user to their private dashboard. -->

<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Log In to Qrono</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="Username"
                name="username"
                prepend-icon="mdi-account"
                type="text"
                required
              ></v-text-field>
              <v-text-field
                v-model="password"
                label="Password"
                name="password"
                prepend-icon="mdi-lock"
                type="password"
                required
              ></v-text-field>
              <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="handleLogin"
              :loading="loading"
              :disabled="loading"
            >
              Log In
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'; // Import Vue's reactive ref function
import { useAuthStore } from '@/stores/auth'; // Import the authentication store to manage login state
import { useRouter } from 'vue-router'; // Import Vue Router to navigate after login

const username = ref(''); // Reactive reference for the username input field
const password = ref(''); // Reactive reference for the password input field
const error = ref(null); // Reactive reference for any error messages during login
const loading = ref(false); // Reactive reference to indicate if the login process is in progress

const authStore = useAuthStore(); // Access the authentication store to perform login actions
const router = useRouter(); // Access the Vue Router to navigate after a successful login

const handleLogin = async () => { // Function to handle the login process
  try { // Start the login process
    loading.value = true; // Set loading state to true to indicate the process has started
    error.value = null; // Reset any previous error messages
    await authStore.login({ username: username.value, password: password.value }); // Call the login action from the auth store with the provided credentials
    router.push('/dashboard'); // Navigate to the dashboard after successful login
  } catch (err) { // Catch any errors that occur during the login process
    error.value = err.response?.data?.msg || 'An error occurred during login.'; // Set the error message to display to the user
  } finally { // Ensure the loading state is reset regardless of success or failure
    loading.value = false; // Set loading state back to false to indicate the process has completed
  }
};
</script>
