<!-- This Vue component defines a single, clickable "card" used to represent an album
 on the dashboard. It's designed to be a "dumb" component: it doesn't know how to
 fetch data or what happens when it's clicked. It simply receives an album object
 as a prop, displays its title, cover image, and visibility status, and then tells
 its parent component (the DashboardView) when it has been clicked. -->

<template>
  <v-card @click="$emit('selectAlbum', album.id)">
    <v-img
      :src="coverImageUrl"
      class="align-end text-white"
      gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
      height="200px"
      cover
    >
      <v-card-title>{{ album.title }}</v-card-title>
    </v-img>

    <v-card-actions>
      <v-chip
        class="ma-2"
        :color="album.visible ? 'green' : 'orange'"
        text-color="white"
        prepend-icon="mdi-lock"
      >
        {{ album.visible ? 'Public' : 'Private' }}
      </v-chip>
      <v-spacer></v-spacer>
      <v-btn icon>
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'; // Import Vue's computed function to create reactive properties

const props = defineProps({ // Define the props that this component expects
  album: {
    type: Object,
    required: true,
  },
});

defineEmits(['selectAlbum']); // Define the events that this component can emit

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Get the base URL for the API from environment variables

const coverImageUrl = computed(() => { //
  if (props.album && props.album.cover_image_url) { // Check if the album and its cover image URL are defined
    // This is the robust way to join a base URL and a relative path.
    // It automatically handles any extra slashes.
    return new URL(props.album.cover_image_url, API_BASE_URL).href;
  }
  return 'https://cdn.vuetifyjs.com/images/cards/docks.jpg'; // Fallback image if no cover image is provided
});
</script>
