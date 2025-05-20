/**
 * Authentication Service
 * Provides authentication state and methods throughout the application
 */

import { supabase, getCurrentUser, signIn, signUp, signOut, onAuthStateChange } from './supabaseClient.js';

// Auth state
let currentUser = null;
let isLoading = false;
let authError = null;
let authListeners = [];

// Store the unsubscribe function for the auth state change listener
let authUnsubscribe = null;

/**
 * Initialize the auth service
 * @returns {Promise<void>}
 */
export async function initAuth() {
  try {
    isLoading = true;
    notifyListeners();
    
    // Check for existing user session
    currentUser = await getCurrentUser();
    
    // Clean up previous auth listener if it exists
    if (authUnsubscribe) {
      console.log('Cleaning up previous auth listener');
      authUnsubscribe();
      authUnsubscribe = null;
    }
    
    // Subscribe to auth changes - using a synchronous callback to avoid message channel closed errors
    authUnsubscribe = onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      currentUser = session?.user || null;
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in:', session?.user?.email);
          break;
        case 'SIGNED_OUT':
          console.log('User signed out');
          break;
        case 'USER_UPDATED':
          console.log('User updated');
          break;
        case 'PASSWORD_RECOVERY':
          console.log('Password recovery requested');
          break;
        default:
          break;
      }
      
      // Notify listeners of auth state change synchronously
      // This avoids returning a Promise which would indicate an asynchronous response
      notifyListeners();
      
      // Return false to indicate we're not handling this asynchronously
      // This prevents the "message channel closed" error
      return false;
    });
    
  } catch (err) {
    console.error('Error initializing auth:', err);
    authError = err.message;
  } finally {
    isLoading = false;
    notifyListeners();
  }
}

/**
 * Sign in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Auth result
 */
export async function login(email, password) {
  try {
    isLoading = true;
    authError = null;
    notifyListeners();
    
    const { user: authUser, session } = await signIn(email, password);
    currentUser = authUser;
    
    notifyListeners();
    return { user: authUser, session };
  } catch (err) {
    console.error('Error signing in:', err);
    authError = err.message;
    notifyListeners();
    throw err;
  } finally {
    isLoading = false;
    notifyListeners();
  }
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Auth result
 */
export async function register(email, password) {
  try {
    isLoading = true;
    authError = null;
    notifyListeners();
    
    const { user: authUser, session } = await signUp(email, password);
    // Note: For email confirmation, the user might not be immediately available
    if (authUser) currentUser = authUser;
    
    notifyListeners();
    return { user: authUser, session };
  } catch (err) {
    console.error('Error signing up:', err);
    authError = err.message;
    notifyListeners();
    throw err;
  } finally {
    isLoading = false;
    notifyListeners();
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    isLoading = true;
    authError = null;
    notifyListeners();
    
    await signOut();
    currentUser = null;
    
    notifyListeners();
  } catch (err) {
    console.error('Error signing out:', err);
    authError = err.message;
    notifyListeners();
    throw err;
  } finally {
    isLoading = false;
    notifyListeners();
  }
}

/**
 * Get the current authentication state
 * @returns {Object} Auth state
 */
export function getAuthState() {
  return {
    user: currentUser,
    loading: isLoading,
    error: authError,
    isAuthenticated: !!currentUser
  };
}

/**
 * Subscribe to auth state changes
 * @param {Function} listener - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAuth(listener) {
  if (typeof listener !== 'function') {
    throw new Error('Auth listener must be a function');
  }
  
  authListeners.push(listener);
  
  // Call the listener immediately with current state
  listener(getAuthState());
  
  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all listeners of auth state changes
 * @private
 */
function notifyListeners() {
  const state = getAuthState();
  
  // Make a copy of the listeners array to avoid issues if listeners are added/removed during iteration
  const currentListeners = [...authListeners];
  
  // Call each listener synchronously
  currentListeners.forEach(listener => {
    try {
      // Call the listener and check if it returns a Promise
      const result = listener(state);
      
      // If it returns a Promise, log a warning but don't await it
      // This prevents the "message channel closed" error
      if (result && typeof result.then === 'function') {
        console.warn('Auth listener returned a Promise. This may cause issues with Supabase auth state change handling.');
      }
    } catch (err) {
      console.error('Error in auth listener:', err);
    }
  });
}
