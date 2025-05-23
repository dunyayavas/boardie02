/**
 * User Service
 * Handles user profile operations for the Boardie application
 */

import { supabase } from '../../auth/supabaseClient.js';

/**
 * Get the current user's profile
 * @returns {Promise<Object>} The user profile
 */
export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data;
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * Create a user profile after registration
 * @param {string} userId - The user's ID
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} The created profile
 */
export async function createUserProfile(userId, userData = {}) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username: userData.username || null,
          avatar_url: userData.avatar_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    return data[0];
    
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Update the user's profile
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} The updated profile
 */
export async function updateUserProfile(profileData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select();
    
    if (error) throw error;
    return data[0];
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Check if database tables exist
 * @returns {Promise<Object>} Object indicating which tables exist
 */
export async function checkDatabaseTables() {
  try {
    console.log('Checking database tables...');
    
    // Check if tables exist by querying them
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    const { error: postsError } = await supabase
      .from('posts')
      .select('id')
      .limit(1);
      
    const { error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .limit(1);
      
    const { error: postTagsError } = await supabase
      .from('post_tags')
      .select('post_id')
      .limit(1);
    
    return {
      profilesExists: !profilesError,
      postsExists: !postsError,
      tagsExists: !tagsError,
      postTagsExists: !postTagsError
    };
    
  } catch (error) {
    console.error('Error checking database tables:', error);
    throw error;
  }
}
