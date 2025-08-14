// stores/albums.js
import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAlbumStore = defineStore('albums', {
  state: () => ({
    albums: [],
    currentAlbum: null,
    memories: [],
    loading: false,
    currentMemory: null,
  }),

  actions: {
    async fetchAlbums() {
      this.loading = true;
      try {
        const response = await api.get('/api/albums');
        this.albums = response.data;
      } catch (error) {
        console.error('Failed to fetch albums:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchAlbumDetails(albumId) {
      this.loading = true;
      this.currentAlbum = null; // Clear old data
      this.memories = [];
      try {
        // Fetch both album details and its memories in parallel
        const [albumRes, memoriesRes] = await Promise.all([
          api.get(`/api/albums/${albumId}`),
          api.get(`/api/albums/${albumId}/memories`)
        ]);
        this.currentAlbum = albumRes.data;
        this.memories = memoriesRes.data;
      } catch (error) {
        console.error(`Failed to fetch details for album ${albumId}:`, error);
      } finally {
        this.loading = false;
      }
    },

    async createAlbum(albumFormData) {
      try {
        // This part is critical and should be exactly like this.
        const response = await api.post('/api/albums', albumFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        this.albums.unshift(response.data);
      } catch (error) {
        console.error('Failed to create album:', error);
        throw error;
      }
    },

    async createMemory(memoryFormData) {
      try {
        await api.post('/api/memories', memoryFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      } catch (error) {
        console.error('Failed to create memory:', error);
        throw error;
      }
    },

    async fetchMemoryDetails(memoryId) {
      this.loading = true;
      this.currentMemory = null; // Clear old data
      try {
        const response = await api.get(`/api/memories/${memoryId}`);
        this.currentMemory = response.data;
      } catch (error) {
        console.error(`Failed to fetch memory ${memoryId}:`, error);
      } finally {
        this.loading = false;
      }
    },

    async deleteMemory(memoryId) {
      try {
        await api.delete(`/api/memories/${memoryId}`);

        // To update the UI, we remove the deleted memory from our local state.
        // This is more efficient than re-fetching all memories from the server.
        this.memories = this.memories.filter(memory => memory.id !== memoryId);

      } catch (error) {
        console.error(`Failed to delete memory ${memoryId}:`, error);
        throw error; // Re-throw so the component can show a notification
      }
    },

    async deleteAlbum(albumId) {
      try {
        await api.delete(`/api/albums/${albumId}`);
        // Update the UI by removing the album from the local state array.
        this.albums = this.albums.filter(album => album.id !== albumId);
      } catch (error) {
        console.error(`Failed to delete album ${albumId}:`, error);
        throw error; // Re-throw for the component to handle
      }
    },

    async updateMemory(memoryId, memoryFormData) {
      try {
        const response = await api.put(`/api/memories/${memoryId}`, memoryFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Update the local state with the returned fresh data
        this.currentMemory = response.data;
        // Also, update the memory in the main list for when the user navigates back
        const index = this.memories.findIndex(m => m.id === memoryId);
        if (index !== -1) {
          this.memories[index] = response.data;
        }
      } catch (error) {
        console.error(`Failed to update memory ${memoryId}:`, error);
        throw error;
      }
    },

    async updateAlbumCover(albumId, formData) {
        try {
            // The API now returns the updated album object.
            const response = await api.put(`/api/albums/${albumId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // We directly update our local state with the fresh data from the server.
            // This is much more efficient than re-fetching everything.
            this.currentAlbum = response.data;
            // -----------------------
        } catch (error) {
            console.error('Failed to update album cover:', error);
            throw error;
        }
    },

  },
});
