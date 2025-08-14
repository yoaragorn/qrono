<template>
  <v-card>
    <v-img
      :src="coverImageUrl"
      height="150px"
      cover
      class="grey-lighten-2 align-end text-white"
      @click="viewMemory"
      style="cursor: pointer;"
      gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.6)"
    >
      <!-- Put the title inside the image for a nicer look -->
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
import { ref, computed } from 'vue';
import { useAlbumStore } from '@/stores/albums';
import { useUiStore } from '@/stores/ui';

const props = defineProps({
  memory: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['selectMemory']);

const albumStore = useAlbumStore();
const uiStore = useUiStore();

const deleteDialog = ref(false);
const isDeleting = ref(false);

const viewMemory = () => {
  emit('selectMemory', props.memory.id);
};

const openDeleteDialog = () => {
  deleteDialog.value = true;
};

const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    await albumStore.deleteMemory(props.memory.id);
    uiStore.showSnackbar({ text: 'Memory deleted successfully.', color: 'success' });
    deleteDialog.value = false;
  } catch (err) {
    const errorMsg = err.response?.data?.msg || 'Failed to delete memory.';
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
    isDeleting.value = false;
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- THIS IS THE CORRECTED COMPUTED PROPERTY ---
const coverImageUrl = computed(() => {
  // Check if the memory object has a cover_image_url and it's not empty
  if (props.memory && props.memory.cover_image_url) {
    // Take the relative path, replace backslashes, and PREPEND the base URL
    const imagePath = props.memory.cover_image_url.replace(/\\/g, '/');
    return `${API_BASE_URL}/${imagePath}`;
  }
  // If no image, provide a default placeholder
  return 'https://cdn.vuetifyjs.com/images/parallax/material.jpg';
});
// ---------------------------------------------
</script>
