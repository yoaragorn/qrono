<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue')" persistent max-width="500px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Enter Password</span>
      </v-card-title>
      <v-card-text>
        <p class="mb-4">To view your private albums, please re-enter your password.</p>
        <v-form @submit.prevent="handleUnlock">
          <v-text-field
            v-model="password"
            label="Password"
            type="password"
            required
            autofocus
          ></v-text-field>
          <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <!-- Use the v-model compliant close function -->
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          @click="handleUnlock"
          :loading="loading"
          :disabled="loading"
        >
          Unlock
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui'; // Import UI Store for better notifications

defineProps({ modelValue: Boolean });
// --- FIX #1: Clean up emits. 'close' is not needed if we use v-model correctly. ---
const emit = defineEmits(['update:modelValue']);

const password = ref('');
const loading = ref(false); // Initialized to false, which is correct.
const authStore = useAuthStore();
const uiStore = useUiStore(); // Instantiate UI store

// Function to close the dialog via v-model
const closeDialog = () => {
  emit('update:modelValue', false);
};

const handleUnlock = async () => {
  if (!password.value) {
    uiStore.showSnackbar({ text: 'Password is required.', color: 'warning' });
    return;
  }

  loading.value = true; // <-- FIX #2: Move this line HERE.

  try {
    await authStore.verifyPassword(password.value);
    uiStore.showSnackbar({ text: 'Private albums unlocked!', color: 'info' });
    closeDialog(); // Use the correct close function
  } catch (err) {
    // We no longer need the local 'error' ref. The snackbar is better.
    const errorMsg = err.response?.data?.msg || 'An error occurred.';
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
    password.value = ''; // Clear password field regardless of outcome
    loading.value = false;
  }
};
</script>
