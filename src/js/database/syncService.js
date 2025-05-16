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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');
    
    console.log('Starting sync process...', new Date().toISOString());
    console.log('User ID:', user.id);
    
    // Debug: Check if we have local tags
    const localTags = JSON.parse(localStorage.getItem('boardie_tags') || '[]');
    console.log('Local tags count:', localTags.length);
    if (localTags.length > 0) {
      console.log('Sample local tag:', localTags[0]);
    }
    
    // Debug: Check if we have local posts
    const localPosts = JSON.parse(localStorage.getItem('boardie_posts') || '[]');
    console.log('Local posts count:', localPosts.length);
    if (localPosts.length > 0) {
      console.log('Sample local post:', localPosts[0]);
      console.log('Sample post tags:', localPosts[0].tags);
    }
    
    // First sync local data to cloud
    await syncLocalToCloud();
    
    // Debug: Check Supabase for tags after local->cloud sync
    const { data: supabaseTags, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id);
    
    console.log('Supabase tags after local->cloud sync:', supabaseTags || 'Error');
    if (tagError) console.error('Error fetching tags:', tagError);
    
    // Debug: Check Supabase for post_tags after local->cloud sync
    const { data: postTags, error: postTagError } = await supabase
      .from('post_tags')
      .select('*');
    
    console.log('Supabase post_tags after local->cloud sync:', postTags || 'Error');
    if (postTagError) console.error('Error fetching post_tags:', postTagError);
    
    // Then sync cloud data to local
    await syncCloudToLocal();
    
    console.log('Sync completed successfully', new Date().toISOString());
    const cloudPosts = await supabaseService.getPosts();
    console.log('Cloud posts after sync:', cloudPosts.length);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-md z-50 bg-green-500 text-white';
    successMessage.textContent = `Sync completed: ${cloudPosts.length} posts synced`;
    document.body.appendChild(successMessage);
    
    // Remove success message after 3 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
    
    // Update last sync time
    lastSyncTime = new Date();
    console.log('Data sync completed at', lastSyncTime);
    
  } catch (error) {
    console.error('Error syncing data:', error);
    
    // Show error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-md z-50 bg-red-500 text-white';
    errorMessage.textContent = `Sync failed: ${error.message}`;
    document.body.appendChild(errorMessage);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        document.body.removeChild(errorMessage);
      }
    }, 5000);
    
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
    
    // Extract all unique tags from posts
    const allTagsFromPosts = [];
    localPosts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (tag && tag.name && !allTagsFromPosts.some(t => t.name === tag.name)) {
            allTagsFromPosts.push(tag);
          }
        });
      }
    });
    
    // Also get tags from the tags storage
    const localTags = await loadTags();
    
    // Combine both sources of tags, ensuring no duplicates
    const combinedTags = [...localTags];
    allTagsFromPosts.forEach(tag => {
      if (!combinedTags.some(t => t.name === tag.name)) {
        combinedTags.push(tag);
      }
    });
    
    console.log('Local posts count:', localPosts.length);
    console.log('Combined tags count:', combinedTags.length);
    console.log('Tags from posts:', allTagsFromPosts.length);
    console.log('Tags from storage:', localTags.length);
    
    // Sync tags first (since posts may reference them)
    // This returns an updated map of cloud tags by name
    const cloudTagsByName = await syncTagsToCloud(combinedTags);
    
    // Then sync posts using the updated cloudTagsByName map
    await syncPostsToCloud(localPosts, cloudTagsByName);
    
    console.log('Local to cloud sync completed');
    
  } catch (error) {
    console.error('Error syncing local to cloud:', error);
    throw error;
  }
}

/**
 * Sync tags from local storage to Supabase
 * @param {Array} localTags - Local tags data
 * @returns {Promise<Object>} Map of cloud tags by name
 */
