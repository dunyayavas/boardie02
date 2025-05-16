/**
 * Sync Service
 * Handles synchronization between local storage and Supabase
 */

import { supabase } from '../auth/supabaseClient.js';
import * as supabaseService from './supabaseService.js';
import * as tagSyncService from './tagSyncService.js';
import { loadPosts, savePosts, loadTags, saveTags } from '../postManager.js';

// Track sync status
let isSyncing = false;
let lastSyncTime = null;

/**
 * Initialize the sync service
 * This should be called when a user logs in
 */
export async function initSyncService() {
  try {
    console.log('Initializing sync service...');
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, sync service not initialized');
      return;
    }
    
    console.log('User logged in, sync service initialized');
    
    // Start sync
    await syncData();
    
  } catch (error) {
    console.error('Error initializing sync service:', error);
  }
}

/**
 * Sync data between local storage and Supabase
 * @returns {Promise<void>}
 */
export async function syncData() {
  try {
    // Prevent multiple syncs from running at the same time
    if (isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }
    
    isSyncing = true;
    console.log('Starting sync process...', new Date().toISOString());
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, cannot sync');
      isSyncing = false;
      return;
    }
    
    console.log('User ID:', user.id);
    
    // Get local data for logging
    const localTags = await loadTags();
    const localPosts = await loadPosts();
    
    console.log('Local tags count:', localTags.length);
    console.log('Local posts count:', localPosts.length);
    
    if (localPosts.length > 0) {
      const samplePost = localPosts[0];
      console.log('Sample local post:', samplePost);
      console.log('Sample post tags:', samplePost.tags || []);
    }
    
    // First sync from local to cloud
    await syncLocalToCloud();
    
    // Then sync from cloud to local
    await syncCloudToLocal();
    
    // Update last sync time
    lastSyncTime = new Date();
    console.log('Sync completed successfully', lastSyncTime.toISOString());
    
    // Reset sync flag
    isSyncing = false;
    
  } catch (error) {
    console.error('Error syncing data:', error);
    isSyncing = false;
  }
}

/**
 * Sync data from local storage to Supabase
 * @returns {Promise<void>}
 */
async function syncLocalToCloud() {
  try {
    console.log('Syncing local data to cloud...');
    
    // Get local data
    const localPosts = await loadPosts();
    
    // Extract all unique tags from posts
    const allTagsFromPosts = [];
    localPosts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          // Process both string and object tags
          const normalizedTag = tagSyncService.normalizeTag(tag);
          if (normalizedTag && !allTagsFromPosts.some(t => t.name.toLowerCase() === normalizedTag.name.toLowerCase())) {
            allTagsFromPosts.push(normalizedTag);
          }
        });
      }
    });
    
    // Also get tags from the tags storage
    const localTags = await loadTags();
    
    // Combine both sources of tags, ensuring no duplicates
    const combinedTags = [...localTags];
    allTagsFromPosts.forEach(tag => {
      if (!combinedTags.some(t => t.name.toLowerCase() === tag.name.toLowerCase())) {
        combinedTags.push(tag);
      }
    });
    
    console.log('Local posts count:', localPosts.length);
    console.log('Combined tags count:', combinedTags.length);
    console.log('Tags from posts:', allTagsFromPosts.length);
    console.log('Tags from storage:', localTags.length);
    
    // Sync tags first (since posts may reference them)
    // This returns an updated map of cloud tags by name
    const cloudTagsByName = await tagSyncService.syncTagsToCloud(combinedTags);
    
    // Then sync posts using the updated cloudTagsByName map
    await syncPostsToCloud(localPosts, cloudTagsByName);
    
    console.log('Local to cloud sync completed');
    
  } catch (error) {
    console.error('Error syncing local to cloud:', error);
    throw error;
  }
}

/**
 * Sync posts from local storage to Supabase
 * @param {Array} localPosts - Array of local posts
 * @param {Object} cloudTagsByName - Map of cloud tags by name
 * @returns {Promise<void>}
 */
