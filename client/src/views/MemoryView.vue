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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { marked } from 'marked';
import { useRoute, useRouter } from 'vue-router';
import { useAlbumStore } from '@/stores/albums';
import CreateMemoryDialog from '@/components/CreateMemoryDialog.vue';

const route = useRoute();
const router = useRouter();
const albumStore = useAlbumStore();

const editDialog = ref(false);
const showArrows = ref(true);
let arrowTimer = null;

const memory = computed(() => albumStore.currentMemory);

const renderedMarkdown = computed(() => {
  if (memory.value && memory.value.diary_entry) {
    return marked(memory.value.diary_entry);
  }
  return '<p><em>No diary entry was written for this memory.</em></p>';
});

const openEditDialog = () => {
  editDialog.value = true;
};

const fetchLatestMemoryData = () => {
  albumStore.fetchMemoryDetails(route.params.id);
};

const goBack = () => {
  if (memory.value && memory.value.album_id) {
    router.push(`/album/${memory.value.album_id}`);
  } else {
    router.push('/dashboard');
  }
};

const handleMouseOver = () => {
  clearTimeout(arrowTimer);
  showArrows.value = true;
};

const handleMouseLeave = () => {
  arrowTimer = setTimeout(() => {
    showArrows.value = false;
  }, 250);
};

onMounted(() => {
  handleMouseLeave(); // Start the initial timer to hide arrows
  fetchLatestMemoryData();
});

onUnmounted(() => {
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
