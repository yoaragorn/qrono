// This file acts as a Vue plugin. Its primary job is to initialize and configure the entire Vuetify
// library and then export that configured instance so it can be "plugged into" your main Vue application
// in main.js. It is responsible for importing all necessary CSS styles, globally registering all of
// Vuetify's components (like <v-card>, <v-btn>, etc.), and setting up the icon library.

// Styles
import 'vuetify/styles'; // Import Vuetify styles
import '@mdi/font/css/materialdesignicons.css'; // Import Material Design Icons CSS

// Composables
import { createVuetify } from 'vuetify'; // Create a Vuetify instance

import * as components from 'vuetify/components'; // Import Vuetify components
import * as directives from 'vuetify/directives'; // Import Vuetify directives

export default createVuetify({ // Create a Vuetify instance with the following options
  components, // Register all Vuetify components
  directives, // Register all Vuetify directives
  icons: { // Configure icons
    defaultSet: 'mdi', // Set the default icon set to Material Design Icons
  },
});
