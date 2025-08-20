<!-- This file defines a highly dynamic and reusable modal for both creating new memories and editing existing ones.
 It's a "smart" component that adapts its appearance and behavior based on whether it's in "create" or "edit" mode.
 It handles complex form state, including text, a rich Markdown editor, and sophisticated photo management
 (displaying existing photos, deleting them, and adding new ones). Crucially, it also integrates advanced features
 like client-side validation for photo limits and automatic image compression for performance. -->

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
              <label class="v-label mb-2">Current Photos ({{ existingPhotos.length }}/10) - click to remove</label>
              <v-row dense>
                <v-col v-for="photo in existingPhotos" :key="photo.id" cols="auto">
                  <v-card class="position-relative" @click="markPhotoForDeletion(photo.id)">
                    <v-img :src="photo.image_url" width="100" height="100" cover>
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
              :label="photoInputLabel"
              :rules="photoRules"
              :disabled="isPhotoInputDisabled"
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
import { ref, watch, computed } from 'vue'; // Import Vue's reactive features
import imageCompression from 'browser-image-compression'; // Import image compression library for client-side image handling
import { useAlbumStore } from '@/stores/albums'; // Import the album store for managing album data
import { useUiStore } from '@/stores/ui'; // Import the UI store for managing UI-related state like notifications
import MarkdownEditor from './MarkdownEditor.vue'; // Import a custom Markdown editor component for rich text input

const props = defineProps({ // Define the props that this component expects
  modelValue: Boolean, // Controls the visibility of the dialog, allowing it to be used with v-model
  albumId: { type: Number, required: true }, // The ID of the album to which this memory belongs
  memoryToEdit: { type: Object, default: null }, // Optional memory object for editing an existing memory
});

const emit = defineEmits(['update:modelValue', 'memory-created']); // Define the events that this component can emit, including updating the dialog visibility and notifying when a memory is created

const albumStore = useAlbumStore(); // Get the album store instance for managing album-related actions
const uiStore = useUiStore(); // Get the UI store instance for managing UI-related state and notifications
const form = ref(null); // Reference to the form element for validation and submission handling
const loading = ref(false); // Loading state to show a spinner while the memory is being saved
const isCompressing = ref(false); //

const isEditing = computed(() => !!props.memoryToEdit); //

const title = ref('');  // Reactive reference for the memory title input
const diary_entry = ref(''); // Reactive reference for the diary entry input, which will be a rich Markdown editor
const newPhotos = ref([]); // Reactive reference for new photos to be uploaded, allowing multiple files
const existingPhotos = ref([]); // Reactive reference for existing photos when editing a memory, allowing display and management of previously uploaded images
const photosToDelete = ref(new Set()); // Reactive reference to track photos marked for deletion, using a Set for efficient management

const photoInputLabel = computed(() => { // Computed property to dynamically set the label for the photo input field
  if (isEditing.value) { // If we are editing an existing memory
    const remaining = 10 - existingPhotos.value.length; // Calculate how many more photos can be uploaded
    return remaining > 0 ? `Upload up to ${remaining} more photos` : 'Maximum photos reached'; // If the limit is reached, show a message indicating no more uploads are allowed
  }
  return 'Upload Photos (up to 10)'; // Default label for creating a new memory
});

const isPhotoInputDisabled = computed(() => { // Computed property to determine if the photo input should be disabled
  if (isEditing.value) { // If we are editing an existing memory
    return existingPhotos.value.length >= 10; // Disable the input if the existing photos already reach the maximum limit
  }
  return false; // Allow photo uploads when creating a new memory
});

const photoRules = computed(() => { // Computed property to define validation rules for the photo input
  return [ // Array of validation rules
    (value) => { // Rule to check if the input is empty
      const newPhotoCount = value.length; // Get the count of new photos being uploaded
      const existingPhotoCount = isEditing.value ? existingPhotos.value.length : 0; // Get the count of existing photos if editing
      const totalPhotos = newPhotoCount + existingPhotoCount; // Calculate the total number of photos (new + existing)

      if (totalPhotos > 10) { // If the total exceeds the maximum allowed
        return `You can have a maximum of 10 photos. You already have ${existingPhotoCount}, please select ${10 - existingPhotoCount} or fewer.`; // Return an error message indicating the limit
      }

      return true; // Return true if the validation passes
    },
  ];
});

const closeDialog = () => { // Function to close the dialog
  emit('update:modelValue', false); // Emit an event to update the parent component, closing the dialog
};

const markPhotoForDeletion = (photoId) => { // Function to mark a photo for deletion
  photosToDelete.value.add(photoId); // Add the photo ID to the set of photos to delete
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== photoId); // Remove the photo from the existing photos list
};

