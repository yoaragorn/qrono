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
import { ref, reactive, watch } from 'vue';
import imageCompression from 'browser-image-compression';
import { useAlbumStore } from '@/stores/albums';
import { useUiStore } from '@/stores/ui';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const albumStore = useAlbumStore();
const uiStore = useUiStore();
const form = ref(null);
const loading = ref(false);
const isCompressing = ref(false);
const nativeFileInput = ref(null);
const selectedCoverFile = ref(null);

// Album data is a reactive object, with 'visible' defaulting to true.
const album = reactive({
  title: '',
  description: '',
  visible: true,
});

const closeDialog = () => {
  emit('update:modelValue', false);
};

const triggerNativeFileInput = () => {
  nativeFileInput.value.click();
};

const onFileSelect = (event) => {
  const file = event.target.files[0];
  selectedCoverFile.value = file || null;
};

const clearFile = () => {
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

const saveAlbum = async () => {
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;

  const formData = new FormData();
  formData.append('title', album.title);
  formData.append('description', album.description);
  formData.append('visible', String(album.visible));

  try {
    let finalFile = selectedCoverFile.value;

    // Compress the file if it exists and is larger than 500KB
    if (finalFile && finalFile.size > 500 * 1024 && finalFile.type.startsWith('image/')) {
      isCompressing.value = true;
      console.log(`Compressing album cover ${finalFile.name}...`);
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(finalFile, options);
      // Create a new File object to retain the original filename
      finalFile = new File([compressedBlob], finalFile.name, { type: compressedBlob.type });
      console.log(`Compressed cover to ${(finalFile.size / 1024).toFixed(2)} KB`);
    }

    isCompressing.value = false;

    // Append the final file (either original or compressed) to the FormData
    if (finalFile) {
      formData.append('cover_image', finalFile);
    }

    await albumStore.createAlbum(formData);
    uiStore.showSnackbar({ text: 'Album created successfully!', color: 'success' });
    closeDialog();

  } catch (err) {
    isCompressing.value = false;
    const errorMsg = err.response?.data?.msg || "Failed to create album.";
    uiStore.showSnackbar({ text: errorMsg, color: 'error' });
  } finally {
    isCompressing.value = false;
    loading.value = false;
  }
};
</script>
