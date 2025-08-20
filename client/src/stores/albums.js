// This Pinia store is the single source of truth for all data related to albums and memories.
// Its primary role is to encapsulate all communication with the backend API for these resources.
// Vue components do not talk to the API directly; instead, they call actions in this store.
// The store makes the API call, updates its own internal state with the response, and because the state
// is reactive, all components using that state automatically update their UI.
// This creates a clean, predictable, and maintainable data flow for the application.

import { defineStore } from 'pinia'; // Import Pinia for state management
import api from '@/services/api'; // Import the API client we configured earlier

export const useAlbumStore = defineStore('albums', { // Define a new Pinia store named 'albums'
  state: () => ({ // Initial state of the store
    albums: [], // Array to hold all albums
    currentAlbum: null, // Currently viewed album details
    memories: [], // Memories associated with the current album
    loading: false, // Loading state for async operations
    currentMemory: null, // Currently viewed memory details
  }),

  actions: { // Define actions to modify the state
    async fetchAlbums() { // Fetch all albums from the API
      this.loading = true; // Set loading state to true
      try { // Make an API call to fetch albums
        const response = await api.get('/api/albums'); // Use the API client to get albums
        this.albums = response.data; // Store the fetched albums in the state
      } catch (error) { // Handle any errors that occur during the fetch
        console.error('Failed to fetch albums:', error); // Log the error for debugging
      } finally { // Ensure loading state is reset regardless of success or failure
        this.loading = false; // Set loading state to false
      }
    },

    async fetchAlbumDetails(albumId) { // Fetch details for a specific album
      this.loading = true; // Set loading state to true
      this.currentAlbum = null; // Clear old data
      this.memories = []; // Clear old memories
      try { // Make an API call to fetch album details
        // Fetch both album details and its memories in parallel
        const [albumRes, memoriesRes] = await Promise.all([
          api.get(`/api/albums/${albumId}`), // Get album details
          api.get(`/api/albums/${albumId}/memories`) // Get memories for the album
        ]);
        this.currentAlbum = albumRes.data; // Store the album details
        this.memories = memoriesRes.data; // Store the memories associated with the album
      } catch (error) { // Handle any errors that occur during the fetch
        console.error(`Failed to fetch details for album ${albumId}:`, error); // Log the error for debugging
      } finally { // Ensure loading state is reset regardless of success or failure
        this.loading = false; // Set loading state to false
      }
    },

    async createAlbum(albumFormData) { // Create a new album
      try { // Make an API call to create a new album
        const response = await api.post('/api/albums', albumFormData, { // Send form data
          headers: { // Set the content type for file uploads
            'Content-Type': 'multipart/form-data', // Use multipart/form-data for file uploads
          },
        });
        this.albums.unshift(response.data); // Add the newly created album to the beginning of the albums array
      } catch (error) { // Handle any errors that occur during the album creation
        console.error('Failed to create album:', error); // Log the error for debugging
        throw error; // Re-throw the error so the component can handle it
      }
    },

    async createMemory(memoryFormData) { // Create a new memory
      try { // Make an API call to create a new memory
        await api.post('/api/memories', memoryFormData, { // Send form data
          headers: { // Set the content type for file uploads
            'Content-Type': 'multipart/form-data', // Use multipart/form-data for file uploads
          },
        });

      } catch (error) { // Handle any errors that occur during the memory creation
        console.error('Failed to create memory:', error); // Log the error for debugging
        throw error; // Re-throw the error so the component can handle it
      }
    },

    async fetchMemoryDetails(memoryId) { // Fetch details for a specific memory
      this.loading = true; // Set loading state to true
      this.currentMemory = null; // Clear old data
      try { // Make an API call to fetch memory details
        const response = await api.get(`/api/memories/${memoryId}`); // Get memory details
        this.currentMemory = response.data; // Store the fetched memory details
      } catch (error) { // Handle any errors that occur during the fetch
        console.error(`Failed to fetch memory ${memoryId}:`, error); // Log the error for debugging
      } finally { // Ensure loading state is reset regardless of success or failure
        this.loading = false; // Set loading state to false
      }
    },

    async deleteMemory(memoryId) {
      try {
        await api.delete(`/api/memories/${memoryId}`); // Make an API call to delete the memory

        // To update the UI, we remove the deleted memory from our local state.
        // This is more efficient than re-fetching all memories from the server.
        this.memories = this.memories.filter(memory => memory.id !== memoryId); // Filter out the deleted memory

      } catch (error) { // Handle any errors that occur during the deletion
        console.error(`Failed to delete memory ${memoryId}:`, error); // Log the error for debugging
        throw error; // Re-throw so the component can show a notification
      }
    },

    async deleteAlbum(albumId) { // Delete a specific album
      try { // Make an API call to delete the album
        await api.delete(`/api/albums/${albumId}`); // Delete the album by ID
        // Update the UI by removing the album from the local state array.
        this.albums = this.albums.filter(album => album.id !== albumId); // Filter out the deleted album
      } catch (error) { // Handle any errors that occur during the deletion
        console.error(`Failed to delete album ${albumId}:`, error); // Log the error for debugging
        throw error; // Re-throw for the component to handle
      }
    },

    async updateMemory(memoryId, memoryFormData) { // Update an existing memory
      try { // Make an API call to update the memory
        const response = await api.put(`/api/memories/${memoryId}`, memoryFormData, { // Send form data
          headers: { 'Content-Type': 'multipart/form-data' }, // Use multipart/form-data for file uploads
        });
        this.currentMemory = response.data; // Store the updated memory details
        const index = this.memories.findIndex(m => m.id === memoryId); // Find the index of the updated memory
        if (index !== -1) { // If the memory exists in the local state
          this.memories[index] = response.data; // Update the memory in the local state
        }
      } catch (error) { // Handle any errors that occur during the update
        console.error(`Failed to update memory ${memoryId}:`, error); // Log the error for debugging
        throw error; // Re-throw the error so the component can handle it
      }
    },

    async updateAlbumCover(albumId, formData) { // Update the cover image of an album
        try { // Make an API call to update the album cover
            // The API now returns the updated album object.
            const response = await api.put(`/api/albums/${albumId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // We directly update our local state with the fresh data from the server.
            // This is much more efficient than re-fetching everything.
            this.currentAlbum = response.data; // Update the current album with the new data
            // -----------------------
        } catch (error) { // Handle any errors that occur during the update
            console.error('Failed to update album cover:', error); // Log the error for debugging
            throw error; // Re-throw the error so the component can handle it
        }
    },

  },
});