watch(() => props.modelValue, (isOpen) => { // Watcher to reset the form when the dialog opens or closes
  if (isOpen) { // If the dialog is opened
    if (isEditing.value) { // If we are editing an existing memory
      title.value = props.memoryToEdit.title; // Set the title from the memory being edited
      diary_entry.value = props.memoryToEdit.diary_entry; // Set the diary entry from the memory being edited
      existingPhotos.value = [...props.memoryToEdit.photos]; // Set the existing photos from the memory being edited
      photosToDelete.value.clear(); // Clear the set of photos to delete
    } else { // If we are creating a new memory
      title.value = ''; // Reset the title input
      diary_entry.value = ''; // Reset the diary entry input
      existingPhotos.value = []; // Reset the existing photos list
      photosToDelete.value.clear(); // Clear the set of photos to delete
    }
    newPhotos.value = []; // Reset the new photos input
    form.value?.resetValidation(); // Reset the form validation state
  }
});

const saveMemory = async () => { // Function to save the memory, either creating a new one or updating an existing one
  const { valid } = await form.value.validate(); // Validate the form inputs
  if (!valid) return; // If validation fails, exit the function

  loading.value = true; // Set loading state to true to indicate the save operation is in progress
  isCompressing.value = true; // Set compressing state to true to indicate image compression is happening

  const formData = new FormData(); // Create a new FormData object to prepare the data for submission
  formData.append('title', title.value); // Append the title input to the FormData
  formData.append('diary_entry', diary_entry.value); // Append the diary entry input to the FormData

  try { // Try block to handle the save operation
    const compressedPhotos = await processFiles(newPhotos.value); // Process and compress the new photos if necessary

    if (compressedPhotos.length > 0) { // If there are new photos to upload
      compressedPhotos.forEach(photoFile => { // Iterate over each compressed photo
        formData.append('photos', photoFile); // Append the compressed photo to the FormData
      });
    }

    isCompressing.value = false; // Set compressing state to false after processing photos

    if (isEditing.value) { // If we are editing an existing memory
      formData.append('photosToDelete', JSON.stringify(Array.from(photosToDelete.value))); // Append the IDs of photos to delete as a JSON string
      await albumStore.updateMemory(props.memoryToEdit.id, formData); // Call the album store's updateMemory method to save changes
      uiStore.showSnackbar({ text: 'Memory updated successfully!', color: 'success' }); // Show a success notification
    } else { // If we are creating a new memory
      formData.append('album_id', props.albumId); // Append the album ID to the FormData
      await albumStore.createMemory(formData); // Call the album store's createMemory method to save the new memory
      uiStore.showSnackbar({ text: 'Memory created successfully!', color: 'success' }); // Show a success notification
    }

    closeDialog(); // Close the dialog after successful save
    emit('memory-created'); // Emit an event to notify the parent component that a memory has been created or updated

  } catch (err) { // Catch block to handle any errors during the save operation
    isCompressing.value = false; // Reset the compressing state
    const errorMsg = err.response?.data?.msg || "An error occurred while saving."; // Extract the error message from the response, or use a default message
    uiStore.showSnackbar({ text: errorMsg, color: 'error' }); // Show an error notification with the error message
  } finally { // Finally block to reset states regardless of success or failure
    isCompressing.value = false; // Reset the compressing state
    loading.value = false; // Reset the loading state
  }
};

const processFiles = async (files) => { // Function to process and compress files before uploading
  const compressionOptions = { // Options for image compression
    maxSizeMB: 0.5, // Maximum size in MB after compression
    maxWidthOrHeight: 1920, // Maximum width or height of the image
    useWebWorker: true, // Use a web worker for compression to avoid blocking the UI
  };

  const compressedFiles = []; // Array to hold the processed and compressed files
  for (const file of files) { // Iterate over each file in the input array
    if (file.size > 500 * 1024 && file.type.startsWith('image/')) { // Check if the file is an image and larger than 500KB
      try { // Attempt to compress the image file
        console.log(`Compressing ${file.name}...`); // Log the start of compression
        const compressedFile = await imageCompression(file, compressionOptions); // Compress the image file using the specified options
        console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(2)} KB to ${(compressedFile.size / 1024).toFixed(2)} KB`); // Log the size reduction after compression
        compressedFiles.push(new File([compressedFile], file.name, { type: compressedFile.type })); // Create a new File object to retain the original filename and add it to the compressed files array
      } catch (err) { // Catch any errors that occur during compression
        console.error("Image compression failed, using original file instead. Error:", err); // Log the error message
        compressedFiles.push(file); // If compression fails, use the original file instead
      }
    } else { // If the file is not an image or is smaller than 500KB
      compressedFiles.push(file); // Add the original file to the compressed files array without compression
    }
  }
  return compressedFiles; // Return the array of processed and compressed files
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
