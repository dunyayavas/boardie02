/**
 * Relation Service
 * Handles relationship operations between entities (posts and tags)
 */

import { supabase } from '../../auth/supabaseClient.js';

/**
 * Get tags associated with a post
 * @param {string} postId - ID of the post
 * @returns {Promise<Array>} Array of post_tags entries with tag data
 */
export async function getPostTags(postId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('post_tags')
      .select(`
        *,
        tag:tags(*)
      `)
      .eq('post_id', postId);
    
    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('Error getting post tags:', error);
    return [];
  }
}

/**
 * Get all post_tags associations for the current user
 * @returns {Promise<Array>} Array of all post_tags entries
 */
export async function getAllPostTags() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('post_tags')
      .select(`
        *,
        post:posts!inner(*),
        tag:tags!inner(*)
      `)
      .eq('post.user_id', user.id);
    
    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('Error getting all post tags:', error);
    return [];
  }
}

/**
 * Add tags to a post
 * @param {string} postId - ID of the post
 * @param {Array} tagIds - Array of tag IDs
 * @returns {Promise<boolean>} Success status
 */
export async function addTagsToPost(postId, tagIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Filter out any null or undefined tag IDs
    const validTagIds = (tagIds || []).filter(id => id !== null && id !== undefined);
    
    if (validTagIds.length === 0) {
      console.log('No valid tag IDs to add');
      return false;
    }
    
    // Verify the post exists and belongs to the user
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();
    
    if (postError) {
      console.error('Error verifying post ownership:', postError);
      throw postError;
    }
    
    if (!postData) {
      console.error('Post not found or does not belong to user');
      return false;
    }
    
    // Create post_tags entries
    const postTags = validTagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }));
    
    const { error } = await supabase
      .from('post_tags')
      .insert(postTags);
    
    if (error) {
      console.error('Error adding tags to post:', error);
      throw error;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in addTagsToPost:', error);
    throw error;
  }
}

/**
 * Remove tags from a post
 * @param {string} postId - ID of the post
 * @param {Array} tagIds - Array of tag IDs
 * @returns {Promise<boolean>} Success status
 */
export async function removeTagsFromPost(postId, tagIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Filter out any null or undefined tag IDs
    const validTagIds = (tagIds || []).filter(id => id !== null && id !== undefined);
    
    if (validTagIds.length === 0) {
      console.log('No valid tag IDs to remove');
      return false;
    }
    
    // Verify the post exists and belongs to the user
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();
    
    if (postError) {
      console.error('Error verifying post ownership:', postError);
      throw postError;
    }
    
    if (!postData) {
      console.error('Post not found or does not belong to user');
      return false;
    }
    
    // Remove post_tags entries
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .in('tag_id', validTagIds);
    
    if (error) {
      console.error('Error removing tags from post:', error);
      throw error;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in removeTagsFromPost:', error);
    throw error;
  }
}

/**
 * Associate tags with a post directly (replaces all existing associations)
 * @param {string} postId - The post ID
 * @param {Array} tagIds - Array of tag IDs
 * @returns {Promise<boolean>} Success status
 */
export async function associateTagsWithPost(postId, tagIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Filter out any null or undefined tag IDs
    const validTagIds = (tagIds || []).filter(id => id !== null && id !== undefined);
    
    if (!postId || validTagIds.length === 0) {
      console.log('No valid post ID or tag IDs to associate');
      return false;
    }
    
    // Verify the post exists and belongs to the user
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();
    
    if (postError) {
      console.error('Error verifying post ownership:', postError);
      throw postError;
    }
    
    if (!postData) {
      console.error('Post not found or does not belong to user');
      return false;
    }
    
    // Create post_tags entries
    const postTags = validTagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }));
    
    // First, remove existing associations
    const { error: deleteError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId);
    
    if (deleteError) {
      console.error('Error removing existing post_tags:', deleteError);
      throw deleteError;
    }
    
    // Then create new associations
    const { error } = await supabase
      .from('post_tags')
      .insert(postTags);
    
    if (error) {
      console.error('Error inserting post_tags:', error);
      throw error;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in associateTagsWithPost:', error);
    throw error;
  }
}
