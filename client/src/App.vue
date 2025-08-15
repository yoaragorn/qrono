<template>
  <v-app>
    <!-- App Bar appears on all pages -->
    <v-app-bar app color="primary" dark>
      <v-toolbar-title class="headline">
        <router-link to="/" class="white--text" style="text-decoration: none;">Qrono</router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>

      <!-- If user is not logged in -->
      <div v-if="!authStore.isAuthenticated">
        <v-btn text to="/login">Log In</v-btn>
        <v-btn outlined to="/register">Sign Up</v-btn>
      </div>

      <!-- If user is logged in -->
      <div v-else>
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon>
              <v-icon>mdi-account-circle</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="handleDashboard">
              <v-list-item-title>Dashboard</v-list-item-title>
            </v-list-item>
            <v-list-item @click="handleLogout">
              <v-list-item-title>Log Out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <!-- Main content area where router views are displayed -->
    <v-main>
      <v-container fluid :class="{ 'pa-0': isLandingPage }">
        <Suspense>
          <!-- The main content to be displayed once ready -->
          <template #default>
            <router-view></router-view>
          </template>

          <!-- The content to display while waiting for the async setup -->
          <template #fallback>
            <div class="d-flex justify-center align-center" style="height: 80vh;">
              <v-progress-circular
                indeterminate
                color="primary"
                size="64"
              ></v-progress-circular>
            </div>
          </template>
        </Suspense>
      </v-container>
    </v-main>
    <v-snackbar
      v-model="uiStore.snackbar.visible"
      :color="uiStore.snackbar.color"
      :timeout="uiStore.snackbar.timeout"
      location="top right"
    >
      {{ uiStore.snackbar.text }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="uiStore.snackbar.visible = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { computed } from 'vue'; // <-- Add computed to your imports
import { useRoute } from 'vue-router'; // <-- Add useRoute to your imports

const authStore = useAuthStore();
const router = useRouter();
const uiStore = useUiStore();
const route = useRoute(); // <-- Get the current route object

const isLandingPage = computed(() => route.name === 'landing');

onMounted(() => {
  if (authStore.isAuthenticated) {
    authStore.fetchUser();
  }
});

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const handleDashboard = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
.headline .white--text {
  color: white !important;
}
</style>
