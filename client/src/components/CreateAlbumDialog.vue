<!-- This file defines a self-contained, reusable modal (dialog box) for
 creating a new album. It is a "smart" component that manages its own
 internal state, including user input, validation, loading indicators,
 and the complex logic for compressing and preparing an image for upload.
 It's designed to be easily integrated into any parent page (like the Dashboard)
 using a simple v-model directive to control its visibility. -->

<template>
  <v-dialog :model-value="modelValue" persistent max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Create New Album</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-form ref="form">
            <v-text-field
              v-model="album.title"
              label="Album Title*"
              :rules="[v => !!v || 'Title is required']"
              required
            ></v-text-field>
            <v-textarea
              v-model="album.description"
              label="Description"
              rows="3"
            ></v-textarea>

            <!-- Hidden native file input -->
            <input
              type="file"
              ref="nativeFileInput"
              @change="onFileSelect"
              accept="image/*"
              style="display: none;"
            />

            <!-- Button that triggers the hidden input -->
            <v-btn
              @click="triggerNativeFileInput"
              prepend-icon="mdi-image-area"
              variant="tonal"
              class="mb-4"
            >
              Select Cover Image
            </v-btn>

            <!-- Chip to show the selected file's name -->
            <v-chip
              v-if="selectedCoverFile"
              closable
              @click:close="clearFile"
            >
              {{ selectedCoverFile.name }}
            </v-chip>

            <v-switch
              v-model="album.visible"
              label="Make this album public?"
              color="primary"
            ></v-switch>
          </v-form>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="blue-darken-1"
          variant="text"
          @click="saveAlbum"
          :loading="loading"
          :disabled="loading"
        >
          <span v-if="isCompressing">Compressing...</span>
          <span v-else>Save</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'; // Using Vue 3's Composition API for better state management and reactivity
import imageCompression from 'browser-image-compression'; // Importing a library for client-side image compression
import { useAlbumStore } from '@/stores/albums'; // Importing the album store for managing album data
import { useUiStore } from '@/stores/ui'; // Importing the UI store for managing UI-related state like notifications

const props = defineProps({ modelValue: Boolean }); // This prop controls the visibility of the dialog, allowing it to be used with v-model
const emit = defineEmits(['update:modelValue']); // This event is emitted to update the parent component when the dialog is closed

const albumStore = useAlbumStore(); // Accessing the album store to handle album creation logic
const uiStore = useUiStore(); // Accessing the UI store to show notifications and manage UI state
const form = ref(null); // Reference to the form element for validation purposes
const loading = ref(false); // Loading state to show a spinner while the album is being saved
const isCompressing = ref(false); // State to indicate if the image is currently being compressed
const nativeFileInput = ref(null); // Reference to the hidden native file input element for selecting cover images
const selectedCoverFile = ref(null); // Reactive reference to store the selected cover image file

// Album data is a reactive object, with 'visible' defaulting to true.
const album = reactive({
  title: '',
  description: '',
  visible: true,
});

const closeDialog = () => { // This function is called to close the dialog
  emit('update:modelValue', false);
};

const triggerNativeFileInput = () => { // This function programmatically triggers the hidden file input to open the file selection dialog
  nativeFileInput.value.click();
};

const onFileSelect = (event) => { // This function is called when a file is selected from the file input
  const file = event.target.files[0];
  selectedCoverFile.value = file || null;
};

const clearFile = () => { // This function clears the selected file and resets the native file input
  selectedCoverFile.value = null;
  if (nativeFileInput.value) {
    nativeFileInput.value.value = '';
  }
};

// Watcher to reset the entire form when the dialog opens.
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    album.title = '';
    album.description = '';
    album.visible = true; // Reset to public by default
    clearFile();
    form.value?.resetValidation();
  }
});

const saveAlbum = async () => { // This function is called when the user clicks the "Save" button to create a new album
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;

  const formData = new FormData(); // Using FormData to prepare the data for submission, including the cover image file
  formData.append('title', album.title); // Append the album title to the FormData
  formData.append('description', album.description); // Append the album description to the FormData
  formData.append('visible', String(album.visible)); // Append the visibility status to the FormData

  try { // Try-catch block to handle errors during album creation
    let finalFile = selectedCoverFile.value; // Get the selected cover file from the reactive reference

    // Compress the file if it exists and is larger than 500KB
    if (finalFile && finalFile.size > 500 * 1024 && finalFile.type.startsWith('image/')) { // Check if the file is an image and larger than 500KB
      isCompressing.value = true; // Start the compression process
      console.log(`Compressing album cover ${finalFile.name}...`); // Log the start of compression
      const options = { // Define options for image compression
        maxSizeMB: 0.5, // Maximum size in MB after compression
        maxWidthOrHeight: 1920, // Maximum width or height of the image
        useWebWorker: true, // Use a web worker for compression to avoid blocking the UI
      };
      const compressedBlob = await imageCompression(finalFile, options); //
      // Create a new File object to retain the original filename
      finalFile = new File([compressedBlob], finalFile.name, { type: compressedBlob.type }); // Create a new File object with the compressed blob and original filename
      console.log(`Compressed cover to ${(finalFile.size / 1024).toFixed(2)} KB`); // Log the size of the compressed file
    }

    isCompressing.value = false; // Reset the compression state

    // Append the final file (either original or compressed) to the FormData
    if (finalFile) { // Check if a file is selected
      formData.append('cover_image', finalFile); // Append the cover image file to the FormData
    }

    await albumStore.createAlbum(formData); // Call the album store's createAlbum method to save the new album
    uiStore.showSnackbar({ text: 'Album created successfully!', color: 'success' }); // Show a success notification
    closeDialog(); // Close the dialog after successful album creation

  } catch (err) { // Catch any errors that occur during the album creation process
    isCompressing.value = false; // Reset the compression state
    const errorMsg = err.response?.data?.msg || "Failed to create album."; // Extract the error message from the response, or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error notification with the error message
  } finally { // This block runs regardless of success or failure
    isCompressing.value = false; // Reset the compression state
    loading.value = false; // Reset the loading state
  }
};
</script>