async function syncPostsToCloud(localPosts, cloudTagsByName) {
  try {
    console.log('Syncing posts to cloud, local posts count:', localPosts.length);
    
    // Get all posts from Supabase
    const cloudPosts = await supabaseService.getPosts();
    console.log('Cloud posts count:', cloudPosts.length);
    
    // Get all tags from Supabase
    const cloudTags = await supabaseService.getTags();
    console.log('Cloud tags count:', cloudTags.length);
    
    // Create a map of cloud posts by URL for easier lookup
    const cloudPostsByUrl = {};
    cloudPosts.forEach(post => {
      if (post && post.url) {
        cloudPostsByUrl[post.url] = post;
      }
    });
    
    // Process each local post
    for (const localPost of localPosts) {
      console.log('Processing post:', localPost.url);
      
      // If post exists in cloud, update it if needed
      if (cloudPostsByUrl[localPost.url]) {
        const cloudPost = cloudPostsByUrl[localPost.url];
        console.log('Post exists in cloud with ID:', cloudPost.id);
        
        // Check if update is needed (with null checks)
        const needsUpdate = 
          (localPost.title || null) !== (cloudPost.title || null) ||
          (localPost.description || null) !== (cloudPost.description || null) ||
          (localPost.platform || '') !== (cloudPost.platform || '');
        
        if (needsUpdate) {
          console.log('Post needs update, updating properties');
          await supabaseService.updatePost(cloudPost.id, {
            title: localPost.title,
            description: localPost.description,
            platform: localPost.platform
          });
        }
        
        // Check if post has tags
        if (localPost.tags && Array.isArray(localPost.tags) && localPost.tags.length > 0) {
          console.log('Post has tags, syncing tags for post');
          // Sync tags for this post using the new tagSyncService
          await tagSyncService.syncPostTags(cloudPost.id, localPost.tags, cloudTagsByName);
        } else {
          console.log('Post has no tags, skipping tag sync');
        }
      } 
      // If post doesn't exist in cloud, create it
      else {
        console.log('Post does not exist in cloud, creating new post');
        
        // Check if post has tags
        if (localPost.tags && Array.isArray(localPost.tags) && localPost.tags.length > 0) {
          console.log('New post has tags:', localPost.tags.length, JSON.stringify(localPost.tags));
          
          // Process tags using the new tagSyncService
          const tagObjects = tagSyncService.processTags(localPost.tags);
          
          // Only proceed if we have valid tag objects
          if (tagObjects.length > 0) {
            console.log('Processed tag objects for new post:', JSON.stringify(tagObjects));
            
            // Create tags first and get their IDs
            const tagIds = await tagSyncService.createTagsInSupabase(tagObjects);
            console.log('Created tags with IDs for post:', tagIds);
            
            // Create the post with the processed tag objects
            if (localPost && localPost.url) {
              console.log('Creating post in Supabase with tags:', localPost.url);
              try {
                // Create the post with tags
                const postToCreate = {
                  url: localPost.url,
                  platform: localPost.platform || '',
                  title: localPost.title || null,
                  description: localPost.description || null,
                  tags: tagObjects // Send the processed tag objects
                };
                
                console.log('Full post object being sent to createPost:', JSON.stringify(postToCreate));
                
                const newPost = await supabaseService.createPost(postToCreate);
                console.log('Successfully created post with ID:', newPost.id);
                
                // If tags were created but not associated, associate them now
                if (tagIds && tagIds.length > 0) {
                  console.log('Ensuring tags are associated with post:', tagIds);
                  await supabaseService.addTagsToPost(newPost.id, tagIds);
                }
              } catch (error) {
                console.error('Error creating post with tags:', error);
              }
            }
          } else {
            // Create post without tags if tag processing failed
            createPostWithoutTags(localPost);
          }
        } else {
          // Create post without tags
          console.log('New post has no tags');
          createPostWithoutTags(localPost);
        }
      }
    }
    
    console.log('Posts sync to cloud completed');
  } catch (error) {
    console.error('Error syncing posts to cloud:', error);
    throw error;
  }
}

/**
 * Helper function to create a post without tags
 * @param {Object} localPost - The local post to create
 * @returns {Promise<void>}
 */
async function createPostWithoutTags(localPost) {
  if (localPost && localPost.url) {
    console.log('Creating post in Supabase without tags:', localPost.url);
    try {
      const postToCreate = {
        url: localPost.url,
        platform: localPost.platform || '',
        title: localPost.title || null,
        description: localPost.description || null,
        tags: [] // Empty tags array
      };
      
      console.log('Post object without tags:', JSON.stringify(postToCreate));
      
      const newPost = await supabaseService.createPost(postToCreate);
      console.log('Successfully created post without tags, ID:', newPost.id);
    } catch (error) {
      console.error('Error creating post without tags:', error);
    }
  } else {
    console.warn('Skipping post with missing URL:', localPost);
  }
}

/**
 * Sync data from Supabase to local storage
 * @returns {Promise<void>}
 */
