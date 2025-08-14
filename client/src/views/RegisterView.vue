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
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const error = ref(null);
const success = ref(null);

const loading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  try {
    loading.value = true;
    error.value = null;
    success.value = null;
    await authStore.register({ username: username.value, password: password.value });
    success.value = "Registration successful! Redirecting to login...";
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (err) {
    error.value = err.response?.data?.msg || 'An error occurred during registration.';
  } finally {
    loading.value = false;
  }
};
</script>
