<!-- This Vue component renders the Sign Up Page for the Qrono application.
 It is a public-facing page designed to allow new users to create an account.
 The component provides a simple form to collect a username and password.
 It manages its own internal state for loading and error/success feedback.
 When the form is submitted, it calls the register action in the central Pinia
 auth store and, upon a successful registration, provides a confirmation message
 before automatically redirecting the user to the login page. -->

<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Sign Up for Qrono</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleRegister">
              <v-text-field v-model="username" label="Username" prepend-icon="mdi-account" required></v-text-field>
              <v-text-field v-model="password" label="Password" prepend-icon="mdi-lock" type="password" required></v-text-field>
              <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
              <v-alert v-if="success" type="success" dense>{{ success }}</v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="handleRegister"
              :loading="loading"
              :disabled="loading"
            >
              Sign Up
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'; // Import Vue's reactive ref function
import { useAuthStore } from '@/stores/auth'; // Import the Pinia store for managing authentication state
import { useRouter } from 'vue-router'; // Import Vue Router to navigate after registration

const username = ref(''); // Reactive reference for the username input
const password = ref(''); // Reactive reference for the password input
const error = ref(null); // Reactive reference for error messages
const success = ref(null); // Reactive reference for success messages

const loading = ref(false); // Reactive reference to indicate if the registration is in progress

const authStore = useAuthStore(); // Access the authentication store to call the register action
const router = useRouter(); // Access the router to navigate after successful registration

const handleRegister = async () => { // Function to handle the registration process
  try { // Start the loading state
    loading.value = true; // Set loading to true to indicate the registration process has started
    error.value = null; // Reset any previous error messages
    success.value = null; // Reset any previous success messages
    await authStore.register({ username: username.value, password: password.value }); // Call the register action in the auth store with the username and password
    success.value = "Registration successful! Redirecting to login..."; // Set success message to inform the user of successful registration
    setTimeout(() => { // Redirect to the login page after a 2 seconds delay
      router.push('/login');
    }, 2000);
  } catch (err) { // Handle any errors that occur during registration
    error.value = err.response?.data?.msg || 'An error occurred during registration.'; // Set error message to inform the user of the error
  } finally { // End the loading state
    loading.value = false; // Set loading to false to indicate the registration process has ended
  }
};
</script>
