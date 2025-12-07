// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAZ5sd0eEFgm6tHzxHiQY3EY0RpkU1CfOI",
  authDomain: "naruto-matchups.firebaseapp.com",
  projectId: "naruto-matchups",
  storageBucket: "naruto-matchups.firebasestorage.app",
  messagingSenderId: "364303812216",
  appId: "1:364303812216:web:26c71433d2d0131e5d4f8d",
  measurementId: "G-XMRML5QPLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
const analytics = getAnalytics(app);

// Export for use in other modules
export { app, analytics, logEvent };

// Log app initialization
logEvent(analytics, 'app_initialized');

// Helper function to track page views
export function trackPageView(pageName) {
  logEvent(analytics, 'page_view', {
    page_title: pageName,
    page_location: window.location.href
  });
}

// Helper function to track character selection
export function trackCharacterSelect(characterName) {
  logEvent(analytics, 'select_content', {
    content_type: 'character',
    item_id: characterName
  });
}

// Helper function to track view changes
export function trackViewChange(viewName) {
  logEvent(analytics, 'screen_view', {
    screen_name: viewName
  });
}

// Helper function to track search
export function trackSearch(searchTerm) {
  logEvent(analytics, 'search', {
    search_term: searchTerm
  });
}

