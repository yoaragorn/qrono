<!-- This Vue component is a page-level View responsible for displaying a single,
 complete "memory." It reads the memory's ID from the URL, fetches its full data
 (including title, text, and all associated photos) from the API via the Pinia store,
 and then renders it. The page is designed for a rich viewing experience, featuring
 a photo carousel with interactive elements and a beautifully formatted diary entry.
 It also serves as the entry point for editing that specific memory. -->

<template>
  <v-container>
    <!-- Top-level check for the loading state -->
    <div v-if="albumStore.loading" class="text-center fill-height d-flex align-center justify-center">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <!-- This block only renders after loading is finished -->
    <div v-else>
      <!-- Nested check to see if a memory was actually found -->
      <div v-if="memory">
        <!-- Back Button -->
        <v-btn
          variant="text"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
          class="mb-4"
        >
          Back to Album
        </v-btn>

        <div class="d-flex justify-space-between align-center">
          <h1 class="text-h4 mb-2">{{ memory.title }}</h1>
          <v-btn icon="mdi-pencil" variant="text" @click="openEditDialog"></v-btn>
        </div>
        <p class="text-subtitle-1 grey--text mb-6">
          Created on {{ new Date(memory.created_at).toLocaleString() }}
        </p>

        <!-- Image Carousel -->
        <v-carousel
          v-if="memory.photos && memory.photos.length > 0"
          :show-arrows="showArrows"
          @mouseover="handleMouseOver"
          @mouseleave="handleMouseLeave"
          hide-delimiters
          :height="'auto'"
          class="mb-6"
        >
          <v-carousel-item v-for="photo in memory.photos" :key="photo.id">
            <v-img
              :src="photo.image_url"
              :alt="memory.title"
              class="rounded-lg"
              contain
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular indeterminate color="grey-lighten-4"></v-progress-circular>
                </div>
              </template>
            </v-img>
          </v-carousel-item>
        </v-carousel>

        <!-- Markdown Diary Entry -->
        <v-card variant="tonal">
          <v-card-text>
            <div v-html="renderedMarkdown" class="markdown-content"></div>
          </v-card-text>
        </v-card>
      </div>

      <!-- This renders only if loading is false AND no memory was found -->
      <div v-else class="text-center mt-10">
        <h2>Memory Not Found</h2>
        <p>The memory you are looking for does not exist or you do not have permission to view it.</p>
        <v-btn to="/dashboard">Go to Dashboard</v-btn>
      </div>
    </div>

    <!-- The dialog for editing the memory -->
    <CreateMemoryDialog
      v-if="memory"
      v-model="editDialog"
      :album-id="memory.album_id"
      :memory-to-edit="memory"
      @memory-created="fetchLatestMemoryData"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'; // Import Vue's reactive ref function and lifecycle hooks
import { marked } from 'marked'; // Import the marked library to render Markdown content
import { useRoute, useRouter } from 'vue-router'; // Import Vue Router to access route parameters and navigation
import { useAlbumStore } from '@/stores/albums'; // Import the Pinia store for managing album data
import CreateMemoryDialog from '@/components/CreateMemoryDialog.vue'; // Import the dialog component for creating or editing memories

const route = useRoute(); // Access the current route to get the memory ID from the URL
const router = useRouter(); // Access the router to navigate back to the album or dashboard
const albumStore = useAlbumStore(); // Access the album store to fetch memory details and manage state

const editDialog = ref(false); // Reactive reference to control the visibility of the edit dialog
const showArrows = ref(true); // Reactive reference to control the visibility of carousel arrows
let arrowTimer = null; // Timer to hide arrows after a period of inactivity

const memory = computed(() => albumStore.currentMemory); // Computed property to access the current memory from the store

const renderedMarkdown = computed(() => { // Computed property to render the Markdown diary entry
  if (memory.value && memory.value.diary_entry) { // Check if the memory and diary entry exist
    return marked(memory.value.diary_entry); // Use marked to convert Markdown to HTML
  }
  return '<p><em>No diary entry was written for this memory.</em></p>'; // Fallback message if no diary entry exists
});

const openEditDialog = () => { // Function to open the edit dialog for the current memory
  editDialog.value = true; // Set the dialog visibility to true
};

const fetchLatestMemoryData = () => { // Function to fetch the latest memory data from the store
  albumStore.fetchMemoryDetails(route.params.id); // Call the store action to fetch memory details using the ID from the route parameters
};

const goBack = () => { // Function to navigate back to the album or dashboard
  if (memory.value && memory.value.album_id) { // Check if the memory has an associated album
    router.push(`/album/${memory.value.album_id}`); // Navigate to the album page using its ID
  } else { // If no album ID is found, navigate to the dashboard
    router.push('/dashboard'); // Navigate to the dashboard if no album ID is available
  }
};

const handleMouseOver = () => { // Function to handle mouse over events on the carousel
  clearTimeout(arrowTimer); // Clear any existing timer to prevent hiding arrows
  showArrows.value = true; /
};

const handleMouseLeave = () => { // Function to handle mouse leave events on the carousel
  arrowTimer = setTimeout(() => { // Set a timer to hide arrows after 2 seconds of inactivity
    showArrows.value = false; // Hide the arrows...
  }, 2000); // ... after 2 seconds of inactivity
};

onMounted(() => { // Lifecycle hook to fetch memory data when the component is mounted
  handleMouseLeave(); // Start the initial timer to hide arrows
  fetchLatestMemoryData(); // Fetch the memory details using the ID from the route parameters
});

onUnmounted(() => { // Lifecycle hook to clean up when the component is unmounted
  // Clean up the timer when the user navigates away to prevent memory leaks
  clearTimeout(arrowTimer);
});
</script>

<style>
/* Basic styling for the rendered markdown content */
.markdown-content h1, .markdown-content h2, .markdown-content h3 {
  margin-top: 1em;
  margin-bottom: 0.5em;
}
.markdown-content p {
  line-height: 1.6;
}
.markdown-content blockquote {
  border-left: 4px solid #ccc;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
}
.markdown-content code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
}
.markdown-content ul, .markdown-content ol {
    padding-left: 2em;
}
</style>
