/**
 * Tag Service
 * Handles tag-related database operations for the Boardie application
 */

import { supabase } from '../../auth/supabaseClient.js';

/**
 * Get all tags for the current user
 * @returns {Promise<Array>} Array of tags
 */
export async function getTags() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

/**
 * Create a new tag
 * @param {Object} tag - The tag data
 * @returns {Promise<Object>} The created tag
 */
export async function createTag(tag) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('tags')
      .insert([{
        user_id: user.id,
        name: tag.name,
        color: tag.color || '#cccccc'
      }])
      .select();
    
    if (error) throw error;
    return data[0];
    
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Create multiple tags at once
 * @param {Array} tagObjects - Array of tag objects with name and color
 * @returns {Promise<Array>} Array of created tag IDs
 */
export async function createTags(tagObjects) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    if (!tagObjects || tagObjects.length === 0) {
      return [];
    }
    
    // Filter out invalid tag objects
    const validTagObjects = tagObjects.filter(tag => 
      tag && typeof tag === 'object' && tag.name
    );
    
    if (validTagObjects.length === 0) {
      return [];
    }
    
    // Prepare tags for insertion
    const tagsToInsert = validTagObjects.map(tag => ({
      user_id: user.id,
      name: tag.name,
      color: tag.color || '#cccccc'
    }));
    
    // Insert tags
    const { data, error } = await supabase
      .from('tags')
      .insert(tagsToInsert)
      .select();
    
    if (error) throw error;
    
    // Return array of tag IDs
    return data.map(tag => tag.id);
    
  } catch (error) {
    console.error('Error creating tags:', error);
    return [];
  }
}

/**
 * Update a tag
 * @param {string} tagId - The tag ID
 * @param {Object} tagData - The tag data to update
 * @returns {Promise<Object>} The updated tag
 */
export async function updateTag(tagId, tagData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('tags')
      .update(tagData)
      .eq('id', tagId)
      .eq('user_id', user.id)
      .select();
    
    if (error) throw error;
    return data[0];
    
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Delete a tag
 * @param {string} tagId - The tag ID
 * @returns {Promise<void>}
 */
export async function deleteTag(tagId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // First delete all post_tags associations
    const { error: postTagError } = await supabase
      .from('post_tags')
      .delete()
      .eq('tag_id', tagId);
    
    if (postTagError) throw postTagError;
    
    // Then delete the tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}
