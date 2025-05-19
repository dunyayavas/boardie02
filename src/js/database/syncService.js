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

// Debounce settings
let syncDebounceTimer = null;
const SYNC_DEBOUNCE_DELAY = 2000; // 2 seconds delay

/**
 * Determine the sync direction based on comparing local and cloud data
 * @param {Array} localPosts - Posts from local storage
 * @param {Array} cloudPosts - Posts from Supabase
 * @returns {string} - Direction to sync: 'local-to-cloud', 'cloud-to-local', or 'in-sync'
 */
function determineSyncDirection(localPosts, cloudPosts) {
  // If no cloud posts, but we have local posts, sync local to cloud
  if (cloudPosts.length === 0 && localPosts.length > 0) {
    return 'local-to-cloud';
  }
  
  // If no local posts, but we have cloud posts, sync cloud to local
  if (localPosts.length === 0 && cloudPosts.length > 0) {
    return 'cloud-to-local';
  }
  
  // Compare the most recent update timestamps
  let newestLocalTime = 0;
  let newestCloudTime = 0;
  
  // Find the newest local post timestamp
  localPosts.forEach(post => {
    const postTime = post.lastUpdated ? new Date(post.lastUpdated).getTime() : 
                    post.dateAdded ? new Date(post.dateAdded).getTime() : 0;
    if (postTime > newestLocalTime) {
      newestLocalTime = postTime;
    }
  });
  
  // Find the newest cloud post timestamp
  cloudPosts.forEach(post => {
    const postTime = post.updated_at ? new Date(post.updated_at).getTime() : 
                    post.created_at ? new Date(post.created_at).getTime() : 0;
    if (postTime > newestCloudTime) {
      newestCloudTime = postTime;
    }
  });
  
  console.log(`Newest local timestamp: ${new Date(newestLocalTime).toISOString()}`);
  console.log(`Newest cloud timestamp: ${new Date(newestCloudTime).toISOString()}`);
  
  // Determine which is newer with a small threshold to account for timestamp differences
  const TIME_THRESHOLD = 5000; // 5 seconds
  
  if (newestLocalTime > newestCloudTime + TIME_THRESHOLD) {
    return 'local-to-cloud';
  } else if (newestCloudTime > newestLocalTime + TIME_THRESHOLD) {
    return 'cloud-to-local';
  } else {
    // If timestamps are close, consider them in sync
    return 'in-sync';
  }
}

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
    
    // Note: We don't automatically sync here anymore
    // Smart sync will be handled by initSmartSync
    
  } catch (error) {
    console.error('Error initializing sync service:', error);
  }
}

/**
 * Initialize smart sync that compares local and cloud data
 * and only syncs in the necessary direction
 * @param {Array} localPosts - Posts loaded from local storage
 * @returns {Promise<void>}
 */
export async function initSmartSync(localPosts = []) {
  try {
    console.log('Initializing smart sync...');
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, cannot perform smart sync');
      return;
    }
    
    // Get cloud data
    console.log('Fetching cloud data for comparison...');
    const cloudPosts = await supabaseService.getPosts();
    console.log(`Cloud posts: ${cloudPosts.length}, Local posts: ${localPosts.length}`);
    
    // Compare timestamps to determine which is more up-to-date
    let syncDirection = determineSyncDirection(localPosts, cloudPosts);
    
    // Perform sync in the determined direction
    if (syncDirection === 'local-to-cloud') {
      console.log('Local data is newer, syncing local to cloud...');
      await syncLocalToCloud();
      // No need to render since we're not changing local data
    } 
    else if (syncDirection === 'cloud-to-local') {
      console.log('Cloud data is newer, syncing cloud to local...');
      await syncCloudToLocal();
      // Render posts after cloud-to-local sync
      console.log('Rendering posts after cloud-to-local sync');
      window.boardie.renderPosts(await loadPosts(true));
      window.boardie.postsRendered = true;
    }
    else {
      console.log('Data is in sync, no sync needed');
      // Render posts since this is the initial load
      console.log('Rendering posts after determining data is in sync');
      window.boardie.renderPosts(localPosts);
      window.boardie.postsRendered = true;
    }
    
    // Update last sync time
    lastSyncTime = new Date();
    
  } catch (error) {
    console.error('Error in smart sync:', error);
    // If sync fails, still render the posts
    console.log('Sync failed, rendering local posts');
    window.boardie.renderPosts(localPosts);
    window.boardie.postsRendered = true;
  }
}

