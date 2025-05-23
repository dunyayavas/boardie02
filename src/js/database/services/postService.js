/**
 * Post Service
 * Handles post-related database operations for the Boardie application
 */

import { supabase } from '../../auth/supabaseClient.js';

/**
 * Get all posts for the current user
 * @returns {Promise<Array>} Array of posts
 */
export async function getPosts() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        tags:post_tags(
          tag:tags(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('Error getting posts:', error);
    return [];
  }
}

/**
 * Get a single post by ID
 * @param {string} postId - The post ID
 * @returns {Promise<Object>} The post
 */
export async function getPostById(postId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        tags:post_tags(
          tag:tags(*)
        )
      `)
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
    
  } catch (error) {
    console.error('Error getting post by ID:', error);
    throw error;
  }
}

/**
 * Create a new post
 * @param {Object} post - The post data
 * @returns {Promise<Object>} The created post
 */
export async function createPost(post) {
  try {
    // Get the current user and session
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user) throw new Error('No user logged in');
    if (!session) throw new Error('No valid session found. Please log in again.');
    
    // Refresh the session if needed
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.log('Session expired, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        throw new Error('Session expired and could not be refreshed. Please log in again.');
      }
      console.log('Session refreshed successfully');
    }
    
    // Prepare post data for Supabase - only include fields that exist in the database schema
    // NOTE: embed_html and image_url fields have been removed as they don't exist in the Supabase schema
    const postData = {
      user_id: user.id,
      url: post.url,
      title: post.title || '',
      description: post.description || '',
      platform: post.platform || '',
      created_at: post.dateAdded || new Date().toISOString(),
      updated_at: post.lastUpdated || new Date().toISOString()
    };
    
    console.log('Creating new post with data:', postData);
    
    const { data, error } = await supabase
      .from('posts')
      .insert([postData])
      .select();
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Post creation returned no data');
    }
    
    console.log('Post created successfully with ID:', data[0].id);
    return data[0];
    
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Update a post
 * @param {string} postId - The post ID
 * @param {Object} postData - The post data to update
 * @returns {Promise<Object>} The updated post
 */
export async function updatePost(postId, postData) {
  try {
    // Get the current user and session
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user) throw new Error('No user logged in');
    if (!session) throw new Error('No valid session found. Please log in again.');
    
    // Refresh the session if needed
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.log('Session expired, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        throw new Error('Session expired and could not be refreshed. Please log in again.');
      }
      console.log('Session refreshed successfully');
    }
    
    // Verify post ownership
    const { data: existingPost, error: verifyError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();
    
    if (verifyError) {
      console.error('Error verifying post ownership:', verifyError);
      throw verifyError;
    }
    
    if (!existingPost) {
      throw new Error('Post not found or does not belong to user');
    }
    
    // Ensure user_id is included in the update data
    const updateData = {
      ...postData,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };
    
    console.log(`Updating post ${postId} with data:`, updateData);
    
    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select();
    
    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Post update returned no data');
    }
    
    return data[0];
    
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
}

/**
 * Delete a post
 * @param {string} postId - The post ID
 * @returns {Promise<void>}
 */
export async function deletePost(postId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // First delete associated post_tags
    const { error: tagError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId);
    
    if (tagError) throw tagError;
    
    // Then delete the post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Get posts by tag
 * @param {string} tagId - The tag ID
 * @returns {Promise<Array>} Array of posts with the specified tag
 */
export async function getPostsByTag(tagId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('post_tags')
      .select(`
        post:posts(*),
        tag:tags(*)
      `)
      .eq('tag_id', tagId)
      .eq('post.user_id', user.id);
    
    if (error) throw error;
    
    // Transform the data structure
    return data.map(item => ({
      ...item.post,
      tag: item.tag
    }));
    
  } catch (error) {
    console.error('Error getting posts by tag:', error);
    throw error;
  }
}

/**
 * Find a post by URL
 * @param {string} url - The URL to search for
 * @returns {Promise<Object>} Object containing data and error properties
 */
export async function findPostByUrl(url) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('url', url)
      .eq('user_id', user.id);
    
    return { data, error };
    
  } catch (error) {
    console.error('Error finding post by URL:', error);
    return { data: null, error };
  }
}
