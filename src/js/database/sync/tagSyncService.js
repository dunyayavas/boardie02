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
    
    if (!postId) {
      console.error('Invalid post ID provided to syncPostTags');
      return;
    }
    
    if (!localTags || !Array.isArray(localTags) || localTags.length === 0) {
      console.log('No local tags to sync for post:', postId);
      // If no tags, we should clear all existing tags for this post
      try {
        await relationService.associateTagsWithPost(postId, []);
        console.log('Cleared all tags for post with no tags');
      } catch (clearError) {
        console.error('Error clearing tags for post:', clearError);
      }
      return;
    }
    
    console.log('Local tags count:', localTags.length);
    console.log('Local tags:', JSON.stringify(localTags));
    
    // Process and normalize the local tags
    const normalizedTags = processTags(localTags);
    if (normalizedTags.length === 0) {
      console.log('No valid local tags to sync for post:', postId);
      return;
    }
    
    console.log('Normalized tags:', JSON.stringify(normalizedTags));
    
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
    
    // Check if any changes are needed
    if (localTagNames.size === cloudTagNames.size && 
        Array.from(localTagNames).every(name => cloudTagNames.has(name))) {
      console.log('Tags are already in sync, no changes needed');
      return;
    }
    
    // Create or get IDs for all tags
    const tagIdsToAssociate = [];
    
    for (const tag of normalizedTags) {
      const tagName = tag.name.toLowerCase();
      
      if (cloudTagsByName[tagName]) {
        // Tag exists in cloud, use its ID
        console.log(`Tag '${tag.name}' exists in cloud with ID: ${cloudTagsByName[tagName].id}`);
        tagIdsToAssociate.push(cloudTagsByName[tagName].id);
      } else {
        // Tag doesn't exist, create it
        try {
          console.log(`Creating new tag '${tag.name}' in Supabase`);
          const newTag = await tagService.createTag({
            name: tag.name,
            color: tag.color || '#cccccc'
          });
          
          if (newTag && newTag.id) {
            console.log(`Created tag '${tag.name}' with ID: ${newTag.id}`);
            cloudTagsByName[tagName] = newTag;
            tagIdsToAssociate.push(newTag.id);
          } else {
            console.error(`Failed to create tag '${tag.name}'`);
          }
        } catch (createError) {
          console.error(`Error creating tag '${tag.name}':`, createError);
        }
      }
    }
    
    // Associate all tags with the post in a single operation
    if (tagIdsToAssociate.length > 0) {
      console.log(`Associating ${tagIdsToAssociate.length} tags with post ${postId}:`, tagIdsToAssociate);
      try {
        const success = await relationService.associateTagsWithPost(postId, tagIdsToAssociate);
        if (success) {
          console.log('Successfully associated tags with post');
        } else {
          console.error('Failed to associate tags with post');
        }
      } catch (associateError) {
        console.error('Error associating tags with post:', associateError);
      }
    } else {
      console.log('No tags to associate with post');
      // Clear all tags if we have no tags to associate
      try {
        await relationService.associateTagsWithPost(postId, []);
        console.log('Cleared all tags for post');
      } catch (clearError) {
        console.error('Error clearing tags for post:', clearError);
      }
    }
    
    console.log('Post tags sync completed for post ID:', postId);
  } catch (error) {
    console.error('Error syncing post tags:', error);
    throw error; // Re-throw to allow proper error handling upstream
  }
}
