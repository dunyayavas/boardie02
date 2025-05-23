/**
 * Post Sync Service
 * Handles synchronization of posts between local storage and Supabase
 */

import { loadPosts, savePosts } from '../../postManager.js';
import * as postService from '../services/postService.js';
import * as tagSyncService from './tagSyncService.js';
import * as relationService from '../services/relationService.js';
import syncState from './syncState.js';
import { supabase } from '../../auth/supabaseClient.js';
import { 
  createPostMapByUrl, 
  createPostMapById, 
  cloudPostToLocalFormat, 
  localPostToCloudFormat 
} from './syncUtils.js';

/**
 * Sync posts from local storage to Supabase
 * @returns {Promise<void>}
 */
export async function syncLocalToCloud() {
  try {
    console.log('Starting local to cloud post sync');
    
    // Get local posts
    const localPosts = loadPosts(true); // Skip rendering
    console.log(`Local posts: ${localPosts.length}`);
    
    if (localPosts.length === 0) {
      console.log('No local posts to sync');
      return;
    }
    
    // Get cloud tags for association
    const cloudTags = await tagSyncService.syncTagsToCloud(loadPosts(true));
    console.log('Cloud tags prepared for post sync');
    
    // Process each local post
    for (const localPost of localPosts) {
      try {
        // Check if post already exists in cloud by URL
        const { data: existingPosts, error: findError } = await postService.findPostByUrl(localPost.url);
        
        if (findError) {
          console.error('Error finding post by URL:', findError);
          continue;
        }
        
        if (existingPosts && existingPosts.length > 0) {
          // Post exists, update it
          const existingPost = existingPosts[0];
          console.log(`Updating existing post in cloud: ${existingPost.id}`);
          
          // Prepare post data for update
          const postData = localPostToCloudFormat(localPost);
          
          // Update the post
          await postService.updatePost(existingPost.id, postData);
          
          // Sync tags for this post
          if (localPost.tags && localPost.tags.length > 0) {
            await tagSyncService.syncPostTags(existingPost.id, localPost.tags, cloudTags);
          }
        } else {
          // Post doesn't exist, create it
          console.log(`Creating new post in cloud: ${localPost.url}`);
          
          // Prepare post data for creation
          const postData = localPostToCloudFormat(localPost);
          
          // Create the post
          const newPost = await postService.createPost(postData);
          
          if (newPost && newPost.id) {
            console.log(`Post created with ID: ${newPost.id}`);
            
            // Update local post with cloud ID
            localPost.id = newPost.id;
            
            // Sync tags for this post
            if (localPost.tags && localPost.tags.length > 0) {
              await tagSyncService.syncPostTags(newPost.id, localPost.tags, cloudTags);
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing post ${localPost.url}:`, error);
      }
    }
    
    // Save updated local posts with cloud IDs
    savePosts(localPosts);
    
    console.log('Local to cloud post sync completed');
  } catch (error) {
    console.error('Error in syncLocalToCloud:', error);
    throw error;
  }
}

/**
 * Sync posts from Supabase to local storage
 * @param {boolean} [skipRender=false] Whether to skip rendering posts after sync
 * @returns {Promise<Array>} Array of synced posts
 */
export async function syncCloudToLocal(skipRender = false) {
  try {
    console.log('Starting cloud to local post sync');
    
    // Get cloud posts
    const cloudPosts = await postService.getPosts();
    console.log(`Cloud posts: ${cloudPosts.length}`);
    
    if (cloudPosts.length === 0) {
      console.log('No cloud posts to sync');
      return [];
    }
    
    // Get local posts
    const localPosts = loadPosts(true); // Skip rendering
    console.log(`Local posts: ${localPosts.length}`);
    
    // Create maps for easier lookup
    const localPostsByUrl = createPostMapByUrl(localPosts);
    
    // Get all post-tag associations
    const allPostTags = await relationService.getAllPostTags();
    console.log(`Post-tag associations: ${allPostTags.length}`);
    
    // Group post tags by post ID
    const postTagsById = {};
    allPostTags.forEach(pt => {
      if (!postTagsById[pt.post_id]) {
        postTagsById[pt.post_id] = [];
      }
      postTagsById[pt.post_id].push(pt);
    });
    
    // Process cloud posts
    const updatedPosts = [];
    
    for (const cloudPost of cloudPosts) {
      // Convert cloud post to local format
      const localFormat = cloudPostToLocalFormat(cloudPost);
      
      // Add tags to the post
      const postTags = postTagsById[cloudPost.id] || [];
      
      if (postTags.length > 0) {
        // Create an array of tag objects
        localFormat.tags = postTags.map(pt => {
          if (pt.tag) {
            return {
              id: pt.tag.id,
              name: pt.tag.name,
              color: pt.tag.color || '#cccccc'
            };
          }
          return null;
        }).filter(tag => tag !== null);
      } else {
        localFormat.tags = [];
      }
      
      // Check if this post exists in local storage
      const existingLocalPost = localPostsByUrl[cloudPost.url];
      
      if (existingLocalPost) {
        // Update existing local post
        existingLocalPost.id = cloudPost.id;
        existingLocalPost.title = localFormat.title;
        existingLocalPost.description = localFormat.description;
        existingLocalPost.imageUrl = localFormat.imageUrl;
        existingLocalPost.embedHtml = localFormat.embedHtml;
        existingLocalPost.dateAdded = localFormat.dateAdded;
        existingLocalPost.lastUpdated = localFormat.lastUpdated;
        existingLocalPost.tags = localFormat.tags;
        
        updatedPosts.push(existingLocalPost);
      } else {
        // Add new post
        updatedPosts.push(localFormat);
      }
    }
    
    // Save updated posts to local storage
    savePosts(updatedPosts);
    
    console.log('Cloud to local post sync completed');
    
    // Signal that cloud data is ready to be rendered
    if (!skipRender) {
      console.log('Dispatching cloudDataReady event');
      window.boardie.cloudPosts = updatedPosts;
      window.boardie.cloudDataReady = true;
      document.dispatchEvent(new CustomEvent('cloudDataReady', { detail: { posts: updatedPosts } }));
    }
    
    return updatedPosts;
  } catch (error) {
    console.error('Error in syncCloudToLocal:', error);
    throw error;
  }
}

/**
 * Sync a single post to Supabase
 * @param {Object} post - The post to sync
 * @returns {Promise<Object>} The synced post with updated ID
 */
export async function syncSinglePostToCloud(post) {
  try {
    if (!post || !post.url) {
      console.error('Invalid post object, cannot sync');
      return null;
    }
    
    console.log(`Syncing single post to cloud: ${post.url}`);
    console.log('Post tags:', JSON.stringify(post.tags));
    
    // Get the current user and session to ensure we have the user_id and valid token
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    if (!session) {
      throw new Error('No valid session found. Please log in again.');
    }
    
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
    
    // Ensure post has user_id
    if (!post.user_id) {
      post.user_id = user.id;
    }
    
    // Process tags to ensure they have proper format
    if (post.tags && Array.isArray(post.tags)) {
      post.tags = post.tags.map(tag => {
        // Ensure tag is an object with name and color
        if (typeof tag === 'string') {
          return {
            name: tag,
            color: '#cccccc' // Default color
          };
        } else if (typeof tag === 'object' && tag !== null) {
          return {
            name: tag.name || '',
            color: tag.color || '#cccccc'
          };
        }
        return null;
      }).filter(tag => tag !== null && tag.name);
    }
    
    // Get cloud tags for association
    const cloudTags = await tagSyncService.syncTagsToCloud([post]);
    
    // Check if post already exists in cloud by URL
    const { data: existingPosts, error: findError } = await postService.findPostByUrl(post.url);
    
    if (findError) {
      console.error('Error finding post by URL:', findError);
      throw findError;
    }
    
    let syncedPost;
    
    if (existingPosts && existingPosts.length > 0) {
      // Post exists, update it
      const existingPost = existingPosts[0];
      console.log(`Updating existing post in cloud: ${existingPost.id}`);
      
      // Prepare post data for update
      const postData = localPostToCloudFormat(post);
      
      // Ensure we have the user_id in the post data
      postData.user_id = user.id;
      
      // Update the post
      const updatedPost = await postService.updatePost(existingPost.id, postData);
      syncedPost = updatedPost;
      
      // Update local post with cloud ID
      post.id = existingPost.id;
    } else {
      // Post doesn't exist, create it
      console.log(`Creating new post in cloud: ${post.url}`);
      
      // Prepare post data for creation
      const postData = localPostToCloudFormat(post);
      
      // Ensure we have the user_id in the post data
      postData.user_id = user.id;
      
      // Create the post
      const newPost = await postService.createPost(postData);
      syncedPost = newPost;
      
      if (newPost && newPost.id) {
        console.log(`Post created with ID: ${newPost.id}`);
        
        // Update local post with cloud ID
        post.id = newPost.id;
      }
    }
    
    // Sync tags for this post
    if (post.tags && post.tags.length > 0 && post.id) {
      console.log(`Syncing ${post.tags.length} tags for post ${post.id}`);
      await tagSyncService.syncPostTags(post.id, post.tags, cloudTags);
    }
    
    return syncedPost;
  } catch (error) {
    console.error('Error syncing single post to cloud:', error);
    throw error;
  }
}
