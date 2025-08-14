// stores/ui.js
import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    snackbar: {
      visible: false,
      text: '',
      color: 'info',
      timeout: 3000,
    },
  }),
  actions: {
    showSnackbar({ text, color = 'success', timeout = 3000 }) {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.timeout = timeout;
      this.snackbar.visible = true;
    },
  },
});
