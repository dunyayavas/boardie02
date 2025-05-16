/**
 * Auth Module
 * Main entry point for authentication functionality
 */

import { supabase, getCurrentUser } from './supabaseClient.js';
import { initAuthUI, updateAuthUI, setCurrentUser } from './AuthUI.js';
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
    
    // Initialize the auth UI
    await initAuthUI();
    
    // Check if user is already logged in
    const user = await getCurrentUser();
    
    // Update UI based on auth state
    setCurrentUser(user);
    
    // If user is logged in, initialize database and sync service
    if (user) {
      console.log('User is logged in, initializing database and sync');
      await initDatabase();
      await initSyncService();
    }
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      // Update current user
      const user = session?.user || null;
      setCurrentUser(user);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in');
          // Initialize database and sync when user signs in
          await initDatabase();
          await initSyncService();
          // Sync data from local to cloud
          await syncData();
          break;
          
        case 'SIGNED_OUT':
          console.log('User signed out');
          // Handle sign out (e.g., clear sensitive data)
          break;
          
        case 'USER_UPDATED':
          console.log('User updated');
          break;
          
        case 'PASSWORD_RECOVERY':
          console.log('Password recovery');
          break;
      }
    });
    
    isInitialized = true;
    console.log('Auth module initialized');
    
  } catch (error) {
    console.error('Error initializing auth module:', error);
  }
}

// Export everything from supabaseClient for convenience
export * from './supabaseClient.js';
