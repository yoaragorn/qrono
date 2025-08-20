<!-- This Vue component defines a single card that represents a "memory" within an album.
 It is a "smart" presentational component because while its primary job is to display data
 passed down to it (the memory object), it also contains its own internal logic and state
 to handle a user action—specifically, deleting the memory. It shows the memory's cover image
 and title, and provides actions to view the memory in detail or to delete it via a built-in
 confirmation dialog. -->

<template>
  <v-card>
    <v-img
      :src="memory.cover_image_url || 'https://cdn.vuetifyjs.com/images/parallax/material.jpg'"
      height="150px"
      cover
      class="grey-lighten-2 align-end text-white"
      @click="viewMemory"
      style="cursor: pointer;"
      gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.6)"
    >
      <v-card-title>{{ memory.title }}</v-card-title>
    </v-img>

    <v-card-actions>
      <v-card-subtitle class="pl-2">{{ new Date(memory.created_at).toLocaleDateString() }}</v-card-subtitle>
      <v-spacer></v-spacer>
      <!-- Delete Button -->
      <v-btn
        icon="mdi-delete"
        variant="text"
        color="grey"
        @click.stop="openDeleteDialog"
      ></v-btn>
    </v-card-actions>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" persistent max-width="400px">
      <v-card>
        <v-card-title class="text-h5">Confirm Deletion</v-card-title>
        <v-card-text>Are you sure you want to delete this memory? This action cannot be undone.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="red-darken-1"
            text
            @click="confirmDelete"
            :loading="isDeleting"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'; // Import Vue's Composition API for reactivity
import { useAlbumStore } from '@/stores/albums'; // Import Album Store for memory management
import { useUiStore } from '@/stores/ui'; // Import UI Store for better notifications

const props = defineProps({ // Define props to accept a memory object
  memory: { // This prop is expected to be an object representing a memory
    type: Object, // The type of the memory prop is an Object
    required: true, // This prop is required, meaning the parent component must provide it
  },
});

const emit = defineEmits(['selectMemory']); // Define emits to notify the parent component when a memory is selected

const albumStore = useAlbumStore(); // Instantiate Album store to access memory management methods
const uiStore = useUiStore(); // Instantiate UI store for better user notifications

const deleteDialog = ref(false); // Ref to manage the visibility of the delete confirmation dialog
const isDeleting = ref(false); // Ref to manage the loading state during deletion

const viewMemory = () => { // Function to handle viewing the memory details
  emit('selectMemory', props.memory.id); // Emit an event to notify the parent component that a memory has been selected
};

const openDeleteDialog = () => { // Function to open the delete confirmation dialog
  deleteDialog.value = true; // Set the delete dialog visibility to true
};

const confirmDelete = async () => { // Function to handle the deletion of the memory
  isDeleting.value = true; // Set the loading state to true to indicate that deletion is in progress
  try { // Attempt to delete the memory using the Album store
    await albumStore.deleteMemory(props.memory.id); // Call the deleteMemory method from the Album store with the memory ID
    uiStore.showSnackbar({ text: 'Memory deleted successfully.', color: 'success' }); // Show a success notification
    deleteDialog.value = false; // Close the delete confirmation dialog
  } catch (err) { // Catch any errors that occur during deletion
    const errorMsg = err.response?.data?.msg || 'Failed to delete memory.'; // Extract the error message from the response or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error notification with the error message
  } finally { // Ensure that the loading state is reset regardless of success or failure
    isDeleting.value = false; // Reset the loading state to false
  }
};
</script>
