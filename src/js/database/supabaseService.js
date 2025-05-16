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
    
    console.log('Creating post with data:', post);
    console.log('Tags received:', JSON.stringify(post.tags));
    
    // IMPORTANT: Process tags BEFORE creating the post
    let tagIdsToAssociate = [];
    
    // Check if post has tags and process them first
    if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
      console.log('Processing tags BEFORE creating post:', post.tags.length, 'tags');
      
      try {
        // Make a deep copy of the tags array to ensure it's not modified
        const tagsCopy = JSON.parse(JSON.stringify(post.tags));
        
        // Create tag objects from the tags array
        const tagObjects = tagsCopy.map(tag => {
          if (typeof tag === 'object' && tag.name) {
            // It's a tag object
            return {
              name: tag.name,
              color: tag.color || '#cccccc'
            };
          } else if (typeof tag === 'string') {
            // It's a string tag, convert to object
            return {
              name: tag,
              color: '#cccccc' // Default color
            };
          }
          return null;
        }).filter(tag => tag !== null);
        
        console.log('Tag objects to create:', tagObjects.length, JSON.stringify(tagObjects));
        
        // Create the tags first and get their IDs
        if (tagObjects.length > 0) {
          tagIdsToAssociate = await createTags(tagObjects);
          console.log('Created tags with IDs:', tagIdsToAssociate);
        }
      } catch (tagError) {
        console.error('Error processing tags before post creation:', tagError);
      }
    }
    
    // Now create the post
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
    
    if (error) {
      console.error('Error creating post:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No post data returned after creation');
      throw new Error('Failed to create post');
    }
    
    const newPost = data[0];
    console.log('Post created successfully:', newPost.id);
    
    // Associate the tags with the post if we have any
    if (tagIdsToAssociate.length > 0) {
      console.log('Associating tags with new post:', tagIdsToAssociate);
      
      try {
        // Directly create post_tags entries
        const postTags = tagIdsToAssociate.map(tagId => ({
          post_id: newPost.id,
          tag_id: tagId
          // post_tags table doesn't have user_id in the schema
        }));
        
        console.log('Creating post_tags entries directly:', JSON.stringify(postTags));
        
        // Use upsert to avoid conflicts
        const { data: postTagsData, error: postTagsError } = await supabase
          .from('post_tags')
          .upsert(postTags, { onConflict: 'post_id,tag_id' })
          .select();
        
        if (postTagsError) {
          console.error('Error creating post_tags:', postTagsError);
        } else {
          console.log('Successfully created post_tags directly:', JSON.stringify(postTagsData));
        }
      } catch (associateError) {
        console.error('Error associating tags with post:', associateError);
      }
    } else {
      console.log('No tags to associate with post');
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
      .select('*, tag:tags(*)')
      .eq('post_id', postId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting post tags:', error);
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
    
    // Create post_tags entries
    const postTags = tagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }));
    
    // Use upsert to avoid conflicts
    const { error } = await supabase
      .from('post_tags')
      .upsert(postTags, { onConflict: 'post_id,tag_id' });
    
    if (error) {
      console.error('Error adding tags to post:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error adding tags to post:', error);
    return false;
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
    
    // Delete post_tags entries
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .in('tag_id', tagIds);
    
    if (error) {
      console.error('Error removing tags from post:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error removing tags from post:', error);
    return false;
  }
}

