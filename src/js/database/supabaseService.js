/**
 * Supabase Database Service
 * Handles database operations for the Boardie application
 */

import { supabase } from '../auth/supabaseClient.js';

/**
 * Create database tables if they don't exist
 * This should be run once when the app initializes
 */
export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // The tables should be created in the Supabase dashboard
    // This function can be used to verify the tables exist
    
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
    
    // Log any errors (tables might not exist yet)
    if (profilesError) console.warn('Profiles table check:', profilesError.message);
    if (postsError) console.warn('Posts table check:', postsError.message);
    if (tagsError) console.warn('Tags table check:', tagsError.message);
    if (postTagsError) console.warn('Post_tags table check:', postTagsError.message);
    
    return {
      profilesExists: !profilesError,
      postsExists: !postsError,
      tagsExists: !tagsError,
      postTagsExists: !postTagsError
    };
    
  } catch (error) {
    console.error('Error initializing database:', error);
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

// Posts CRUD operations

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
    
    // Transform the nested structure to a more usable format
    return data.map(post => ({
      ...post,
      tags: post.tags.map(tagRel => tagRel.tag)
    }));
    
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
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
    
    // Transform the nested structure
    return {
      ...data,
      tags: data.tags.map(tagRel => tagRel.tag)
    };
    
  } catch (error) {
    console.error('Error getting post:', error);
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Create the post
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          url: post.url,
          platform: post.platform,
          title: post.title || null,
          description: post.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    
    const newPost = data[0];
    
    // If post has tags, add them
    if (post.tags && post.tags.length > 0) {
      await addTagsToPost(newPost.id, post.tags);
    }
    
    return newPost;
    
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Update the post
    const { data, error } = await supabase
      .from('posts')
      .update({
        ...postData,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', user.id)
      .select();
    
    if (error) throw error;
    
    // If tags were provided, update them
    if (postData.tags) {
      // First remove all existing tag associations
      await supabase
        .from('post_tags')
        .delete()
        .eq('post_id', postId);
      
      // Then add the new tags
      await addTagsToPost(postId, postData.tags);
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
    
    // Delete the post (post_tags will be deleted automatically via cascade)
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

// Tags CRUD operations

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
      .eq('user_id', user.id)
      .order('name');
    
    if (error) throw error;
    return data;
    
  } catch (error) {
    console.error('Error getting tags:', error);
    throw error;
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
      .insert([
        {
          user_id: user.id,
          name: tag.name,
          color: tag.color || null
        }
      ])
      .select();
    
    if (error) throw error;
    return data[0];
    
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
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
    
    // First delete all post_tag associations
    await supabase
      .from('post_tags')
      .delete()
      .eq('tag_id', tagId);
    
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

/**
 * Add tags to a post
 * @param {string} postId - The post ID
 * @param {Array} tags - Array of tag objects or tag IDs
 * @returns {Promise<void>}
 */
async function addTagsToPost(postId, tags) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Process tags - they could be objects with name/id or just IDs
    const tagIds = await Promise.all(tags.map(async (tag) => {
      // If tag is an object with an id, use that
      if (typeof tag === 'object' && tag.id) {
        return tag.id;
      }
      
      // If tag is an object with a name but no id, create it
      if (typeof tag === 'object' && tag.name) {
        // Check if tag already exists
        const { data: existingTags, error: findError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tag.name)
          .eq('user_id', user.id);
        
        if (findError) throw findError;
        
        // If tag exists, use its ID
        if (existingTags.length > 0) {
          return existingTags[0].id;
        }
        
        // Otherwise create a new tag
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert([
            {
              user_id: user.id,
              name: tag.name,
              color: tag.color || null
            }
          ])
          .select();
        
        if (createError) throw createError;
        return newTag[0].id;
      }
      
      // If tag is a string (ID), use it directly
      return tag;
    }));
    
    // Create post_tags entries
    const postTags = tagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }));
    
    const { error } = await supabase
      .from('post_tags')
      .insert(postTags);
    
    if (error) throw error;
    
  } catch (error) {
    console.error('Error adding tags to post:', error);
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
