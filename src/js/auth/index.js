/**
 * Auth Module
 * Main entry point for authentication functionality
 */

import { initAuth as initAuthService, subscribeToAuth, getAuthState } from './AuthContext.js';
import { initAuthUI } from './AuthUI.js';
import { initDatabase } from '../database/supabaseService.js';
import { initSyncService, syncData } from '../database/syncService.js';

// Track initialization state
let isInitialized = false;

/**
 * Initialize the auth module
 * This should be called when the app starts
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
    const { user } = getAuthState();
    
    // If user is logged in, initialize database and sync service
    if (user) {
      console.log('User is logged in, initializing database and sync');
      await initDatabase();
      await initSyncService();
    }
    
    // Subscribe to auth state changes
    subscribeToAuth(async (state) => {
      console.log('Auth state changed:', state.isAuthenticated ? 'authenticated' : 'unauthenticated');
      
      // Handle auth state changes
      if (state.isAuthenticated && state.user) {
        // User just signed in
        if (!isInitialized || !getAuthState().user) {
          console.log('User signed in');
          // Initialize database and sync when user signs in
          await initDatabase();
          await initSyncService();
          // Sync data from local to cloud
          await syncData();
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
  }
}

// Export auth functions for convenience
export * from './AuthContext.js';
