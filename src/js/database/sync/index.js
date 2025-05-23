/**
 * Sync System Index
 * Exports all sync-related functionality from a single entry point
 */

// Export sync manager functions
export {
  initSyncService,
  initSmartSync,
  syncData,
  debouncedSync,
  forceSync,
  isSyncInProgress,
  getLastSyncTime
} from './syncManager.js';

// Export sync state
export { default as syncState } from './syncState.js';

// Export sync queue
export { default as syncQueue } from './syncQueue.js';

// Export post sync service
export {
  syncLocalToCloud,
  syncCloudToLocal,
  syncSinglePostToCloud
} from './postSyncService.js';

// Export tag sync service
export {
  normalizeTag,
  processTags,
  createTagsInSupabase,
  syncTagsToCloud,
  syncPostTags
} from './tagSyncService.js';

// Export sync utilities
export {
  determineSyncDirection,
  cloudPostToLocalFormat,
  localPostToCloudFormat,
  createPostMapByUrl,
  createPostMapById,
  createTagMapByName,
  debounce
} from './syncUtils.js';

// Export migration helper
export {
  migrateToNewSyncSystem,
  isMigrationNeeded
} from './migrationHelper.js';
