/**
 * Tag Sync Service
 * Handles synchronization of tags between local storage and Supabase
 */

import { loadTags, saveTags } from '../../postManager.js';
import * as tagService from '../services/tagService.js';
import * as relationService from '../services/relationService.js';
import syncState from './syncState.js';
import { createTagMapByName } from './syncUtils.js';

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
    const tagIds = await tagService.createTags(tagObjects);
    console.log('Created tags with IDs:', tagIds);
    return tagIds;
  } catch (error) {
    console.error('Error creating tags in Supabase:', error);
    return [];
  }
}

/**
 * Sync tags from local storage to Supabase
 * @param {Array} localPosts - Array of local posts to extract tags from
 * @returns {Promise<Object>} - Map of cloud tags by name
 */
export async function syncTagsToCloud(localPosts) {
  try {
    console.log('Syncing tags to cloud');
    
    // Get local tags
    const localTags = loadTags();
    console.log('Local tags count:', localTags.length);
    
    // Get all tags from Supabase
    const cloudTags = await tagService.getTags();
    console.log('Cloud tags count:', cloudTags.length);
    
    // Create a map of cloud tags by name (lowercase for case-insensitive comparison)
    const cloudTagsByName = createTagMapByName(cloudTags);
    
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
            const newTag = await tagService.createTag(tag);
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
    
    // Update local tags with cloud IDs
    const updatedLocalTags = localTags.map(localTag => {
      if (localTag && localTag.name) {
        const cloudTag = cloudTagsByName[localTag.name.toLowerCase()];
        if (cloudTag && cloudTag.id) {
          return {
            ...localTag,
            id: cloudTag.id
          };
        }
      }
      return localTag;
    });
    
    // Save updated local tags
    saveTags(updatedLocalTags);
    
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
    const existingPostTags = await relationService.getPostTags(postId);
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
      console.log('Processing tags to add:', JSON.stringify(tagsToAdd));
      
      // First create all tags that don't exist yet
      const createdTags = [];
      for (const tagToAdd of tagsToAdd) {
        if (!cloudTagsByName[tagToAdd.name.toLowerCase()]) {
          // Create the tag in Supabase
          try {
            console.log('Creating new tag in Supabase:', tagToAdd.name);
            const newTag = await tagService.createTag(tagToAdd);
            if (newTag && newTag.id) {
              console.log('Successfully created tag with ID:', newTag.id);
              cloudTagsByName[tagToAdd.name.toLowerCase()] = newTag;
              createdTags.push(newTag);
            }
          } catch (error) {
            console.error('Error creating tag:', error);
          }
        } else {
          console.log('Tag already exists in cloud:', tagToAdd.name);
          createdTags.push(cloudTagsByName[tagToAdd.name.toLowerCase()]);
        }
      }
      
      // Now associate tags with the post
      const tagIdsToAdd = createdTags.map(tag => tag.id).filter(id => id !== null);
      
      if (tagIdsToAdd.length > 0) {
        console.log('Adding tag IDs to post:', tagIdsToAdd);
        try {
          const success = await relationService.addTagsToPost(postId, tagIdsToAdd);
          if (success) {
            console.log('Successfully added tags to post');
          } else {
            console.error('Failed to add tags to post');
          }
        } catch (error) {
          console.error('Error adding tags to post:', error);
        }
      }
    }
    
    // Remove tags from the post
    if (tagsToRemove.length > 0) {
      const tagIdsToRemove = tagsToRemove.map(pt => pt.tag_id).filter(id => id !== null);
      
      if (tagIdsToRemove.length > 0) {
        console.log('Removing tag IDs from post:', tagIdsToRemove);
        await relationService.removeTagsFromPost(postId, tagIdsToRemove);
      }
    }
    
    console.log('Post tags sync completed for post ID:', postId);
  } catch (error) {
    console.error('Error syncing post tags:', error);
  }
}