export async function updatePost(postId, postData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Create update object with only the fields that are provided
    const updateObj = {};
    if (postData.url !== undefined) updateObj.url = postData.url;
    if (postData.platform !== undefined) updateObj.platform = postData.platform;
    if (postData.title !== undefined) updateObj.title = postData.title;
    if (postData.description !== undefined) updateObj.description = postData.description;
    updateObj.updated_at = new Date().toISOString();
    
    // Update the post
    const { data, error } = await supabase
      .from('posts')
      .update(updateObj)
      .eq('id', postId)
      .eq('user_id', user.id)
      .select();
    
    if (error) throw error;
    
    // If post has tags, update them using our direct functions
    if (postData.tags) {
      console.log('Updating tags for post:', postId, 'Tags count:', postData.tags.length);
      
      if (Array.isArray(postData.tags) && postData.tags.length > 0) {
        try {
          // Separate tag objects and tag IDs
          const tagObjects = [];
          const tagIds = [];
          
          postData.tags.forEach(tag => {
            if (typeof tag === 'string') {
              // It's a tag ID
              tagIds.push(tag);
            } else if (typeof tag === 'object') {
              if (tag.id) {
                // It's a tag object with an ID
                tagIds.push(tag.id);
              } else if (tag.name) {
                // It's a tag object without an ID
                tagObjects.push(tag);
              }
            }
          });
          
          console.log('Tag objects to create:', tagObjects.length);
          console.log('Existing tag IDs:', tagIds.length);
          
          // First create any new tags
          let newTagIds = [];
          if (tagObjects.length > 0) {
            newTagIds = await createTags(tagObjects);
            console.log('Created new tags with IDs:', newTagIds);
          }
          
          // Combine all tag IDs
          const allTagIds = [...tagIds, ...newTagIds].filter(id => id !== null);
          
          if (allTagIds.length > 0) {
            console.log('Associating tags with post:', allTagIds);
            const success = await associateTagsWithPost(postId, allTagIds);
            if (success) {
              console.log('Successfully updated tags for post');
            } else {
              console.warn('Failed to update tags for post');
            }
          } else {
            console.warn('No valid tag IDs to associate with post');
          }
        } catch (tagError) {
          console.error('Error updating tags for post:', tagError);
          // Don't throw here, we still want to return the updated post
        }
      } else {
        // If tags array is empty, remove all tags
        try {
          const { error: deleteError } = await supabase
            .from('post_tags')
            .delete()
            .eq('post_id', postId);
          
          if (deleteError) {
            console.error('Error removing all tags from post:', deleteError);
          } else {
            console.log('Successfully removed all tags from post');
          }
        } catch (error) {
          console.error('Error removing all tags from post:', error);
        }
      }
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
 * Create tags and return their IDs
 * @param {Array} tagObjects - Array of tag objects with name and color
 * @returns {Promise<Array>} Array of tag IDs
 */
export async function createTags(tagObjects) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Filter out invalid tags
    const validTags = (tagObjects || []).filter(tag => tag && tag.name);
    
    if (validTags.length === 0) {
      console.log('No valid tags to create');
      return [];
    }
    
    console.log('Creating tags:', validTags.map(t => t.name).join(', '));
    
    // Get existing tags to avoid duplicates
    const { data: existingTags, error: fetchError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.error('Error fetching existing tags:', fetchError);
      throw fetchError;
    }
    
    // Create a map of existing tags by name
    const existingTagMap = {};
    if (existingTags && existingTags.length > 0) {
      existingTags.forEach(tag => {
        if (tag.name) {
          existingTagMap[tag.name.toLowerCase()] = tag.id;
        }
      });
    }
    
    // Identify which tags need to be created
    const tagsToCreate = validTags.filter(tag => 
      !existingTagMap[tag.name.toLowerCase()]
    );
    
    // Create new tags if needed
    let newTagIds = [];
    if (tagsToCreate.length > 0) {
      const tagsForInsert = tagsToCreate.map(tag => ({
        user_id: user.id,
        name: tag.name,
        color: tag.color || '#cccccc'
      }));
      
      console.log('Inserting new tags:', tagsForInsert.length);
      
      const { data: createdTags, error: createError } = await supabase
        .from('tags')
        .insert(tagsForInsert)
        .select();
      
      if (createError) {
        console.error('Error creating tags:', createError);
        throw createError;
      }
      
      if (createdTags && createdTags.length > 0) {
        newTagIds = createdTags.map(tag => tag.id);
        console.log('Created tags with IDs:', newTagIds);
        
        // Update our map with the new tags
        createdTags.forEach(tag => {
          if (tag.name) {
            existingTagMap[tag.name.toLowerCase()] = tag.id;
          }
        });
      }
    }
    
    // Map all tag objects to their IDs (existing or newly created)
    const allTagIds = validTags.map(tag => {
      const tagId = existingTagMap[tag.name.toLowerCase()];
      if (tagId) {
        return tagId;
      }
      console.warn('Could not find ID for tag:', tag.name);
      return null;
    }).filter(id => id !== null);
    
    console.log('All tag IDs:', allTagIds);
    return allTagIds;
    
  } catch (error) {
    console.error('Error in createTags:', error);
    throw error;
  }
}

/**
 * Associate tags with a post directly
 * @param {string} postId - The post ID
 * @param {Array} tagIds - Array of tag IDs
 * @returns {Promise<boolean>} Success status
 */
export async function associateTagsWithPost(postId, tagIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    // Filter out any invalid tag IDs
    const validTagIds = (tagIds || []).filter(id => id && typeof id === 'string');
    
    if (!postId || validTagIds.length === 0) {
      console.log('No valid post ID or tag IDs to associate');
      return false;
    }
    
    console.log('Associating tags with post:', postId, 'Tag IDs:', validTagIds);
    
    // First, verify the post exists and belongs to the user
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
    const { data, error } = await supabase
      .from('post_tags')
      .insert(postTags);
    
    if (error) {
      console.error('Error inserting post_tags:', error);
      throw error;
    }
    
    console.log('Successfully associated tags with post');
    return true;
    
  } catch (error) {
    console.error('Error in associateTagsWithPost:', error);
    throw error;
  }
}

/**
 * Add tags to a post - creates tags if needed and associates them with the post
 * @param {string} postId - The post ID
 * @param {Array} tags - Array of tag objects or tag IDs
 * @returns {Promise<void>}
 */
async function addTagsToPost(postId, tags) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    console.log('Adding tags to post:', postId, 'Tags:', tags);
    
    // Filter out any null or undefined tags
    const validTags = (tags || []).filter(tag => tag !== null && tag !== undefined);
    
    if (validTags.length === 0) {
      console.log('No valid tags to add');
      return;
    }
    
    // Separate tag objects and tag IDs
    const tagObjects = [];
    const tagIds = [];
    
    validTags.forEach(tag => {
      if (typeof tag === 'string') {
        // It's a tag ID
        tagIds.push(tag);
      } else if (typeof tag === 'object') {
        if (tag.id) {
          // It's a tag object with an ID
          tagIds.push(tag.id);
        } else if (tag.name) {
          // It's a tag object without an ID
          tagObjects.push(tag);
        }
      }
    });
    
    // Create any new tags
    let newTagIds = [];
    if (tagObjects.length > 0) {
      newTagIds = await createTags(tagObjects);
    }
    
    // Combine all tag IDs
    const allTagIds = [...tagIds, ...newTagIds].filter(id => id !== null);
    
    if (allTagIds.length === 0) {
      console.log('No valid tag IDs to associate with post');
      return;
    }
    
    // Associate tags with the post
    await associateTagsWithPost(postId, allTagIds);
    
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
