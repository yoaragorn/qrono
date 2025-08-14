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
          <!-- No need for the create button here anymore, it's at the top -->
        </v-col>
      </v-row>
    </div>
    <!-- ----------------------------------------------------------------- -->

    <CreateAlbumDialog v-model="createDialog" @close="createDialog = false" />
    <UnlockPrivateModal v-model="unlockDialog" @close="unlockDialog = false" />

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'; // Change back to onMounted
import { useRouter } from 'vue-router';
import { useAlbumStore } from '@/stores/albums';
import { useAuthStore } from '@/stores/auth';
import AlbumCard from '@/components/AlbumCard.vue';
import CreateAlbumDialog from '@/components/CreateAlbumDialog.vue';
import UnlockPrivateModal from '@/components/UnlockPrivateModal.vue';

const createDialog = ref(false);
const unlockDialog = ref(false);

const albumStore = useAlbumStore();
const authStore = useAuthStore();
const router = useRouter();

// We are back to using onMounted because Suspense was causing other issues.
// This v-if="!albumStore.loading" pattern is more direct and easier to debug.
onMounted(() => {
  albumStore.fetchAlbums();
});

const filteredAlbums = computed(() => {
  if (authStore.isPrivateModeUnlocked) {
    return albumStore.albums;
  }
  return albumStore.albums.filter(album => Boolean(album.visible));
});

const hasPrivateAlbums = computed(() => {
  // This will now only be calculated on a populated array
  return albumStore.albums.some(album => !Boolean(album.visible));
});

const viewAlbum = (albumId) => {
  router.push(`/album/${albumId}`);
};
</script>
