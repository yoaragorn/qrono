// This Pinia store's sole purpose is to manage the state of global User Interface (UI) elements
// that are not tied to a specific feature's data. In this project, it is used exclusively to
// control a single, application-wide snackbar (a pop-up notification). By centralizing this logic,
// any component or other store in the application can easily trigger a consistent,
// styled notification without needing to contain any of the snackbar's presentation logic itself.

import { defineStore } from 'pinia'; // Import Pinia for state management

export const useUiStore = defineStore('ui', { // Define a new Pinia store named 'ui'
  state: () => ({ // Initial state of the store
    snackbar: { // State for the snackbar notification
      visible: false, // Whether the snackbar is currently visible
      text: '', // The text to display in the snackbar
      color: 'info', // The color of the snackbar, defaulting to 'info'
      timeout: 3000, // Duration in milliseconds before the snackbar automatically hides
    },
  }),
  actions: { // Define actions to modify the state
    showSnackbar({ text, color = 'success', timeout = 3000 }) { // Show the snackbar with specified text, color, and timeout
      this.snackbar.text = text; // Set the text to display in the snackbar
      this.snackbar.color = color; // Set the color of the snackbar
      this.snackbar.timeout = timeout; // Set the duration before the snackbar hides
      this.snackbar.visible = true; // Make the snackbar visible
    },
  },
});
