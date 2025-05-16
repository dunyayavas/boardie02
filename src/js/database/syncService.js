/**
 * Sync Service
 * Handles synchronization between local IndexedDB storage and Supabase
 */

import { supabase } from '../auth/supabaseClient.js';
import * as supabaseService from './supabaseService.js';
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
      console.log('No user logged in, skipping sync initialization');
      return;
    }
    
    // Set up real-time subscriptions for changes
    setupRealtimeSubscriptions();
    
    // Perform initial sync
    await syncData();
    
    // Set up periodic sync (every 5 minutes)
    setInterval(() => {
      if (!isSyncing) {
        syncData();
      }
    }, 5 * 60 * 1000);
    
    console.log('Sync service initialized');
    
  } catch (error) {
    console.error('Error initializing sync service:', error);
  }
}

/**
 * Set up real-time subscriptions for database changes
 */
function setupRealtimeSubscriptions() {
  // Subscribe to posts changes
  const postsSubscription = supabase
    .channel('public:posts')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'posts' 
    }, handlePostsChange)
    .subscribe();
  
  // Subscribe to tags changes
  const tagsSubscription = supabase
    .channel('public:tags')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'tags' 
    }, handleTagsChange)
    .subscribe();
  
  // Subscribe to post_tags changes
  const postTagsSubscription = supabase
    .channel('public:post_tags')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'post_tags' 
    }, handlePostTagsChange)
    .subscribe();
  
  console.log('Realtime subscriptions set up');
}

/**
 * Handle changes to posts table
 * @param {Object} payload - The change payload
 */
async function handlePostsChange(payload) {
  console.log('Posts change detected:', payload);
  
  // Skip if we're currently syncing to avoid loops
  if (isSyncing) return;
  
  // Refresh local posts data
  await syncPostsFromCloud();
}

/**
 * Handle changes to tags table
 * @param {Object} payload - The change payload
 */
async function handleTagsChange(payload) {
  console.log('Tags change detected:', payload);
  
  // Skip if we're currently syncing to avoid loops
  if (isSyncing) return;
  
  // Refresh local tags data
  await syncTagsFromCloud();
}

/**
 * Handle changes to post_tags table
 * @param {Object} payload - The change payload
 */
async function handlePostTagsChange(payload) {
  console.log('Post tags change detected:', payload);
  
  // Skip if we're currently syncing to avoid loops
  if (isSyncing) return;
  
  // Refresh local posts data (since tags have changed)
  await syncPostsFromCloud();
}

/**
 * Sync all data between local storage and Supabase
 * @returns {Promise<void>}
 */
export async function syncData() {
  try {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, skipping sync');
      return;
    }
    
    console.log('Starting data sync...');
    isSyncing = true;
    
    // First, sync from local to cloud (upload any offline changes)
    await syncLocalToCloud();
    
    // Then, sync from cloud to local (download any changes from other devices)
    await syncCloudToLocal();
    
    // Update last sync time
    lastSyncTime = new Date();
    console.log('Data sync completed at', lastSyncTime);
    
  } catch (error) {
    console.error('Error syncing data:', error);
  } finally {
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
    const localTags = await loadTags();
    
    // Sync tags first (since posts may reference them)
    await syncTagsToCloud(localTags);
    
    // Then sync posts
    await syncPostsToCloud(localPosts);
    
    console.log('Local to cloud sync completed');
    
  } catch (error) {
    console.error('Error syncing local to cloud:', error);
    throw error;
  }
}

/**
 * Sync tags from local storage to Supabase
 * @param {Array} localTags - Local tags data
 * @returns {Promise<void>}
 */
async function syncTagsToCloud(localTags) {
  try {
    // Get cloud tags
    const cloudTags = await supabaseService.getTags();
    
    // Create a map of cloud tags by name for quick lookup
    const cloudTagsByName = cloudTags.reduce((map, tag) => {
      map[tag.name.toLowerCase()] = tag;
      return map;
    }, {});
    
    // Process each local tag
    for (const localTag of localTags) {
      const tagName = localTag.name.toLowerCase();
      
      // If tag exists in cloud, update it if needed
      if (cloudTagsByName[tagName]) {
        const cloudTag = cloudTagsByName[tagName];
        
        // Check if update is needed
        if (localTag.color !== cloudTag.color) {
          await supabaseService.updateTag(cloudTag.id, {
            color: localTag.color
          });
        }
      } 
      // If tag doesn't exist in cloud, create it
      else {
        await supabaseService.createTag({
          name: localTag.name,
          color: localTag.color
        });
      }
    }
    
  } catch (error) {
    console.error('Error syncing tags to cloud:', error);
    throw error;
  }
}

