/**
 * Supabase Client
 * This file initializes the Supabase client with your project credentials
 */

import { createClient } from '@supabase/supabase-js';

// Supabase URL and anon key
const supabaseUrl = 'https://fvbafecdoqslcvmyxqjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YmFmZWNkb3FzbGN2bXl4cWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDg3MjYsImV4cCI6MjA1OTUyNDcyNn0.TfhLP9BBhokuAPVaxFQy4dg-MvZlsJDquVFPF-OWjOM';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if the user is currently logged in
 * @returns {Promise<Object|null>} The current user or null if not logged in
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 * @returns {Promise<Object|null>} The current session or null if not logged in
 */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Result of the sign up operation
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Result of the sign in operation
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Reset password for a user
 * @param {string} email - User's email
 * @returns {Promise<Object>} Result of the password reset operation
 */
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Update the current user's password
 * @param {string} password - New password
 * @returns {Promise<Object>} Result of the password update operation
 */
export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Set up auth state change listener
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  
  return data.subscription.unsubscribe;
}