/**
 * Debounced sync function to prevent multiple rapid calls
 * @returns {Promise<void>}
 */
export function debouncedSync() {
  console.log('Debounced sync requested...');
  
  // Clear any existing timer
  if (syncDebounceTimer) {
    console.log('Clearing existing sync timer');
    clearTimeout(syncDebounceTimer);
  }
  
  // Set a new timer
  return new Promise((resolve) => {
    syncDebounceTimer = setTimeout(async () => {
      console.log('Debounce timer expired, starting sync');
      try {
        await syncData();
        resolve();
      } catch (error) {
        console.error('Error in debounced sync:', error);
        resolve(); // Resolve even on error to prevent hanging promises
      }
    }, SYNC_DEBOUNCE_DELAY);
  });
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
    
    // Get local data for logging (skip rendering when loading posts)
    const localTags = await loadTags();
    const localPosts = await loadPosts(true);
    
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
    
    // After syncing, verify that post_tags associations were created
  try {
    console.log('Verifying post-tag associations...');
    const postTags = await supabaseService.getAllPostTags();
    console.log('Total post_tags associations after sync:', postTags.length);
    
    if (postTags.length === 0) {
      console.log('No post-tag associations found, attempting to fix...');
      
      // Get all posts and tags from Supabase
      const cloudPosts = await supabaseService.getPosts();
      const cloudTags = await supabaseService.getTags();
      
      // Create a map of cloud tags by name for easier lookup
      const cloudTagsByName = {};
      cloudTags.forEach(tag => {
        if (tag && tag.name) {
          cloudTagsByName[tag.name.toLowerCase()] = tag;
        }
      });
      
      // Process each local post with tags
      for (const localPost of localPosts) {
        if (localPost.tags && Array.isArray(localPost.tags) && localPost.tags.length > 0) {
          // Find the corresponding cloud post
          const cloudPost = cloudPosts.find(p => p.url === localPost.url);
          
          if (cloudPost) {
            console.log(`Fixing tags for post: ${cloudPost.id} (${localPost.url})`);
            await tagSyncService.syncPostTags(cloudPost.id, localPost.tags, cloudTagsByName);
          }
        }
      }
      
      // Verify again
      const updatedPostTags = await supabaseService.getAllPostTags();
      console.log('Post-tag associations after fix:', updatedPostTags.length);
    }
  } catch (verifyError) {
    console.error('Error verifying post-tag associations:', verifyError);
    // Don't throw here, we still want to complete the sync
  }
  
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
 * @param {boolean} [skipRender=false] Whether to skip rendering posts after sync
 * @returns {Promise<void>}
 */
export async function forceSync(skipRender = false) {
  console.log('Forcing sync operation...', skipRender ? '(skip rendering)' : '');
  
  // Clear any existing debounce timer
  if (syncDebounceTimer) {
    console.log('Clearing existing sync timer for force sync');
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  
  // Reset the sync flag to ensure we can start a new sync
  isSyncing = false;
  
  try {
    // Start the sync process immediately (bypass debouncing)
    // First sync from local to cloud (this won't affect local data)
    console.log('Syncing local to cloud...');
    await syncLocalToCloud();
    
    // Then sync from cloud to local only if we need to update local data
    // This is where rendering would happen
    if (!skipRender) {
      console.log('Syncing cloud to local...');
      await syncCloudToLocal();
    } else {
      console.log('Skipping cloud to local sync to avoid re-rendering');
    }
    
    // Update last sync time
    lastSyncTime = new Date();
    console.log('Forced sync completed');
  } catch (error) {
    console.error('Error during forced sync:', error);
  }
}
