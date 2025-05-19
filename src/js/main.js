import '../css/main.css';
import { setupEventListeners } from './eventHandlers.js';
import { loadPosts, showNoPostsMessage } from './postManager.js';
import { initAuth } from './auth/index.js';

// Initialize Twitter widgets
function initTwitterWidgets() {
  // Check if Twitter widgets are already loaded
  if (window.twttr) {
    console.log('Twitter widgets already loaded');
    return;
  }

  // Create Twitter widgets script if not already present
  window.twttr = (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0],
      t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);
    t._e = [];
    t.ready = function(f) {
      t._e.push(f);
    };
    return t;
  }(document, "script", "twitter-wjs"));

  // Log when Twitter widgets are ready
  window.twttr.ready(function() {
    console.log('Twitter widgets loaded and ready');
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Boardie application initialized');
  
  // Initialize Twitter widgets
  initTwitterWidgets();
  
  // Initialize Supabase authentication
  try {
    await initAuth();
    console.log('Authentication initialized');
  } catch (error) {
    console.error('Error initializing authentication:', error);
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load saved posts from localStorage with explicit rendering
  // This is the main render when the app loads
  console.log('Initial app load - rendering posts');
  const posts = loadPosts(false); // false = don't skip rendering (explicitly render)
  
  // Show message if no posts exist
  if (posts.length === 0) {
    showNoPostsMessage();
  }
});
