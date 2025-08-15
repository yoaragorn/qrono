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
import { ref, onMounted, computed } from 'vue';
import imageCompression from 'browser-image-compression';
import { useRoute, useRouter } from 'vue-router';
import { useAlbumStore } from '@/stores/albums';
import { useUiStore } from '@/stores/ui';
import MemoryCard from '@/components/MemoryCard.vue';
import CreateMemoryDialog from '@/components/CreateMemoryDialog.vue';

const route = useRoute();
const router = useRouter();
const albumStore = useAlbumStore();
const uiStore = useUiStore();

const fileInput = ref(null);
const deleteDialog = ref(false);
const isDeleting = ref(false);
const createMemoryDialog = ref(false);

const triggerFileInput = () => {
  fileInput.value.click();
};

const onFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uiStore.showSnackbar({ text: 'Processing image...', color: 'info', timeout: 2000 });

  try {
    let finalFile = file;

    if (file.size > 500 * 1024 && file.type.startsWith('image/')) {
      console.log(`Compressing new album cover ${file.name}...`);
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(file, options);
      finalFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
      console.log(`Compressed cover to ${(finalFile.size / 1024).toFixed(2)} KB`);
    }

    const formData = new FormData();
    formData.append('cover_image', finalFile);

    await albumStore.updateAlbumCover(albumStore.currentAlbum.id, formData);
    uiStore.showSnackbar({ text: 'Album cover updated!', color: 'success' });

  } catch (err) {
    const errorMsg = err.response?.data?.msg || 'Failed to update cover.';
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
      if(fileInput.value) {
          fileInput.value.value = '';
      }
  }
};

const viewMemory = (memoryId) => {
  router.push(`/memory/${memoryId}`);
};

const confirmDeleteAlbum = async () => {
  isDeleting.value = true;
  try {
    await albumStore.deleteAlbum(albumStore.currentAlbum.id);
    uiStore.showSnackbar({ text: 'Album deleted successfully.', color: 'success' });
    router.push('/dashboard');
  } catch (err) {
    const errorMsg = err.response?.data?.msg || 'Failed to delete album.';
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
    isDeleting.value = false;
    deleteDialog.value = false;
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const coverImageUrl = computed(() => {
  if (albumStore.currentAlbum && albumStore.currentAlbum.cover_image_url) {
    return new URL(albumStore.currentAlbum.cover_image_url, API_BASE_URL).href;
  }
  return null;
});

onMounted(() => {
  const albumId = route.params.id;
  albumStore.fetchAlbumDetails(albumId);
});
</script>
