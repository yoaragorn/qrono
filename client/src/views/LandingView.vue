<template>
  <v-container fluid class="pa-0">
    <!-- Hero Section -->
    <v-row
      align="center"
      justify="center"
      class="text-center white--text"
      style="background-color: #1976D2; min-height: 40vh;"
    >
      <v-col>
        <h1 class="display-2 font-weight-bold mb-3">Welcome to Qrono</h1>
        <p class="subheading font-weight-regular">Your personal, secure memory vault.</p>
        <v-btn large color="white" light class="mt-5" to="/register">Get Started</v-btn>
      </v-col>
    </v-row>

    <!-- Features Section -->
    <v-container class="my-10">
      <v-row>
        <v-col v-for="feature in features" :key="feature.title" cols="12" md="4">
          <v-card class="mx-auto" max-width="344" variant="outlined">
            <v-list-item lines="three">
              <!-- Main content goes directly inside the v-list-item -->
              <div>
                <div class="text-overline mb-4">FEATURE</div>
                <v-list-item-title class="text-h6 mb-1">{{ feature.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ feature.text }}</v-list-item-subtitle>
              </div>

              <!-- Use the 'append' slot for content on the right side -->
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
