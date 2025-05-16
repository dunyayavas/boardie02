/**
 * Tag Synchronization Service
 * Handles all tag-related synchronization between local storage and Supabase
 */

import * as supabaseService from './supabaseService.js';

/**
 * Convert tag data to a standardized tag object format
 * @param {Object|string} tag - Tag data (either object or string)
 * @returns {Object|null} - Standardized tag object or null if invalid
 */
export function normalizeTag(tag) {
  if (typeof tag === 'object' && tag !== null && tag.name) {
    // It's already a tag object
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
}

/**
 * Process an array of tags and convert them to standardized tag objects
 * @param {Array} tags - Array of tag data (objects or strings)
 * @returns {Array} - Array of standardized tag objects
 */
export function processTags(tags) {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }
  
  console.log('Processing tags:', JSON.stringify(tags));
  console.log('Tags types:', tags.map(tag => typeof tag));
  
  const tagObjects = [];
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    console.log(`Processing tag ${i}:`, tag, 'Type:', typeof tag);
    
    const normalizedTag = normalizeTag(tag);
    if (normalizedTag) {
      tagObjects.push(normalizedTag);
    }
  }
  
  console.log('Normalized tag objects:', tagObjects.length, JSON.stringify(tagObjects));
  return tagObjects;
}

/**
 * Create tags in Supabase
 * @param {Array} tagObjects - Array of tag objects to create
 * @returns {Promise<Array>} - Array of created tag IDs
 */
export async function createTagsInSupabase(tagObjects) {
  if (!tagObjects || tagObjects.length === 0) {
    return [];
  }
  
  try {
    console.log('Creating tags in Supabase:', JSON.stringify(tagObjects));
    const tagIds = await supabaseService.createTags(tagObjects);
    console.log('Created tags with IDs:', tagIds);
    return tagIds;
  } catch (error) {
    console.error('Error creating tags in Supabase:', error);
    return [];
  }
}

/**
 * Sync tags from local storage to Supabase
 * @param {Array} localTags - Array of local tags
 * @returns {Promise<Object>} - Map of cloud tags by name
 */
export async function syncTagsToCloud(localTags) {
  try {
    console.log('Syncing tags to cloud, local tags count:', localTags.length);
    
    // Get all tags from Supabase
    const cloudTags = await supabaseService.getTags();
    console.log('Cloud tags count:', cloudTags.length);
    
    // Create a map of cloud tags by name (lowercase for case-insensitive comparison)
    const cloudTagsByName = {};
    cloudTags.forEach(tag => {
      if (tag && tag.name) {
        cloudTagsByName[tag.name.toLowerCase()] = tag;
      }
    });
    
    // Find tags that exist in local but not in cloud
    const tagsToCreate = [];
    localTags.forEach(localTag => {
      if (localTag && localTag.name) {
        const normalizedTag = normalizeTag(localTag);
        if (normalizedTag && !cloudTagsByName[normalizedTag.name.toLowerCase()]) {
          tagsToCreate.push(normalizedTag);
        }
      }
    });
    
    // Create missing tags in Supabase
    if (tagsToCreate.length > 0) {
      console.log('Creating missing tags in cloud:', tagsToCreate.length);
      
      const createdTags = await Promise.all(
        tagsToCreate.map(async tag => {
          try {
            const newTag = await supabaseService.createTag(tag);
            if (newTag && newTag.id) {
              cloudTagsByName[tag.name.toLowerCase()] = newTag;
              return newTag;
            }
            return null;
          } catch (error) {
            console.error('Error creating tag:', error);
            return null;
          }
        })
      );
      
      console.log('Created tags count:', createdTags.filter(tag => tag !== null).length);
    } else {
      console.log('No new tags to create in cloud');
    }
    
    console.log('Tags sync to cloud completed');
    return cloudTagsByName;
  } catch (error) {
    console.error('Error syncing tags to cloud:', error);
    throw error;
  }
}

/**
 * Sync tags for a specific post
 * @param {string} postId - ID of the post
 * @param {Array} localTags - Array of local tags for the post
 * @param {Object} cloudTagsByName - Map of cloud tags by name
 * @returns {Promise<void>}
 */
export async function syncPostTags(postId, localTags, cloudTagsByName) {
  try {
    console.log('syncPostTags called for post ID:', postId);
    
    if (!localTags || !Array.isArray(localTags) || localTags.length === 0) {
      console.log('No local tags to sync for post:', postId);
      return;
    }
    
    console.log('Local tags count:', localTags.length);
    
    // Process and normalize the local tags
    const normalizedTags = processTags(localTags);
    if (normalizedTags.length === 0) {
      console.log('No valid local tags to sync for post:', postId);
      return;
    }
    
    // Get existing tags for this post from Supabase
    const existingPostTags = await supabaseService.getPostTags(postId);
    console.log('Existing post tags count:', existingPostTags.length);
    
    // Create sets of tag names for easier comparison
    const localTagNames = new Set(normalizedTags.map(tag => tag.name.toLowerCase()));
    const cloudTagNames = new Set(existingPostTags.map(pt => 
      pt.tag && pt.tag.name ? pt.tag.name.toLowerCase() : null
    ).filter(name => name !== null));
    
    console.log('Local tag names:', Array.from(localTagNames));
    console.log('Cloud tag names:', Array.from(cloudTagNames));
    
    // Find tags to add (in local but not in cloud)
    const tagsToAdd = normalizedTags.filter(tag => 
      !cloudTagNames.has(tag.name.toLowerCase())
    );
    
    // Find tags to remove (in cloud but not in local)
    const tagsToRemove = existingPostTags.filter(pt => 
      pt.tag && pt.tag.name && !localTagNames.has(pt.tag.name.toLowerCase())
    );
    
    console.log('Tags to add count:', tagsToAdd.length);
    console.log('Tags to remove count:', tagsToRemove.length);
    
    // Add new tags to the post
    if (tagsToAdd.length > 0) {
      // First ensure all tags exist in the cloud
      for (const tagToAdd of tagsToAdd) {
        if (!cloudTagsByName[tagToAdd.name.toLowerCase()]) {
          // Create the tag in Supabase
          try {
            const newTag = await supabaseService.createTag(tagToAdd);
            if (newTag && newTag.id) {
              cloudTagsByName[tagToAdd.name.toLowerCase()] = newTag;
            }
          } catch (error) {
            console.error('Error creating tag:', error);
          }
        }
      }
      
      // Now associate tags with the post
      const tagIdsToAdd = tagsToAdd.map(tag => {
        const cloudTag = cloudTagsByName[tag.name.toLowerCase()];
        return cloudTag ? cloudTag.id : null;
      }).filter(id => id !== null);
      
      if (tagIdsToAdd.length > 0) {
        console.log('Adding tag IDs to post:', tagIdsToAdd);
        await supabaseService.addTagsToPost(postId, tagIdsToAdd);
      }
    }
    
    // Remove tags from the post
    if (tagsToRemove.length > 0) {
      const tagIdsToRemove = tagsToRemove.map(pt => pt.tag_id).filter(id => id !== null);
      
      if (tagIdsToRemove.length > 0) {
        console.log('Removing tag IDs from post:', tagIdsToRemove);
        await supabaseService.removeTagsFromPost(postId, tagIdsToRemove);
      }
    }
    
    console.log('Post tags sync completed for post ID:', postId);
  } catch (error) {
    console.error('Error syncing post tags:', error);
  }
}