async function syncTagsToCloud(localTags) {
  try {
    console.log('Syncing tags to cloud, local tags count:', localTags.length);
    if (localTags.length > 0) {
      console.log('Sample local tag:', localTags[0]);
    }
    
    // Get cloud tags
    const cloudTags = await supabaseService.getTags();
    console.log('Cloud tags count:', cloudTags.length);
    
    // Create a map of cloud tags by name for quick lookup
    const cloudTagsByName = cloudTags.reduce((map, tag) => {
      if (tag && tag.name) map[tag.name.toLowerCase()] = tag;
      return map;
    }, {});
    
    // Process each local tag
    const tagPromises = localTags.filter(tag => tag && tag.name).map(async (localTag) => {
      try {
        const tagName = localTag.name.toLowerCase();
        console.log('Processing local tag:', localTag.name);
        
        // If tag exists in cloud, update it if needed
        if (cloudTagsByName[tagName]) {
          const cloudTag = cloudTagsByName[tagName];
          console.log('Tag exists in cloud:', cloudTag.id);
          
          // Check if update is needed
          if (localTag.color !== cloudTag.color) {
            console.log('Updating tag color from', cloudTag.color, 'to', localTag.color);
            const updatedTag = await supabaseService.updateTag(cloudTag.id, {
              color: localTag.color
            });
            
            // Update the map with the updated tag
            if (updatedTag) {
              cloudTagsByName[tagName] = updatedTag;
            }
          }
          
          return cloudTagsByName[tagName];
        } 
        // If tag doesn't exist in cloud, create it
        else {
          console.log('Creating new tag in cloud:', localTag.name);
          const newTag = await supabaseService.createTag({
            name: localTag.name,
            color: localTag.color || '#cccccc'
          });
          
          // Add the new tag to the map
          if (newTag && newTag.id) {
            cloudTagsByName[tagName] = newTag;
            console.log('Created new tag with ID:', newTag.id);
          } else {
            console.warn('Failed to create tag:', localTag.name);
          }
          
          return newTag;
        }
      } catch (error) {
        console.error('Error processing tag:', localTag, error);
        return null;
      }
    });
    
    // Wait for all tag operations to complete
    await Promise.all(tagPromises);
    console.log('Tags sync to cloud completed');
    
    // Return the updated map of cloud tags by name
    return cloudTagsByName;
    
  } catch (error) {
    console.error('Error syncing tags to cloud:', error);
    throw error;
  }
}

/**
 * Sync posts from local storage to Supabase
 * @param {Array} localPosts - Local posts data
 * @param {Object} cloudTagsByName - Map of cloud tags by name (from syncTagsToCloud)
 * @returns {Promise<void>}
 */
