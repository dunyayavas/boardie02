/**
 * Auth Module
 * Main entry point for authentication functionality
 */

import { initAuth as initAuthService, subscribeToAuth, getAuthState } from './AuthContext.js';
import { initAuthUI } from './AuthUI.js';
import { initDatabase } from '../database/supabaseService.js';
import { initSyncService, debouncedSync } from '../database/syncService.js';

// Track initialization state
let isInitialized = false;

/**
 * Initialize the auth module
 * This should be called when the app starts
 * @param {Array} localPosts - Posts loaded from local storage
 */
export async function initAuth(localPosts = []) {
  if (isInitialized) return;
  
  try {
    console.log('Initializing auth module...');
    
    // Initialize the auth service
    await initAuthService();
    
    // Initialize the auth UI
    initAuthUI();
    
    // Get current auth state
    const { user, isAuthenticated } = getAuthState();
    
    // Store authentication state in global object for access in main.js
    window.boardie = window.boardie || {};
    window.boardie.isAuthenticated = isAuthenticated;
    
    // If user is logged in, initialize database and sync service
    if (user) {
      console.log('User is logged in, initializing database and sync');
      await initDatabase();
      
      // Initialize sync service with local posts to enable smart sync
      await initSmartSync(localPosts);
    }
    
    // Subscribe to auth state changes
    subscribeToAuth(async (state) => {
      console.log('Auth state changed:', state.isAuthenticated ? 'authenticated' : 'unauthenticated');
      window.boardie.isAuthenticated = state.isAuthenticated;
      
      // Handle auth state changes
      if (state.isAuthenticated && state.user) {
        // User just signed in
        if (!isInitialized || !getAuthState().user) {
          console.log('User signed in');
          // Initialize database and sync when user signs in
          await initDatabase();
          
          // Get current posts from local storage without rendering
          const currentLocalPosts = window.boardie.loadPosts(true);
          
          // Initialize smart sync with current local posts
          await initSmartSync(currentLocalPosts);
        }
      } else if (!state.isAuthenticated) {
        // User signed out
        console.log('User signed out');
        // Handle sign out (e.g., clear sensitive data)
      }
    });
    
    isInitialized = true;
    console.log('Auth module initialized');
    
  } catch (error) {
    console.error('Error initializing auth module:', error);
    throw error; // Propagate error to main.js
  }
}

// Export auth functions for convenience
export * from './AuthContext.js';
