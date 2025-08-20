<!-- This Vue component is a page-level View responsible for displaying all the information
 related to a single album. It reads the album's ID from the URL, fetches the album's details
 and its list of memories from the backend via the Pinia store, and then renders that
 information. It serves as a "container" that orchestrates several key user actions,
 including adding new memories, changing the album's cover photo, and deleting the entire
 album, by managing the visibility of various dialog components. -->

<template>
  <v-container>
    <!-- Loading State -->
    <div v-if="albumStore.loading" class="text-center">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <!-- Content -->
    <div v-else-if="albumStore.currentAlbum">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        to="/dashboard"
        class="mb-4"
      >
        Back to Dashboard
      </v-btn>

      <!-- Hidden file input for updating the cover -->
      <input type="file" ref="fileInput" @change="onFileChange" style="display: none;" accept="image/*" />

      <div class="d-flex align-center mb-6">
        <!-- Small thumbnail that triggers the file input -->
        <v-avatar
          :image="coverImageUrl"
          icon="mdi-image-album"
          size="80"
          class="mr-4 elevation-2"
          style="cursor: pointer;"
          @click="triggerFileInput"
        ></v-avatar>

        <div class="flex-grow-1">
          <div class="d-flex justify-space-between align-start">
            <h1 class="text-h4">{{ albumStore.currentAlbum.title }}</h1>
            <v-btn
              icon="mdi-delete"
              variant="text"
              color="red"
              @click="deleteDialog = true"
            ></v-btn>
          </div>
          <p class="text-body-1">{{ albumStore.currentAlbum.description }}</p>
        </div>
      </div>

      <v-divider class="my-4"></v-divider>

      <div class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-h5">Memories</h2>
        <v-btn color="primary" @click="createMemoryDialog = true">Add Memory</v-btn>
      </div>

      <!-- Memories Grid -->
      <v-row v-if="albumStore.memories.length > 0">
        <v-col v-for="memory in albumStore.memories" :key="memory.id" cols="12" sm="6" md="4">
          <MemoryCard :memory="memory" @selectMemory="viewMemory" />
        </v-col>
      </v-row>

      <div v-if="albumStore.memories.length === 0" class="text-center grey--text mt-8">
        <p>This album has no memories yet.</p>
        <v-btn color="primary" @click="createMemoryDialog = true">Add First Memory</v-btn>
      </div>
    </div>

    <!-- Error/Not Found State -->
    <div v-else class="text-center mt-10">
      <h2>Album not found</h2>
      <p>The album you are looking for does not exist or you do not have permission to view it.</p>
      <v-btn to="/dashboard">Go to Dashboard</v-btn>
    </div>

    <!-- Dialogs -->
    <v-dialog v-model="deleteDialog" persistent max-width="450px">
       <v-card>
        <v-card-title class="text-h5">Delete Album?</v-card-title>
        <v-card-text>
          Are you sure you want to delete this entire album? <strong>All of its memories will be permanently lost.</strong>
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="red-darken-1"
            text
            @click="confirmDeleteAlbum"
            :loading="isDeleting"
          >
            Delete Album
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CreateMemoryDialog
      v-if="albumStore.currentAlbum"
      v-model="createMemoryDialog"
      :album-id="albumStore.currentAlbum.id"
      @memory-created="albumStore.fetchAlbumDetails(albumStore.currentAlbum.id)"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // Using Vue 3's Composition API
import imageCompression from 'browser-image-compression'; // Importing image compression library
import { useRoute, useRouter } from 'vue-router'; // Using Vue Router for navigation
import { useAlbumStore } from '@/stores/albums'; // Importing the Pinia store for album management
import { useUiStore } from '@/stores/ui'; // Importing the Pinia store for UI management
import MemoryCard from '@/components/MemoryCard.vue'; // Importing the MemoryCard component to display individual memories
import CreateMemoryDialog from '@/components/CreateMemoryDialog.vue'; // Importing the dialog component for creating new memories

const route = useRoute(); // Accessing the current route to get the album ID
const router = useRouter(); // Using the router to navigate between views
const albumStore = useAlbumStore(); // Accessing the album store to manage album data
const uiStore = useUiStore(); // Accessing the UI store to manage UI-related state

