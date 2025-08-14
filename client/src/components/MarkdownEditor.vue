<template>
  <div>
    <textarea ref="editorEl"></textarea>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css'; // Import the styles

// Define props and emits to make this component work with v-model
const props = defineProps({
  modelValue: String, // This will hold the markdown text
});
const emit = defineEmits(['update:modelValue']);

const editorEl = ref(null); // A ref to hold the <textarea> element
let easyMDEInstance = null; // A variable to hold the EasyMDE instance

onMounted(() => {
  if (editorEl.value) {
    // --- Initialize EasyMDE ---
    easyMDEInstance = new EasyMDE({
      element: editorEl.value,
      initialValue: props.modelValue || '',
      spellChecker: false, // Turn off spell checker for a cleaner look
      // --- Configure the toolbar to be simple ---
      toolbar: [
        'heading', 'bold', 'italic', '|',
        'unordered-list', '|',
        'link', 'image', '|',
        'preview'
      ],
      // Make it a bit smaller and less intrusive
      minHeight: "150px",
      maxHeight: "150px",
    });

    // --- Sync the editor's content back to the parent ---
    easyMDEInstance.codemirror.on('change', () => {
      emit('update:modelValue', easyMDEInstance.value());
    });
  }
});

// Watch for programmatic changes from the parent component
watch(() => props.modelValue, (newValue) => {
  if (easyMDEInstance && newValue !== easyMDEInstance.value()) {
    easyMDEInstance.value(newValue);
  }
});

// Clean up the instance when the component is destroyed to prevent memory leaks
onUnmounted(() => {
  if (easyMDEInstance) {
    easyMDEInstance.toTextArea();
    easyMDEInstance = null;
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
