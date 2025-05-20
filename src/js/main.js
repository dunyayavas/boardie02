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

// Track visibility state
let wasHidden = false;

// Handle visibility change events
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is now hidden
    console.log('Page visibility: hidden');
    wasHidden = true;
  } else {
    // Page is now visible again
    console.log('Page visibility: visible');
    if (wasHidden) {
      // Don't do anything special when returning to the page
      // This prevents re-renders when switching tabs
      console.log('Returned to page, preventing automatic re-render');
    }
    wasHidden = false;
  }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Boardie application initialized');
  
  // Initialize Twitter widgets
  initTwitterWidgets();
  
  // Initialize global state
  window.boardie = window.boardie || {};
  window.boardie.postsRendered = false;
  window.boardie.isAuthenticated = false;
  window.boardie.isRendering = false;
  window.boardie.cloudDataReady = false;
  window.boardie.localDataReady = false;
  window.boardie.renderPosts = displayPosts;
  
  // Central rendering function that respects the rendering lock
  window.boardie.safeRenderPosts = function(posts) {
    // If we're already rendering, don't render again
    if (window.boardie.isRendering) {
      console.log('Already rendering posts, skipping this render call');
      return;
    }
    
    // Set the rendering flag
    window.boardie.isRendering = true;
    console.log('Safe rendering posts');
    
    // Render the posts
    window.boardie.renderPosts(posts);
    
    // Mark posts as rendered
    window.boardie.postsRendered = true;
    
    // Reset the rendering flag after a delay to ensure all async operations complete
    setTimeout(() => {
      window.boardie.isRendering = false;
      console.log('Rendering complete, reset rendering flag');
    }, 500);
  };
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
  
  // Listen for cloud data ready event
  document.addEventListener('cloudDataReady', (event) => {
    console.log('Received cloudDataReady event');
    
    // Only process if the page is visible or this is the initial load
    if (document.hidden && window.boardie.postsRendered) {
      console.log('Page is hidden and posts already rendered, skipping render');
      return;
    }
    
    if (event.detail && event.detail.posts) {
      // Render the cloud posts
      window.boardie.safeRenderPosts(event.detail.posts);
      
      // Trigger tag filter setup
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('setupTagFilters'));
      }, 300);
    }
  });
  
  // Listen for local data ready event
  document.addEventListener('localDataReady', (event) => {
    console.log('Received localDataReady event');
    
    // Only process if the page is visible or this is the initial load
    if (document.hidden && window.boardie.postsRendered) {
      console.log('Page is hidden and posts already rendered, skipping render');
      return;
    }
    
    if (event.detail && event.detail.posts) {
      // Only render if cloud data hasn't been rendered yet
      if (!window.boardie.cloudDataReady) {
        window.boardie.safeRenderPosts(event.detail.posts);
        
        // Trigger tag filter setup
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('setupTagFilters'));
        }, 300);
      } else {
        console.log('Cloud data already rendered, skipping local data render');
      }
    }
  });
  
  // Initialize Supabase authentication
  try {
    // Initialize auth without loading posts first
    await initAuth();
    console.log('Authentication initialized');
    
    // We'll let the data ready events handle rendering
    // Just show empty state if needed
    if (!window.boardie.isAuthenticated) {
      console.log('Not authenticated, showing empty state');
      window.boardie.showEmptyState();
    } else {
      console.log('User is authenticated, waiting for data ready events');
      // If no data ready events fire within 2 seconds, check local storage as fallback
      setTimeout(() => {
        if (!window.boardie.postsRendered) {
          console.log('No data ready events received, checking local storage as fallback');
          const posts = loadPosts(false); // Load without rendering
          
          if (posts.length > 0) {
            console.log('Found posts in local storage, rendering as fallback');
            window.boardie.safeRenderPosts(posts);
          } else {
            console.log('No posts found in local storage, showing empty state');
            window.boardie.showEmptyState();
          }
        }
      }, 2000);  // 2 second timeout for fallback
    }
  } catch (error) {
    console.error('Error initializing authentication:', error);
    // Show empty state on auth error
    window.boardie.showEmptyState();
  }
});