/**
 * Sync posts from local storage to Supabase
 * @param {Array} localPosts - Local posts data
 * @returns {Promise<void>}
 */
async function syncPostsToCloud(localPosts) {
  try {
    // Get cloud posts
    const cloudPosts = await supabaseService.getPosts();
    
    // Create a map of cloud posts by URL for quick lookup
    const cloudPostsByUrl = cloudPosts.reduce((map, post) => {
      map[post.url] = post;
      return map;
    }, {});
    
    // Get cloud tags for reference
    const cloudTags = await supabaseService.getTags();
    const cloudTagsByName = cloudTags.reduce((map, tag) => {
      map[tag.name.toLowerCase()] = tag;
      return map;
    }, {});
    
    // Process each local post
    for (const localPost of localPosts) {
      // If post exists in cloud, update it if needed
      if (cloudPostsByUrl[localPost.url]) {
        const cloudPost = cloudPostsByUrl[localPost.url];
        
        // Check if update is needed
        const needsUpdate = 
          localPost.title !== cloudPost.title ||
          localPost.description !== cloudPost.description ||
          localPost.platform !== cloudPost.platform;
        
        if (needsUpdate) {
          await supabaseService.updatePost(cloudPost.id, {
            title: localPost.title,
            description: localPost.description,
            platform: localPost.platform
          });
        }
        
        // Sync tags for this post
        await syncPostTags(cloudPost.id, localPost.tags, cloudTagsByName);
      } 
      // If post doesn't exist in cloud, create it
      else {
        // Map local tags to cloud tags
        const tags = localPost.tags.map(localTag => {
          const cloudTag = cloudTagsByName[localTag.name.toLowerCase()];
          return cloudTag ? cloudTag.id : { name: localTag.name, color: localTag.color };
        });
        
        await supabaseService.createPost({
          url: localPost.url,
          platform: localPost.platform,
          title: localPost.title,
          description: localPost.description,
          tags: tags
        });
      }
    }
    
  } catch (error) {
    console.error('Error syncing posts to cloud:', error);
    throw error;
  }
}

/**
 * Sync tags for a specific post
 * @param {string} postId - The post ID
 * @param {Array} localTags - Local tags for the post
 * @param {Object} cloudTagsByName - Map of cloud tags by name
 * @returns {Promise<void>}
 */
async function syncPostTags(postId, localTags, cloudTagsByName) {
  try {
    // Get current post with tags
    const post = await supabaseService.getPostById(postId);
    const cloudTags = post.tags || [];
    
    // Create sets of tag names for comparison
    const localTagNames = new Set(localTags.map(tag => tag.name.toLowerCase()));
    const cloudTagNames = new Set(cloudTags.map(tag => tag.name.toLowerCase()));
    
    // Find tags to add and remove
    const tagsToAdd = localTags.filter(tag => !cloudTagNames.has(tag.name.toLowerCase()));
    const tagsToRemove = cloudTags.filter(tag => !localTagNames.has(tag.name.toLowerCase()));
    
    // If there are changes, update the post tags
    if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
      // Map local tags to cloud tag IDs
      const tagIds = localTags.map(localTag => {
        const cloudTag = cloudTagsByName[localTag.name.toLowerCase()];
        return cloudTag ? cloudTag.id : { name: localTag.name, color: localTag.color };
      });
      
      // Update the post with new tags
      await supabaseService.updatePost(postId, { tags: tagIds });
    }
    
  } catch (error) {
    console.error('Error syncing post tags:', error);
    throw error;
  }
}

/**
 * Sync data from Supabase to local storage
 * @returns {Promise<void>}
 */
async function syncCloudToLocal() {
  try {
    console.log('Syncing cloud data to local...');
    
    // Sync tags first
    await syncTagsFromCloud();
    
    // Then sync posts
    await syncPostsFromCloud();
    
    console.log('Cloud to local sync completed');
    
  } catch (error) {
    console.error('Error syncing cloud to local:', error);
    throw error;
  }
}

/**
 * Sync tags from Supabase to local storage
 * @returns {Promise<void>}
 */