const fileInput = ref(null); // Reference to the hidden file input for updating the album cover
const deleteDialog = ref(false); // Reference to control the visibility of the delete confirmation dialog
const isDeleting = ref(false); // Flag to indicate if the album is currently being deleted
const createMemoryDialog = ref(false); // Reference to control the visibility of the dialog for creating new memories

const triggerFileInput = () => { // Function to programmatically trigger the hidden file input
  fileInput.value.click(); // Simulate a click on the hidden file input to open the file dialog
};

const onFileChange = async (event) => {  // Function to handle file selection for updating the album cover
  const file = event.target.files[0]; // Get the selected file from the input
  if (!file) return; // If no file is selected, exit the function

  uiStore.showSnackbar({ text: 'Processing image...', color: 'info', timeout: 2000 }); // Show a snackbar notification to inform the user that the image is being processed

  try { // Attempt to compress the image if it exceeds a certain size
    let finalFile = file; // Start with the original file

    if (file.size > 500 * 1024 && file.type.startsWith('image/')) { // Check if the file is an image and exceeds 500 KB
      console.log(`Compressing new album cover ${file.name}...`); // Log the file name being compressed
      const options = { // Define options for image compression
        maxSizeMB: 0.5, // Maximum size in MB
        maxWidthOrHeight: 1920, // Maximum width or height in pixels
        useWebWorker: true, // Use a web worker for compression
      };
      const compressedBlob = await imageCompression(file, options); // Compress the image using the specified options
      finalFile = new File([compressedBlob], file.name, { type: compressedBlob.type }); // Create a new File object from the compressed Blob
      console.log(`Compressed cover to ${(finalFile.size / 1024).toFixed(2)} KB`); // Log the size of the compressed file
    }

    const formData = new FormData(); // Create a FormData object to send the file
    formData.append('cover_image', finalFile); // Append the compressed file to the FormData object

    await albumStore.updateAlbumCover(albumStore.currentAlbum.id, formData); // Call the store action to update the album cover with the FormData
    uiStore.showSnackbar({ text: 'Album cover updated!', color: 'success' }); // Show a success notification to the user

  } catch (err) { // Handle any errors that occur during the file upload or compression
    const errorMsg = err.response?.data?.msg || 'Failed to update cover.'; // Extract the error message from the response or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error notification to the user
  } finally { // Reset the file input to allow re-uploading the same file
      if(fileInput.value) { // Check if the file input reference exists
          fileInput.value.value = ''; // Reset the file input value to allow re-uploading the same file
      }
  }
};

const viewMemory = (memoryId) => { // Function to navigate to a specific memory view
  router.push(`/memory/${memoryId}`); // Navigate to the memory view using the provided memory ID
};

const confirmDeleteAlbum = async () => { // Function to handle the confirmation of album deletion
  isDeleting.value = true; // Set the deleting flag to true to indicate that the deletion process has started
  try { // Attempt to delete the album using the store action
    await albumStore.deleteAlbum(albumStore.currentAlbum.id); // Call the store action to delete the album using its ID
    uiStore.showSnackbar({ text: 'Album deleted successfully.', color: 'success' }); // Show a success notification to the user
    router.push('/dashboard'); // Navigate back to the dashboard after successful deletion
  } catch (err) { // Handle any errors that occur during the deletion process
    const errorMsg = err.response?.data?.msg || 'Failed to delete album.'; // Extract the error message from the response or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error notification to the user
  } finally { // Reset the deleting flag and close the delete dialog
    isDeleting.value = false; // Set the deleting flag back to false to indicate that the deletion process has completed
    deleteDialog.value = false; // Close the delete confirmation dialog
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Get the API base URL from environment variables

const coverImageUrl = computed(() => { // Computed property to generate the full URL for the album cover image
  if (albumStore.currentAlbum && albumStore.currentAlbum.cover_image_url) { // Check if the current album and its cover image URL exist
    return new URL(albumStore.currentAlbum.cover_image_url, API_BASE_URL).href; // Construct the full URL for the cover image using the API base URL
  }
  return null; // Return null if the album or cover image URL does not exist
});

onMounted(() => { // Lifecycle hook to fetch album details when the component is mounted
  const albumId = route.params.id; // Get the album ID from the route parameters
  albumStore.fetchAlbumDetails(albumId); // Call the store action to fetch the album details using the album ID
});
</script>
