<template>
  <v-dialog :model-value="modelValue" persistent max-width="700px">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ isEditing ? 'Edit Memory' : 'Add a New Memory' }}</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-form ref="form" @submit.prevent="saveMemory">
            <v-text-field
              v-model="title"
              label="Memory Title*"
              :rules="[v => !!v || 'Title is required']"
              required
            ></v-text-field>

            <label class="v-label mb-2">Diary Entry</label>
            <MarkdownEditor v-model="diary_entry" />

            <!-- Display Existing Photos When Editing -->
            <div v-if="isEditing && existingPhotos.length > 0" class="mt-4">
              <label class="v-label mb-2">Current Photos (click to remove)</label>
              <v-row dense>
                <v-col v-for="photo in existingPhotos" :key="photo.id" cols="auto">
                  <v-card class="position-relative" @click="markPhotoForDeletion(photo.id)">
                    <v-img :src="getImageUrl(photo.image_url)" width="100" height="100" cover>
                       <div class="d-flex fill-height align-center justify-center">
                          <v-icon color="white" size="x-large">mdi-close-circle-outline</v-icon>
                       </div>
                    </v-img>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <v-file-input
              v-model="newPhotos"
              :label="isEditing ? 'Upload More Photos' : 'Upload Photos'"
              multiple
              chips
              show-size
              prepend-icon="mdi-camera"
              accept="image/*"
              class="mt-4"
            ></v-file-input>
          </v-form>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="blue-darken-1"
          variant="text"
          @click="saveMemory"
          :loading="loading"
          :disabled="loading"
        >
          <span v-if="isCompressing">Compressing...</span>
          <span v-else>{{ isEditing ? 'Save Changes' : 'Save Memory' }}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import imageCompression from 'browser-image-compression';
import { useAlbumStore } from '@/stores/albums';
import { useUiStore } from '@/stores/ui';
import MarkdownEditor from './MarkdownEditor.vue';

const props = defineProps({
  modelValue: Boolean,
  albumId: { type: Number, required: true },
  memoryToEdit: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'memory-created']);

const albumStore = useAlbumStore();
const uiStore = useUiStore();
const form = ref(null);
const loading = ref(false);
const isCompressing = ref(false);

const isEditing = computed(() => !!props.memoryToEdit);

const title = ref('');
const diary_entry = ref('');
const newPhotos = ref([]);
const existingPhotos = ref([]);
const photosToDelete = ref(new Set());

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getImageUrl = (relativePath) => {
  if (!relativePath) return '';
  return `${API_BASE_URL}/${relativePath.replace(/\\/g, '/')}`;
};

const closeDialog = () => {
  emit('update:modelValue', false);
};

const markPhotoForDeletion = (photoId) => {
  if (photosToDelete.value.has(photoId)) {
    photosToDelete.value.delete(photoId); // This would be for an "undo" feature
  } else {
    photosToDelete.value.add(photoId);
  }
  // Visually remove it from the list by filtering
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== photoId);
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    if (isEditing.value) {
      title.value = props.memoryToEdit.title;
      diary_entry.value = props.memoryToEdit.diary_entry;
      existingPhotos.value = [...props.memoryToEdit.photos];
      photosToDelete.value.clear();
    } else {
      title.value = '';
      diary_entry.value = '';
      existingPhotos.value = [];
      photosToDelete.value.clear();
    }
    newPhotos.value = [];
    form.value?.resetValidation();
  }
});

const saveMemory = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  isCompressing.value = true;

  const formData = new FormData();
  formData.append('title', title.value);
  formData.append('diary_entry', diary_entry.value);

  try {
    const compressedPhotos = await processFiles(newPhotos.value);

    if (compressedPhotos.length > 0) {
      compressedPhotos.forEach(photoFile => {
        formData.append('photos', photoFile);
      });
    }

    isCompressing.value = false;

    if (isEditing.value) {
      formData.append('photosToDelete', JSON.stringify(Array.from(photosToDelete.value)));
      await albumStore.updateMemory(props.memoryToEdit.id, formData);
      uiStore.showSnackbar({ text: 'Memory updated successfully!', color: 'success' });
    } else {
      formData.append('album_id', props.albumId);
      await albumStore.createMemory(formData);
      uiStore.showSnackbar({ text: 'Memory created successfully!', color: 'success' });
    }

    closeDialog();
    emit('memory-created');

  } catch (err) {
    isCompressing.value = false;
    const errorMsg = err.response?.data?.msg || "An error occurred while saving.";
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
    isCompressing.value = false;
    loading.value = false;
  }
};

const processFiles = async (files) => {
  const compressionOptions = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  const compressedFiles = [];
  for (const file of files) {
    if (file.size > 500 * 1024 && file.type.startsWith('image/')) {
      try {
        console.log(`Compressing ${file.name}...`);
        const compressedFile = await imageCompression(file, compressionOptions);
        console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(2)} KB to ${(compressedFile.size / 1024).toFixed(2)} KB`);
        // Create a new File object to retain the original filename
        compressedFiles.push(new File([compressedFile], file.name, { type: compressedFile.type }));
      } catch (error) {
        console.error("Compression failed for file:", file.name, error);
        compressedFiles.push(file); // Fallback to original
      }
    } else {
      compressedFiles.push(file); // Add small files or non-images directly
    }
  }
  return compressedFiles;
};
</script>

<style scoped>
.position-relative {
  position: relative;
}
.top-0 {
  top: 0;
}
.right-0 {
  right: 0;
}
/* Style for the delete overlay on existing photos */
.v-img .v-icon {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
}
.v-img:hover .v-icon {
  opacity: 1;
}
</style>
