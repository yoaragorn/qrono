<!-- This Vue component's sole purpose is to "wrap" the external EasyMDE Markdown editor library,
 making it behave like a native Vue component. It creates a simple <textarea>, and then uses
 Vue's lifecycle hooks (onMounted, onUnmounted) to attach and configure the powerful EasyMDE
 editor onto that textarea. It is designed to be fully compatible with Vue's v-model directive,
 allowing it to be easily used in any form throughout the Qrono application. -->

<template>
  <div>
    <textarea ref="editorEl"></textarea>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'; // Import Vue's Composition API for lifecycle management and reactivity
import EasyMDE from 'easymde'; // Import the EasyMDE library for Markdown editing
import 'easymde/dist/easymde.min.css'; // Import the EasyMDE CSS for styling the editor

// Define props and emits to make this component work with v-model
const props = defineProps({ // Define the props that this component accepts
  modelValue: String, // This will hold the markdown text
});
const emit = defineEmits(['update:modelValue']); // Define the event that will be emitted to update the parent component's modelValue

const editorEl = ref(null); // A ref to hold the <textarea> element
let easyMDEInstance = null; // A variable to hold the EasyMDE instance

onMounted(() => { // Lifecycle hook that runs when the component is mounted
  if (editorEl.value) { // Check if the textarea element is available
    // --- Initialize EasyMDE ---
    easyMDEInstance = new EasyMDE({ // Create a new instance of EasyMDE
      element: editorEl.value, // Attach it to the textarea element
      initialValue: props.modelValue || '', // Set the initial value from the parent component's modelValue prop
      spellChecker: false, // Turn off spell checker for a cleaner look
      // --- Configure the toolbar to be simple ---
      toolbar: [ // Define the toolbar buttons
        'heading', 'bold', 'italic', '|', // Basic text formatting options
        'unordered-list', '|', // Unordered list button
        'link', 'image', '|', // Link and image buttons
        'preview' // Preview button to toggle Markdown preview mode
      ],
      // Make it a bit smaller and less intrusive
      minHeight: "150px", // Set the minimum height of the editor
      maxHeight: "150px", // Set the maximum height of the editor
    });

    // --- Sync the editor's content back to the parent ---
    easyMDEInstance.codemirror.on('change', () => { // Listen for changes in the editor
      emit('update:modelValue', easyMDEInstance.value()); // Emit the updated value to the parent component
    });
  }
});

// Watch for programmatic changes from the parent component
watch(() => props.modelValue, (newValue) => { // Watch for changes in the modelValue prop
  if (easyMDEInstance && newValue !== easyMDEInstance.value()) { // Check if the EasyMDE instance exists and the new value is different from the current value
    easyMDEInstance.value(newValue); // Update the EasyMDE editor with the new value
  }
});

// Clean up the instance when the component is destroyed to prevent memory leaks
onUnmounted(() => { // Lifecycle hook that runs when the component is unmounted
  if (easyMDEInstance) { // Check if the EasyMDE instance exists
    easyMDEInstance.toTextArea(); // Convert the EasyMDE instance back to a textarea
    easyMDEInstance = null; // Clear the EasyMDE instance to free up memory
  }
});
</script>

<style>
/* Some optional global overrides to make EasyMDE fit Vuetify's theme better */
.editor-toolbar {
  background-color: #f5f5f5;
  border-radius: 4px 4px 0 0 !important;
  border-color: #e0e0e0 !important;
}
.CodeMirror {
  border-radius: 0 0 4px 4px !important;
  border-color: #e0e0e0 !important;
}
</style>
