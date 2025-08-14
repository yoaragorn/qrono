// plugins/vuetify.js

// Styles
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

// Composables
import { createVuetify } from 'vuetify';

import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
});
