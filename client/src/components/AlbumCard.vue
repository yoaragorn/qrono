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
import { computed } from 'vue';

const props = defineProps({
  album: {
    type: Object,
    required: true,
  },
});

defineEmits(['selectAlbum']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const coverImageUrl = computed(() => {
  if (props.album && props.album.cover_image_url) {
    // This is the robust way to join a base URL and a relative path.
    // It automatically handles any extra slashes.
    return new URL(props.album.cover_image_url, API_BASE_URL).href;
  }
  return 'https://cdn.vuetifyjs.com/images/cards/docks.jpg';
});
</script>
