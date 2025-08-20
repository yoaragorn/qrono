<!-- This Vue component defines a self-contained, secure modal dialog that prompts the user
 to re-enter their password. Its sole purpose is to provide the "dual-layer security" for
 private albums. It is designed to be controlled from a parent component (the DashboardView)
 using a simple v-model directive. It manages its own form state, loading indicators, and
 communicates with the authentication store (Pinia) to verify the password with the backend. -->
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
import { ref } from 'vue'; // Import Vue's Composition API for reactivity
import { useAuthStore } from '@/stores/auth'; // Import Auth Store for password verification
import { useUiStore } from '@/stores/ui'; // Import UI Store for better notifications

defineProps({ modelValue: Boolean }); // Define props to accept a boolean for dialog visibility
const emit = defineEmits(['update:modelValue']); // Define emits to update the modelValue prop

const password = ref(''); // Ref to hold the password input
const loading = ref(false); // Ref to manage loading state
const authStore = useAuthStore(); // Instantiate Auth store to access password verification methods
const uiStore = useUiStore(); // Instantiate UI store

// Function to close the dialog via v-model
const closeDialog = () => { // This function is used to close the dialog
  emit('update:modelValue', false); // Emit an event to update the modelValue prop, effectively closing the dialog
};

const handleUnlock = async () => { // Function to handle the unlock action
  if (!password.value) { // Check if the password is empty
    uiStore.showSnackbar({ text: 'Password is required.', color: 'warning' }); // Show a warning snackbar if the password is empty
    return; // Exit the function early if no password is provided
  }

  loading.value = true; // Set loading state to true to indicate processing

  try { // Attempt to verify the password using the auth store
    await authStore.verifyPassword(password.value); // Call the verifyPassword method from the auth store with the provided password
    uiStore.showSnackbar({ text: 'Private albums unlocked!', color: 'info' }); // Show a success snackbar notification
    closeDialog(); // Close the dialog by emitting an event to update the modelValue prop
  } catch (err) { // Catch any errors that occur during password verification
    const errorMsg = err.response?.data?.msg || 'An error occurred.'; // Extract the error message from the response or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error snackbar notification with the error message
  } finally { // Ensure that the loading state is reset and the password field is cleared
    password.value = ''; // Clear the password input field
    loading.value = false; // Reset the loading state to false
  }
};
</script>
