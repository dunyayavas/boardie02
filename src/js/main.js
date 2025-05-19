import '../css/main.css';
import { setupEventListeners } from './eventHandlers.js';
import { loadPosts, showNoPostsMessage, clearLocalStorage, displayPosts } from './postManager.js';
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
  
  // Setup global boardie object with helper functions
  window.boardie = window.boardie || {};
  window.boardie.postsRendered = false;
  window.boardie.isAuthenticated = false;
  window.boardie.isRendering = false;
  window.boardie.renderPosts = displayPosts;
  window.boardie.clearUI = function() {
    // Clear the posts container
    const postsContainer = document.getElementById('postsContainer');
    if (postsContainer) {
      postsContainer.innerHTML = '';
    }
    
    // Clear the tag filter container
    const tagFilterContainer = document.getElementById('tagFilterContainer');
    if (tagFilterContainer) {
      tagFilterContainer.innerHTML = '';
    }
    
    console.log('UI cleared');
  };
  window.boardie.showEmptyState = showNoPostsMessage;
  window.boardie.loadPosts = loadPosts;
  window.boardie.clearLocalStorage = clearLocalStorage;
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize Supabase authentication
  try {
    // Initialize auth without loading posts first
    await initAuth();
    console.log('Authentication initialized');
    
    // Only render posts if they haven't been rendered yet by the auth/sync process
    if (!window.boardie.postsRendered) {
      console.log('Posts not yet rendered in auth process');
      
      if (window.boardie.isAuthenticated) {
        // If authenticated but posts not rendered, load from user-specific storage
        console.log('User is authenticated, loading from user-specific storage');
        const posts = loadPosts(true); // Load without rendering
        
        if (posts.length > 0) {
          console.log('Found posts in storage, rendering');
          window.boardie.renderPosts(posts);
          // Trigger tag filter setup
          document.dispatchEvent(new CustomEvent('setupTagFilters'));
        } else {
          console.log('No posts found in storage, showing empty state');
          window.boardie.showEmptyState();
        }
      } else {
        // Not authenticated, show empty state
        console.log('Not authenticated, showing empty state');
        window.boardie.showEmptyState();
      }
      
      // Mark posts as rendered to prevent multiple renders
      window.boardie.postsRendered = true;
    } else {
      console.log('Posts already rendered, skipping render in main.js');
    }
  } catch (error) {
    console.error('Error initializing authentication:', error);
    // Show empty state on auth error
    window.boardie.showEmptyState();
  }
});
