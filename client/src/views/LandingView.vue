<template>
  <v-container fluid class="pa-0">
    <!-- Hero Section -->
    <v-row
      align="center"
      justify="center"
      class="text-center hero-section"
    >
      <v-col>
        <h1 class="text-h2 font-weight-bold mb-3 text-white">Welcome to Qrono</h1>
        <p class="text-h5 font-weight-light text-white">Your personal, secure memory vault.</p>
        <v-btn size="large" variant="elevated" color="white" class="mt-5" to="/register">Get Started</v-btn>
      </v-col>
    </v-row>

    <!-- Features Section -->
    <v-container class="my-10">
      <v-row>
        <v-col v-for="feature in features" :key="feature.title" cols="12" md="4">
          <v-card class="mx-auto" max-width="344" variant="outlined">
            <v-list-item lines="four">
              <div>
                <div class="text-overline mb-4">FEATURE</div>
                <v-list-item-title class="text-h6 mb-1">{{ feature.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ feature.text }}</v-list-item-subtitle>
              </div>
              <template v-slot:append>
                <v-icon size="50" color="primary">{{ feature.icon }}</v-icon>
              </template>
            </v-list-item>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';

const features = ref([
  { title: 'Create Albums', text: 'Organize your memories into beautiful, distinct albums for every occasion.', icon: 'mdi-image-album' },
  { title: 'Write Diaries', text: 'Accompany your photos with rich diary entries using Markdown formatting.', icon: 'mdi-book-open-page-variant' },
  { title: 'Dual Security', text: 'Keep your most sensitive albums extra safe with a second password verification.', icon: 'mdi-lock-check' },
]);
</script>

<style scoped>
.hero-section {
  background-image: url('../assets/landing-bg.jpg');

  /* These properties ensure the background image looks good */
  background-size: cover; /* Stretches the image to cover the entire area */
  background-position: center center; /* Centers the image */
  background-repeat: no-repeat; /* Prevents the image from tiling */

  min-height: 50vh; /* Set a minimum height for the section */

  /* Add a dark overlay to ensure text is readable, just like on the album cards */
  position: relative;
  z-index: 1;
}

/* This pseudo-element creates the dark overlay */
.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4); /* 40% opaque black. Adjust as needed. */
  z-index: -1;
}
</style>
