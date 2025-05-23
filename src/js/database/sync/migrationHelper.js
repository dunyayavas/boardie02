/**
 * Migration Helper
 * Helps migrate from the old sync system to the new modular sync system
 */

import { loadPosts, savePosts, loadTags, saveTags } from '../../postManager.js';
import * as postService from '../services/postService.js';
import * as tagService from '../services/tagService.js';
import * as relationService from '../services/relationService.js';
import syncState from './syncState.js';
import { createPostMapByUrl, createTagMapByName } from './syncUtils.js';

/**
 * Migrate data from old sync system to new system
 * @returns {Promise<boolean>} Success status
 */
export async function migrateToNewSyncSystem() {
  try {
    console.log('Starting migration to new sync system...');
    
    // Get local data
    const localPosts = loadPosts(true); // Skip rendering
    const localTags = loadTags();
    
    console.log(`Local data: ${localPosts.length} posts, ${localTags.length} tags`);
    
    // Get cloud data
    const cloudPosts = await postService.getPosts();
    const cloudTags = await tagService.getTags();
    
    console.log(`Cloud data: ${cloudPosts.length} posts, ${cloudTags.length} tags`);
    
    // Create maps for easier lookup
    const localPostsByUrl = createPostMapByUrl(localPosts);
    const cloudPostsByUrl = createPostMapByUrl(cloudPosts);
    const localTagsByName = createTagMapByName(localTags);
    const cloudTagsByName = createTagMapByName(cloudTags);
    
    // Merge post IDs from cloud to local
    for (const url in localPostsByUrl) {
      const localPost = localPostsByUrl[url];
      const cloudPost = cloudPostsByUrl[url];
      
      if (cloudPost && cloudPost.id) {
        // Update local post with cloud ID
        localPost.id = cloudPost.id;
      }
    }
    
    // Merge tag IDs from cloud to local
    for (const name in localTagsByName) {
      const localTag = localTagsByName[name];
      const cloudTag = cloudTagsByName[name];
      
      if (cloudTag && cloudTag.id) {
        // Update local tag with cloud ID
        localTag.id = cloudTag.id;
      }
    }
    
    // Save updated local data
    savePosts(localPosts);
    saveTags(localTags);
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}

/**
 * Check if migration is needed
 * @returns {Promise<boolean>} True if migration is needed, false otherwise
 */
export async function isMigrationNeeded() {
  try {
    // Check if old sync service is being used
    const oldSyncServicePath = '../syncService.js';
    
    try {
      // Try to dynamically import the old sync service
      const oldSyncService = await import(oldSyncServicePath);
      
      // If we can import it and it has the expected functions, migration is needed
      if (oldSyncService && typeof oldSyncService.forceSync === 'function') {
        console.log('Old sync service detected, migration needed');
        return true;
      }
    } catch (importError) {
      // If import fails, the old sync service might not exist anymore
      console.log('Could not import old sync service, assuming migration not needed');
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if migration is needed:', error);
    return false;
  }
}
