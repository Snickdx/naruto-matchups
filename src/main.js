// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

// Import libraries
import cytoscape from 'cytoscape';
import dagre from 'dagre';
import cytoscapeDagre from 'cytoscape-dagre';
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent';
import * as bootstrap from 'bootstrap';

// Register Cytoscape extensions
cytoscapeDagre(cytoscape, dagre);
cytoscapeCoseBilkent(cytoscape);

// Make them available globally for the app
window.cytoscape = cytoscape;
window.bootstrap = bootstrap;

// Import main app
import './app.js';

