<template>
  <v-container>
    <div v-if="albumStore.loading" class="text-center">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else-if="memory">
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
        hide-delimiters
        :height="'auto'"
        class="mb-6"

        :show-arrows="showArrows"

        @mouseover="handleMouseOver"
        @mouseleave="handleMouseLeave"
      >
        <v-carousel-item
          v-for="photo in memory.photos"
          :key="photo.id"
        >
          <!-- 2. Use v-img directly inside for more control -->
          <v-img
            :src="getImageUrl(photo.image_url)"
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

    <CreateMemoryDialog
      v-if="memory"
      v-model="editDialog"
      :album-id="memory.album_id"
      :memory-to-edit="memory"
      @memory-created="fetchLatestMemoryData"
    />

    <div v-else class="text-center mt-10">
      <h2>Memory Not Found</h2>
    </div>
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

const openEditDialog = () => {
  editDialog.value = true;
};

const fetchLatestMemoryData = () => {
  albumStore.fetchMemoryDetails(route.params.id);
};

const showArrows = ref(true); // Arrows are visible by default
let arrowTimer = null; // A variable to hold our setTimeout ID

const handleMouseOver = () => {
  // If there's a timer running to hide the arrows, cancel it.
  clearTimeout(arrowTimer);
  // Make sure the arrows are visible.
  showArrows.value = true;
};

const handleMouseLeave = () => {
  // Start a new timer. After 2000 milliseconds (2 seconds), hide the arrows.
  arrowTimer = setTimeout(() => {
    showArrows.value = false;
  }, 0);
};

onMounted(() => {
  // When the component first loads, start the timer to hide the arrows initially.
  handleMouseLeave();
  fetchLatestMemoryData();
});

onUnmounted(() => {
  clearTimeout(arrowTimer);
});

// Use a computed property for safety
const memory = computed(() => albumStore.currentMemory);

// This computed property will automatically render the markdown text to HTML
const renderedMarkdown = computed(() => {
  if (memory.value && memory.value.diary_entry) {
    return marked(memory.value.diary_entry);
  }
  return '<p><em>No diary entry was written for this memory.</em></p>';
});

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getImageUrl = (relativePath) => {
  if (!relativePath) return '';
  // Use the same robust URL constructor here.
  return new URL(relativePath, API_BASE_URL).href;
};

const goBack = () => {
  if (memory.value && memory.value.album_id) {
    router.push(`/album/${memory.value.album_id}`);
  } else {
    router.push('/dashboard');
  }
};

onMounted(() => {
  const memoryId = route.params.id;
  albumStore.fetchMemoryDetails(memoryId);
  fetchLatestMemoryData();
});
</script>

<style>
/* Add some basic styling for the rendered markdown */
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
</style>
