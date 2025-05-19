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
  
  // Load saved posts from localStorage without rendering
  console.log('Loading posts from local storage (without rendering)');
  const localPosts = loadPosts(true); // true = skip rendering
  
  // Setup event listeners
  setupEventListeners();
  
  // Set a flag to track if posts have been rendered
  window.boardie = window.boardie || {};
  window.boardie.postsRendered = false;
  
  // Initialize Supabase authentication
  try {
    await initAuth(localPosts);
    console.log('Authentication initialized');
    
    // If posts haven't been rendered by the auth/sync process, render them now
    if (!window.boardie.postsRendered) {
      console.log('Posts not yet rendered, rendering posts from local storage');
      window.boardie.renderPosts(localPosts);
      window.boardie.postsRendered = true;
    }
  } catch (error) {
    console.error('Error initializing authentication:', error);
    
    // If auth fails, still render posts from local storage
    if (!window.boardie.postsRendered) {
      console.log('Auth failed, rendering posts from local storage');
      window.boardie.renderPosts(localPosts);
      window.boardie.postsRendered = true;
    }
  }
});
