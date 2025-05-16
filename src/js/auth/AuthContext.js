/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */

import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getCurrentUser, signIn, signUp, signOut, onAuthStateChange } from './supabaseClient.js';

// Create the auth context
const AuthContext = createContext(null);

/**
 * AuthProvider component to wrap the application and provide auth state
 * @param {Object} props - Component props
 * @returns {JSX.Element} AuthProvider component
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    // Check for existing user session
    async function loadUser() {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      
      // Handle different auth events if needed
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
    });

    // Clean up subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /**
   * Sign in a user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { user: authUser, session } = await signIn(email, password);
      setUser(authUser);
      return { user: authUser, session };
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up a new user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   */
  const register = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { user: authUser, session } = await signUp(email, password);
      // Note: For email confirmation, the user might not be immediately available
      if (authUser) setUser(authUser);
      return { user: authUser, session };
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   */
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Value to be provided by the context
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the auth context
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
