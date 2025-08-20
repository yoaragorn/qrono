<!-- This App.vue component acts as the master layout for the Qrono application.
 It sets up the main structure with a persistent top navigation bar (v-app-bar)
 and a main content area (v-main). It's responsible for dynamically displaying either
 "Login/Sign Up" buttons or a user menu based on the user's authentication status.
 Crucially, it contains the <router-view> placeholder where all other pages are rendered,
 and it manages global UI elements like the notification snackbar and the
 page-level loading state via <Suspense>. -->

<template>
    <v-app>
        <!-- App Bar appears on all pages -->
        <v-app-bar app color="primary" dark>
            <v-toolbar-title class="headline">
                <router-link
                    to="/"
                    class="white--text"
                    style="text-decoration: none"
                    >Qrono</router-link
                >
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
                        <div
                            class="d-flex justify-center align-center"
                            style="height: 80vh"
                        >
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
                <v-btn variant="text" @click="uiStore.snackbar.visible = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>
    </v-app>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'; // Import the Pinia store for managing authentication state
import { useUiStore } from '@/stores/ui'; // Import the Pinia store for managing UI state
import { useRouter } from 'vue-router'; // Import Vue Router to navigate between pages
import { onMounted } from 'vue'; // Import Vue's lifecycle hook to run code when the component is mounted
import { computed } from 'vue'; // Import Vue's computed function to create reactive properties
import { useRoute } from 'vue-router'; // Import Vue Router to access the current route

const authStore = useAuthStore(); // Access the authentication store to check if the user is authenticated
const router = useRouter(); // Access the router to navigate between pages
const uiStore = useUiStore(); // Access the UI store to manage the snackbar notifications
const route = useRoute(); // Access the current route to determine if the landing page is being displayed

const isLandingPage = computed(() => route.name === 'landing'); // Computed property to check if the current route is the landing page

onMounted(() => { // Lifecycle hook to run code when the component is mounted
  if (authStore.isAuthenticated) { // If the user is authenticated, fetch the user data
    authStore.fetchUser(); // Fetch the user data from the server
  }
});

const handleLogout = () => { // Function to handle user logout
  authStore.logout(); // Call the logout action in the auth store
  router.push('/login'); // Redirect the user to the login page after logout
};

const handleDashboard = () => { // Function to navigate to the user's dashboard
  router.push('/dashboard'); // Redirect the user to the dashboard page
};
</script>

<style scoped>
.headline .white--text {
    color: white !important;
}
</style>

<style>
.v-container {
    max-width: 960px !important;
}
</style>
