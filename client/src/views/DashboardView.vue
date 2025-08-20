<!-- This Vue component is the main Dashboard page that a user sees after logging in.
 Its primary purpose is to fetch and display a grid of the user's albums. It is "smart"
 because it reactively filters which albums are shown based on the user's "unlocked" status
 for private content. It acts as a container, managing the visibility of the "Create Album"
 and "Unlock Private Albums" dialogs and delegating the actual display of each album to the
 reusable AlbumCard.vue childcomponent. -->
<template>
  <v-container>
    <!-- Keep the header outside the loading check so it's always visible -->
    <div class="d-flex justify-space-between align-center mb-4">
      <h1>My Albums</h1>
      <!-- We move the buttons inside the loaded content area -->
    </div>

    <!-- Loading Indicator -->
    <div v-if="albumStore.loading" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-else>
      <!-- Put the buttons here so they only render when albums are loaded -->
      <div class="d-flex justify-end mb-4">
        <v-btn
          v-if="!authStore.isPrivateModeUnlocked && hasPrivateAlbums"
          @click="unlockDialog = true"
          color="orange"
          class="mr-2"
          prepend-icon="mdi-lock"
        >
          Unlock Private
        </v-btn>
        <v-btn color="primary" @click="createDialog = true">Create Album</v-btn>
      </div>

      <!-- Album Grid -->
      <v-row v-if="filteredAlbums.length > 0">
        <v-col v-for="album in filteredAlbums" :key="album.id" cols="12" sm="6" md="4">
          <AlbumCard :album="album" @selectAlbum="viewAlbum" />
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else class="text-center mt-10">
        <v-col>
          <h2>No Albums Yet</h2>
          <p>Start your Qrono journey by creating your first album.</p>
          <!-- No need for the create button, it's at the top -->
        </v-col>
      </v-row>
    </div>

    <CreateAlbumDialog v-model="createDialog" @close="createDialog = false" />
    <UnlockPrivateModal v-model="unlockDialog" @close="unlockDialog = false" />

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'; // Import necessary Vue and Pinia functions
import { useRouter } from 'vue-router'; // Import the Vue Router for navigation
import { useAlbumStore } from '@/stores/albums'; // Import the Pinia store for albums
import { useAuthStore } from '@/stores/auth'; // Import the Pinia store for authentication
import AlbumCard from '@/components/AlbumCard.vue'; // Import the AlbumCard component to display individual albums
import CreateAlbumDialog from '@/components/CreateAlbumDialog.vue'; // Import the dialog component for creating new albums
import UnlockPrivateModal from '@/components/UnlockPrivateModal.vue'; // Import the modal component for unlocking private albums

const createDialog = ref(false); // Dialog state for creating a new album
const unlockDialog = ref(false); // Dialog state for unlocking private albums

const albumStore = useAlbumStore(); // Access the album store to manage albums
const authStore = useAuthStore(); // Access the auth store to manage authentication state
const router = useRouter(); // Access the Vue Router for navigation

onMounted(() => { // Lifecycle hook to fetch albums when the component is mounted
  albumStore.fetchAlbums(); // Call the store action to fetch the list of albums
});

const filteredAlbums = computed(() => { // Computed property to filter albums based on the user's private mode status
  if (authStore.isPrivateModeUnlocked) { // If private mode is unlocked, show all albums
    return albumStore.albums; // Return all albums from the store
  }
  return albumStore.albums.filter(album => Boolean(album.visible)); // If private mode is locked, filter albums to show only those that are visible
});

const hasPrivateAlbums = computed(() => { // Computed property to check if there are any private albums
  // This will now only be calculated on a populated array
  return albumStore.albums.some(album => !Boolean(album.visible)); // Check if any album is not visible (i.e., private)
});

const viewAlbum = (albumId) => { // Function to navigate to a specific album view
  router.push(`/album/${albumId}`); // Navigate to the album view using the provided album ID
};
</script>
