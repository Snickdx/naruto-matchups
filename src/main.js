// Import styles
import './style.css';

// Import libraries
import cytoscape from 'cytoscape';
import dagre from 'dagre';
import cytoscapeDagre from 'cytoscape-dagre';
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent';

// Register Cytoscape extensions
cytoscapeDagre(cytoscape, dagre);
cytoscapeCoseBilkent(cytoscape);

// Make cytoscape available globally for the app
window.cytoscape = cytoscape;

// Import main app
import './app.js';