async function syncCloudToLocal() {
  try {
    console.log('Syncing cloud data to local...');
    
    // Get cloud data
    const cloudPosts = await supabaseService.getPosts();
    const cloudTags = await supabaseService.getTags();
    
    // Get local data
    const localPosts = await loadPosts();
    const localTags = await loadTags();
    
    // Create maps for easier lookup
    const localPostsByUrl = {};
    localPosts.forEach(post => {
      if (post && post.url) {
        localPostsByUrl[post.url] = post;
      }
    });
    
    const localTagsByName = {};
    localTags.forEach(tag => {
      if (tag && tag.name) {
        localTagsByName[tag.name.toLowerCase()] = tag;
      }
    });
    
    // Update local posts with cloud data
    const updatedPosts = [...localPosts];
    
    // Add new cloud posts to local
    cloudPosts.forEach(cloudPost => {
      if (!cloudPost || !cloudPost.url) return;
      
      const localPost = localPostsByUrl[cloudPost.url];
      
      if (!localPost) {
        // Post exists in cloud but not in local, add it
        const newLocalPost = {
          id: cloudPost.id,
          url: cloudPost.url,
          platform: cloudPost.platform || '',
          title: cloudPost.title || null,
          description: cloudPost.description || null,
          tags: [], // Will be populated below
          dateAdded: cloudPost.created_at || new Date().toISOString(),
          cloud_id: cloudPost.id,
          synced: true
        };
        
        updatedPosts.push(newLocalPost);
        localPostsByUrl[cloudPost.url] = newLocalPost;
      } else {
        // Post exists in both, update local with cloud data
        localPost.cloud_id = cloudPost.id;
        localPost.synced = true;
        
        // Only update these fields if they're different
        if ((localPost.title || null) !== (cloudPost.title || null)) {
          localPost.title = cloudPost.title;
        }
        
        if ((localPost.description || null) !== (cloudPost.description || null)) {
          localPost.description = cloudPost.description;
        }
        
        if ((localPost.platform || '') !== (cloudPost.platform || '')) {
          localPost.platform = cloudPost.platform;
        }
      }
    });
    
    // Sync tags for each post
    for (const cloudPost of cloudPosts) {
      if (!cloudPost || !cloudPost.id) continue;
      
      // Get tags for this post
      const postTags = await supabaseService.getPostTags(cloudPost.id);
      
      if (postTags && postTags.length > 0) {
        // Get the local post
        const localPost = localPostsByUrl[cloudPost.url];
        
        if (localPost) {
          // Create an array of tag objects
          const tagObjects = postTags.map(pt => {
            if (pt.tag) {
              return {
                id: pt.tag.id,
                name: pt.tag.name,
                color: pt.tag.color || '#cccccc'
              };
            }
            return null;
          }).filter(tag => tag !== null);
          
          // Update the local post's tags
          localPost.tags = tagObjects;
        }
      }
    }
    
    // Update local tags with cloud data
    const updatedTags = [...localTags];
    
    // Add new cloud tags to local
    cloudTags.forEach(cloudTag => {
      if (!cloudTag || !cloudTag.name) return;
      
      const localTag = localTagsByName[cloudTag.name.toLowerCase()];
      
      if (!localTag) {
        // Tag exists in cloud but not in local, add it
        updatedTags.push({
          id: cloudTag.id,
          name: cloudTag.name,
          color: cloudTag.color || '#cccccc'
        });
      } else {
        // Tag exists in both, update local with cloud data
        localTag.id = cloudTag.id;
        
        if (localTag.color !== cloudTag.color) {
          localTag.color = cloudTag.color;
        }
      }
    });
    
    // Save updated data to local storage
    await savePosts(updatedPosts);
    await saveTags(updatedTags);
    
    console.log('Cloud to local sync completed');
    
  } catch (error) {
    console.error('Error syncing cloud to local:', error);
    throw error;
  }
}

/**
 * Get the last sync time
 * @returns {Date|null} The last sync time or null if never synced
 */
export function getLastSyncTime() {
  return lastSyncTime;
}

/**
 * Check if a sync is currently in progress
 * @returns {boolean} True if syncing, false otherwise
 */
export function isSyncInProgress() {
  return isSyncing;
}

/**
 * Force a sync operation regardless of the current sync status
 * @returns {Promise<void>}
 */
export async function forceSync() {
  console.log('Forcing sync operation...');
  
  // Reset the sync flag to ensure we can start a new sync
  isSyncing = false;
  
  // Start the sync process
  await syncData();
  
  console.log('Forced sync completed');
}
