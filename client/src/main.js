// The main.js file is the starting point of your application's execution.
// It creates the root Vue application instance, "plugs in" all the major
// functionalities (plugins) like Pinia for state management, Vue Router for
// navigation, and Vuetify for the UI component library. Finally, it tells
// Vue to take this fully-configured application and render it into the
// index.html file, bringing your entire app to life in the browser.

import './assets/main.css' // Import the main CSS file for global styles

import { createApp } from 'vue' // Import the createApp function from Vue to create a new Vue application instance
import { createPinia } from 'pinia' // Import Pinia for state management, allowing you to create a store for managing application state

import App from './App.vue' // Import the root App component, which serves as the main layout for your application
import router from './router' // Import the Vue Router instance, which manages navigation between different views in your application
import vuetify from './plugins/vuetify' // Import the Vuetify plugin, which provides a rich set of UI components and styles for building responsive applications

import './assets/main.css'; // Import the main CSS file for global styles

const app = createApp(App) // Create a new Vue application instance using the root App component

app.use(createPinia()) // Use Pinia for state management, allowing you to create and manage stores throughout your application
app.use(router) // Use the Vue Router instance to enable navigation between different views in your application
app.use(vuetify) // Use the Vuetify plugin to provide a rich set of UI components and styles

app.mount('#app') // Mount the Vue application instance to the DOM element with the ID 'app', making it the root of your application
