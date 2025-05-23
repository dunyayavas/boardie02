/**
 * Sync Manager
 * Orchestrates synchronization between local storage and Supabase
 */

import { loadPosts } from '../../postManager.js';
import * as postService from '../services/postService.js';
import * as postSyncService from './postSyncService.js';
import * as tagSyncService from './tagSyncService.js';
import syncState from './syncState.js';
import { determineSyncDirection, debounce } from './syncUtils.js';

// Debounce settings
const SYNC_DEBOUNCE_DELAY = 2000; // 2 seconds delay

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
 * Initialize smart sync that prioritizes cloud data as the source of truth
 * @returns {Promise<void>}
 */
export async function initSmartSync() {
  try {
    console.log('Initializing smart sync with cloud priority...');
    
    // Check if user is logged in via Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, cannot perform smart sync');
      return;
    }
    
    // Get cloud data
    console.log('Fetching cloud data...');
    const cloudPosts = await postService.getPosts();
    console.log(`Cloud posts: ${cloudPosts.length}`);
    
    if (cloudPosts.length > 0) {
      // Cloud data exists, use it as the source of truth
      console.log('Using cloud data as source of truth');
      
      // Sync cloud data to local storage
      await postSyncService.syncCloudToLocal();
      
      console.log('Smart sync completed with cloud priority');
    } else {
      // No cloud data, check if we have local data to sync
      const localPosts = loadPosts(true); // Skip rendering
      
      if (localPosts.length > 0) {
        console.log('No cloud data found, but local data exists. Syncing local to cloud...');
        
        // Sync local data to cloud
        await postSyncService.syncLocalToCloud();
        
        console.log('Smart sync completed with local priority');
      } else {
        console.log('No data found in cloud or local storage, nothing to sync');
      }
    }
    
  } catch (error) {
    console.error('Error in smart sync:', error);
    throw error;
  }
}

/**
 * Debounced sync function to prevent multiple rapid calls
 * @returns {Promise<void>}
 */
export const debouncedSync = debounce(async () => {
  await syncData();
}, SYNC_DEBOUNCE_DELAY);

/**
 * Sync data between local storage and Supabase
 * @param {Object} options - Sync options
 * @param {boolean} [options.skipRender=false] - Whether to skip rendering posts after sync
 * @returns {Promise<void>}
 */
export async function syncData(options = {}) {
  // Check if sync is already in progress
  if (syncState.isSyncInProgress()) {
    console.log('Sync already in progress, skipping');
    return;
  }
  
  try {
    // Start sync
    syncState.startSync();
    console.log('Starting sync operation...');
    
    // Get local and cloud posts
    const localPosts = loadPosts(true); // Skip rendering
    const cloudPosts = await postService.getPosts();
    
    console.log(`Local posts: ${localPosts.length}, Cloud posts: ${cloudPosts.length}`);
    
    // Determine sync direction
    const direction = determineSyncDirection(localPosts, cloudPosts);
    console.log(`Sync direction: ${direction}`);
    
    if (direction === 'local-to-cloud') {
      await postSyncService.syncLocalToCloud();
    } else if (direction === 'cloud-to-local') {
      await postSyncService.syncCloudToLocal(options.skipRender);
    } else {
      console.log('Data already in sync, no action needed');
      
      // Even if data is in sync, we might want to trigger a render
      if (!options.skipRender) {
        console.log('Dispatching cloudDataReady event for in-sync data');
        window.boardie.cloudPosts = cloudPosts;
        window.boardie.cloudDataReady = true;
        document.dispatchEvent(new CustomEvent('cloudDataReady', { detail: { posts: cloudPosts } }));
      }
    }
    
    // End sync successfully
    syncState.endSync(true);
    console.log('Sync completed successfully');
    
  } catch (error) {
    console.error('Error during sync:', error);
    
    // End sync with error
    syncState.endSync(false, error);
    throw error;
  }
}

/**
 * Force a sync operation regardless of the current sync status
 * @param {boolean} [skipRender=false] Whether to skip rendering posts after sync
 * @returns {Promise<void>}
 */
export async function forceSync(skipRender = false) {
  console.log('Forcing sync operation...', skipRender ? '(skip rendering)' : '');
  
  // Reset the sync flag to ensure we can start a new sync
  syncState.isSyncing = false;
  
  try {
    // Start the sync process immediately
    // First sync from local to cloud
    console.log('Syncing local to cloud...');
    await postSyncService.syncLocalToCloud();
    
    // Then sync from cloud to local
    console.log('Syncing cloud to local...');
    await postSyncService.syncCloudToLocal(skipRender);
    
    // Update last sync time
    syncState.lastSyncTime = new Date();
    console.log('Forced sync completed');
  } catch (error) {
    console.error('Error during forced sync:', error);
    throw error;
  }
}

/**
 * Check if a sync is currently in progress
 * @returns {boolean} True if syncing, false otherwise
 */
export function isSyncInProgress() {
  return syncState.isSyncInProgress();
}

/**
 * Get the last sync time
 * @returns {Date|null} The last sync time or null if never synced
 */
export function getLastSyncTime() {
  return syncState.getLastSyncTime();
}

// Add missing supabase import
import { supabase } from '../../auth/supabaseClient.js';