async function syncTagsFromCloud() {
  try {
    // Get cloud tags
    const cloudTags = await supabaseService.getTags();
    
    // Get local tags
    const localTags = await loadTags();
    
    // Create a map of local tags by name for quick lookup
    const localTagsByName = localTags.reduce((map, tag) => {
      map[tag.name.toLowerCase()] = tag;
      return map;
    }, {});
    
    // Merge cloud tags with local tags
    const mergedTags = [...localTags];
    
    // Add or update tags from cloud
    for (const cloudTag of cloudTags) {
      const tagName = cloudTag.name.toLowerCase();
      
      // If tag exists locally, update it if needed
      if (localTagsByName[tagName]) {
        const localTag = localTagsByName[tagName];
        const localIndex = mergedTags.findIndex(tag => tag.name.toLowerCase() === tagName);
        
        // Update if different
        if (localTag.color !== cloudTag.color) {
          mergedTags[localIndex] = {
            ...localTag,
            color: cloudTag.color,
            id: cloudTag.id // Store the cloud ID for future reference
          };
        } else {
          // Just store the ID
          mergedTags[localIndex].id = cloudTag.id;
        }
      } 
      // If tag doesn't exist locally, add it
      else {
        mergedTags.push({
          name: cloudTag.name,
          color: cloudTag.color,
          id: cloudTag.id
        });
      }
    }
    
    // Save merged tags to local storage
    await saveTags(mergedTags);
    
  } catch (error) {
    console.error('Error syncing tags from cloud:', error);
    throw error;
  }
}

/**
 * Sync posts from Supabase to local storage
 * @returns {Promise<void>}
 */
async function syncPostsFromCloud() {
  try {
    // Get cloud posts with their tags
    const cloudPosts = await supabaseService.getPosts();
    
    // Get local posts
    const localPosts = await loadPosts();
    
    // Create a map of local posts by URL for quick lookup
    const localPostsByUrl = localPosts.reduce((map, post) => {
      map[post.url] = post;
      return map;
    }, {});
    
    // Merge cloud posts with local posts
    const mergedPosts = [...localPosts];
    
    // Add or update posts from cloud
    for (const cloudPost of cloudPosts) {
      // If post exists locally, update it if needed
      if (localPostsByUrl[cloudPost.url]) {
        const localPost = localPostsByUrl[cloudPost.url];
        const localIndex = mergedPosts.findIndex(post => post.url === cloudPost.url);
        
        // Check if update is needed
        const needsUpdate = 
          localPost.title !== cloudPost.title ||
          localPost.description !== cloudPost.description ||
          localPost.platform !== cloudPost.platform ||
          !areTagsEqual(localPost.tags, cloudPost.tags);
        
        if (needsUpdate) {
          mergedPosts[localIndex] = {
            ...localPost,
            title: cloudPost.title,
            description: cloudPost.description,
            platform: cloudPost.platform,
            tags: cloudPost.tags.map(tag => ({
              name: tag.name,
              color: tag.color,
              id: tag.id
            })),
            id: cloudPost.id // Store the cloud ID for future reference
          };
        } else {
          // Just store the ID
          mergedPosts[localIndex].id = cloudPost.id;
        }
      } 
      // If post doesn't exist locally, add it
      else {
        mergedPosts.push({
          url: cloudPost.url,
          platform: cloudPost.platform,
          title: cloudPost.title,
          description: cloudPost.description,
          tags: cloudPost.tags.map(tag => ({
            name: tag.name,
            color: tag.color,
            id: tag.id
          })),
          id: cloudPost.id,
          createdAt: new Date(cloudPost.created_at).getTime()
        });
      }
    }
    
    // Save merged posts to local storage
    await savePosts(mergedPosts);
    
    // Dispatch an event to notify the UI that posts have been updated
    window.dispatchEvent(new CustomEvent('postsUpdated'));
    
  } catch (error) {
    console.error('Error syncing posts from cloud:', error);
    throw error;
  }
}

/**
 * Compare two arrays of tags for equality
 * @param {Array} tags1 - First array of tags
 * @param {Array} tags2 - Second array of tags
 * @returns {boolean} True if tag arrays are equal
 */
function areTagsEqual(tags1, tags2) {
  if (!tags1 || !tags2) return false;
  if (tags1.length !== tags2.length) return false;
  
  // Create sets of tag names for comparison
  const names1 = new Set(tags1.map(tag => tag.name.toLowerCase()));
  const names2 = new Set(tags2.map(tag => tag.name.toLowerCase()));
  
  // Check if every tag in tags1 is in tags2
  for (const name of names1) {
    if (!names2.has(name)) return false;
  }
  
  // Check if every tag in tags2 is in tags1
  for (const name of names2) {
    if (!names1.has(name)) return false;
  }
  
  return true;
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
 * @returns {boolean} True if syncing
 */
export function isSyncInProgress() {
  return isSyncing;
}

/**
 * Force a manual sync
 * @returns {Promise<void>}
 */
export async function forceSync() {
  if (isSyncing) {
    console.log('Sync already in progress, skipping');
    return;
  }
  
  return syncData();
}