async function syncPostsToCloud(localPosts, cloudTagsByName = null) {
  try {
    console.log('Syncing posts to cloud, local posts count:', localPosts.length);
    
    // Get cloud posts
    const cloudPosts = await supabaseService.getPosts();
    console.log('Cloud posts count:', cloudPosts.length);
    
    // Create a map of cloud posts by URL for quick lookup
    const cloudPostsByUrl = cloudPosts.reduce((map, post) => {
      map[post.url] = post;
      return map;
    }, {});
    
    // If cloudTagsByName wasn't provided, get cloud tags for reference
    if (!cloudTagsByName) {
      console.log('No cloudTagsByName provided, fetching from database');
      const cloudTags = await supabaseService.getTags();
      cloudTagsByName = cloudTags.reduce((map, tag) => {
        if (tag && tag.name) map[tag.name.toLowerCase()] = tag;
        return map;
      }, {});
    }
    
    console.log('Cloud tags count:', Object.keys(cloudTagsByName).length);
    if (Object.keys(cloudTagsByName).length > 0) {
      console.log('Sample cloud tags:', Object.keys(cloudTagsByName).slice(0, 3));
    }
    
    // Process each local post (ensure posts array exists)
    for (const localPost of localPosts || []) {
      if (!localPost || !localPost.url) {
        console.warn('Skipping invalid post:', localPost);
        continue;
      }
      
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
          // Sync tags for this post
          await syncPostTags(cloudPost.id, localPost.tags, cloudTagsByName);
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
          
          // Create tag objects from the post tags
          const tagObjects = localPost.tags.map(tag => {
            if (typeof tag === 'object' && tag.name) {
              return {
                name: tag.name,
                color: tag.color || '#cccccc'
              };
            }
            return null;
          }).filter(tag => tag !== null);
          
          console.log('Tag objects extracted from post:', tagObjects.length, JSON.stringify(tagObjects));
          
          // Create all tags first using our dedicated function
          if (tagObjects.length > 0) {
            try {
              // This will create tags and return their IDs
              const tagIds = await supabaseService.createTags(tagObjects);
              console.log('Created tags for new post with IDs:', tagIds);
              
              // Store these IDs to use when creating the post
              localPost.tagIds = tagIds;
            } catch (error) {
              console.error('Error creating tags for new post:', error);
              localPost.tagIds = [];
            }
          }
        } else {
          console.log('New post has no tags');
          localPost.tagIds = [];
        }
        
        // Only create post if it has a valid URL
        if (localPost && localPost.url) {
          console.log('Creating post in Supabase:', localPost.url);
          try {
            // Prepare tag objects with proper structure for createPost
            const tagObjects = [];
            if (localPost.tags && Array.isArray(localPost.tags)) {
              localPost.tags.forEach(tag => {
                if (typeof tag === 'object' && tag.name) {
                  tagObjects.push({
                    name: tag.name,
                    color: tag.color || '#cccccc'
                  });
                }
              });
            }
            
            console.log('Sending tag objects to createPost:', JSON.stringify(tagObjects));
            
            const newPost = await supabaseService.createPost({
              url: localPost.url,
              platform: localPost.platform || '',
              title: localPost.title || null,
              description: localPost.description || null,
              tags: tagObjects // Send the full tag objects, not just IDs
            });
            console.log('Successfully created post with ID:', newPost.id);
          } catch (error) {
            console.error('Error creating post:', error);
          }
        } else {
          console.warn('Skipping post with missing URL:', localPost);
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
 * Sync tags for a specific post
 * @param {string} postId - The post ID
 * @param {Array} localTags - Local tags for the post
 * @param {Object} cloudTagsByName - Map of cloud tags by name
 * @returns {Promise<void>}
 */
async function syncPostTags(postId, localTags, cloudTagsByName) {
  try {
    console.log('syncPostTags called for post ID:', postId);
    console.log('Local tags count:', localTags ? localTags.length : 0);
    
    // Ensure localTags is an array
    if (!Array.isArray(localTags) || localTags.length === 0) {
      console.warn('No local tags to sync for post:', postId);
      return;
    }
    
    // Filter out invalid tags
    const validLocalTags = localTags.filter(tag => tag && (tag.name || tag.id));
    if (validLocalTags.length === 0) {
      console.warn('No valid local tags to sync for post:', postId);
      return;
    }
    
    console.log('Valid local tags to sync:', validLocalTags.length);
    
    // Use our new direct functions to create tags and associate them with the post
    // First, create any new tags and get their IDs
    const tagObjects = validLocalTags.filter(tag => tag && tag.name && !tag.id);
    let tagIds = [];
    
    if (tagObjects.length > 0) {
      console.log('Creating new tags:', tagObjects.length);
      tagIds = await supabaseService.createTags(tagObjects);
      console.log('Created tag IDs:', tagIds);
    }
    
    // Add any existing tag IDs
    const existingTagIds = validLocalTags
      .filter(tag => tag && tag.id)
      .map(tag => tag.id);
    
    // Also look up tags by name in the cloudTagsByName map
    const lookedUpTagIds = validLocalTags
      .filter(tag => tag && tag.name && !tag.id)
      .map(tag => {
        const cloudTag = cloudTagsByName[tag.name.toLowerCase()];
        return cloudTag && cloudTag.id ? cloudTag.id : null;
      })
      .filter(id => id !== null);
    
    // Combine all tag IDs
    const allTagIds = [...new Set([...tagIds, ...existingTagIds, ...lookedUpTagIds])];
    
    if (allTagIds.length === 0) {
      console.warn('No tag IDs found for post:', postId);
      return;
    }
    console.log('All tag IDs to associate with post:', allTagIds);
    
    // Associate tags with the post
    const success = await supabaseService.associateTagsWithPost(postId, allTagIds);
    
    if (success) {
      console.log('Successfully synced tags for post:', postId);
    } else {
      console.warn('Failed to sync tags for post:', postId);
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
      if (tag && tag.name) map[tag.name.toLowerCase()] = tag;
      return map;
    }, {});
    
    // Merge cloud tags with local tags
    const mergedTags = [...localTags];
    
    // Add or update tags from cloud
    for (const cloudTag of cloudTags) {
      const tagName = cloudTag && cloudTag.name ? cloudTag.name.toLowerCase() : '';
      
      // If tag exists locally, update it if needed
      if (localTagsByName[tagName]) {
        const localTag = localTagsByName[tagName];
        const localIndex = mergedTags.findIndex(tag => tag && tag.name && tag.name.toLowerCase() === tagName);
        
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
  const names1 = new Set(tags1.filter(tag => tag && tag.name).map(tag => tag.name.toLowerCase()));
  const names2 = new Set(tags2.filter(tag => tag && tag.name).map(tag => tag.name.toLowerCase()));
  
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
