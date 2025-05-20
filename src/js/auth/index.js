/**
 * Auth Module
 * Main entry point for authentication functionality
 */

import { initAuth as initAuthService, subscribeToAuth, getAuthState } from './AuthContext.js';
import { initAuthUI } from './AuthUI.js';
import { initDatabase } from '../database/supabaseService.js';
import { initSyncService, debouncedSync, initSmartSync } from '../database/syncService.js';

// Track initialization state
let isInitialized = false;

// Store the auth subscription
let authSubscription = null;

// Track the last auth state to prevent duplicate processing
let lastAuthState = null;

/**
 * Initialize the auth module
 * This should be called when the app starts
 * @param {Array} localPosts - Posts loaded from local storage (not used anymore)
 */
export async function initAuth() {
  if (isInitialized) {
    console.log('Auth module already initialized, skipping');
    return;
  }
  
  try {
    console.log('Initializing auth module...');
    
    // Initialize the auth service
    await initAuthService();
    
    // Initialize the auth UI
    initAuthUI();
    
    // Get current auth state
    const { user, isAuthenticated } = getAuthState();
    
    // Store authentication state and user in global object
    window.boardie = window.boardie || {};
    window.boardie.isAuthenticated = isAuthenticated;
    window.boardie.currentUser = user;
    
    // If user is logged in, initialize database and sync service
    if (user) {
      console.log('User is logged in, initializing database and sync');
      await initDatabase();
      
      // Clear UI first to ensure we don't show stale data
      if (window.boardie.clearUI) {
        window.boardie.clearUI();
      }
      
      // Initialize sync service with empty array to prioritize cloud data
      await initSmartSync([]);
    } else {
      // No user logged in, show empty state
      console.log('No user logged in, showing empty state');
      if (window.boardie.showEmptyState) {
        window.boardie.showEmptyState();
      }
    }
    
    // Clean up previous auth subscription if it exists
    if (authSubscription) {
      console.log('Cleaning up previous auth subscription');
      authSubscription();
      authSubscription = null;
    }
    
    // Subscribe to auth state changes - using a non-async callback initially
    authSubscription = subscribeToAuth((state) => {
      console.log('Auth state changed:', state.isAuthenticated ? 'authenticated' : 'unauthenticated');
      
      // Check if this is a duplicate auth state change due to tab switching
      const now = Date.now();
      const lastVisibilityChangeTime = window.boardie?.lastVisibilityChangeTime || 0;
      const timeSinceVisibilityChange = now - lastVisibilityChangeTime;
      const isSameAuthState = lastAuthState && 
                             state.isAuthenticated === lastAuthState.isAuthenticated &&
                             state.user?.id === lastAuthState.user?.id;
      
      // If this is a duplicate auth state change within 2 seconds of visibility change, ignore it
      if (isSameAuthState && timeSinceVisibilityChange < 2000) {
        console.log('Ignoring duplicate auth state change after tab switch');
        return;
      }
      
      // Update global state
      window.boardie.isAuthenticated = state.isAuthenticated;
      window.boardie.currentUser = state.user;
      
      // Store the current auth state for future comparison
      lastAuthState = { 
        isAuthenticated: state.isAuthenticated, 
        user: state.user ? { id: state.user.id, email: state.user.email } : null 
      };
      
      // Handle auth state changes
      if (state.isAuthenticated && state.user) {
        // User just signed in
        console.log('User signed in:', state.user.email);
        
        // Use setTimeout to handle async operations outside of the auth callback
        // This prevents the "message channel closed" error
        setTimeout(async () => {
          try {
            // Check if the page is hidden and posts are already rendered
            // If so, skip the data loading to prevent unnecessary re-renders
            if (document.hidden && window.boardie.postsRendered) {
              console.log('Page is hidden and posts already rendered, skipping data load');
              return;
            }
            
            // Also check if we already have posts rendered and this is likely a tab switch
            // or if we just returned from being hidden
            const lastVisibilityChangeTime = window.boardie?.lastVisibilityChangeTime || 0;
            const timeSinceVisibilityChange = Date.now() - lastVisibilityChangeTime;
            
            if ((window.boardie.postsRendered && timeSinceVisibilityChange < 2000) || window.boardie.justReturned) {
              console.log('Posts already rendered and recent visibility change, skipping data load');
              return;
            }
            
            // Initialize database
            await initDatabase();
            
            // Clear UI first to ensure we don't show stale data
            if (window.boardie.clearUI) {
              console.log('Clearing UI before loading cloud data');
              window.boardie.clearUI();
            }
            
            // Initialize smart sync with empty array to prioritize cloud data
            console.log('Fetching cloud data for user');
            await initSmartSync([]);
          } catch (error) {
            console.error('Error handling auth state change:', error);
          }
        }, 0);
      } else if (!state.isAuthenticated) {
        // User signed out
        console.log('User signed out, clearing data');
        
        // Use setTimeout to handle async operations outside of the auth callback
        setTimeout(() => {
          try {
            // Check if the page is hidden
            // We still need to clear localStorage even if the page is hidden
            if (window.boardie.clearLocalStorage) {
              window.boardie.clearLocalStorage();
            }
            
            // Only update UI if the page is visible
            if (!document.hidden) {
              // Clear UI
              if (window.boardie.clearUI) {
                window.boardie.clearUI();
              }
              
              // Show empty state
              if (window.boardie.showEmptyState) {
                window.boardie.showEmptyState();
              }
            } else {
              console.log('Page is hidden, skipping UI updates on sign out');
            }
          } catch (error) {
            console.error('Error handling sign out:', error);
          }
        }, 0);
      }
    });
    
    isInitialized = true;
    console.log('Auth module initialized');
  } catch (error) {
    console.error('Error initializing auth module:', error);
  }
  
  // Return the initialization state
  return isInitialized;
}

// Export auth functions for convenience
export * from './AuthContext.js';
