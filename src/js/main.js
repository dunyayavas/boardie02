import '../css/main.css';
import { setupEventListeners } from './eventHandlers.js';
import { loadPosts, showNoPostsMessage } from './postManager.js';

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
document.addEventListener('DOMContentLoaded', () => {
  console.log('Boardie application initialized');
  
  // Initialize Twitter widgets
  initTwitterWidgets();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load saved posts from localStorage
  const posts = loadPosts();
  
  // Show message if no posts exist
  if (posts.length === 0) {
    showNoPostsMessage();
  }
});
