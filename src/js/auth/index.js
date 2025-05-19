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

/**
 * Initialize the auth module
 * This should be called when the app starts
 * @param {Array} localPosts - Posts loaded from local storage (not used anymore)
 */
export async function initAuth() {
  if (isInitialized) return;
  
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
    
    // Subscribe to auth state changes
    subscribeToAuth(async (state) => {
      console.log('Auth state changed:', state.isAuthenticated ? 'authenticated' : 'unauthenticated');
      window.boardie.isAuthenticated = state.isAuthenticated;
      window.boardie.currentUser = state.user;
      
      // Handle auth state changes
      if (state.isAuthenticated && state.user) {
        // User just signed in
        console.log('User signed in:', state.user.email);
        
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
      } else if (!state.isAuthenticated) {
        // User signed out
        console.log('User signed out, clearing data');
        
        // Clear localStorage for the previous user
        if (window.boardie.clearLocalStorage) {
          window.boardie.clearLocalStorage();
        }
        
        // Clear UI
        if (window.boardie.clearUI) {
          window.boardie.clearUI();
        }
        
        // Show empty state
        if (window.boardie.showEmptyState) {
          window.boardie.showEmptyState();
        }
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
