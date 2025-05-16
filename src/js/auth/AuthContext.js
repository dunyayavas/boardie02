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
    
    // Subscribe to auth changes
    onAuthStateChange((event, session) => {
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
      
      // Notify listeners of auth state change
      notifyListeners();
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
  authListeners.forEach(listener => {
    try {
      listener(state);
    } catch (err) {
      console.error('Error in auth listener:', err);
    }
  });
}
