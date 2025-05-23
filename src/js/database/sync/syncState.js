/**
 * Sync State
 * Manages the state of synchronization between local storage and Supabase
 */

// Sync state object
const syncState = {
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: [],
  syncErrors: [],
  
  /**
   * Start a sync operation
   */
  startSync() {
    this.isSyncing = true;
    console.log('Sync started');
  },
  
  /**
   * End a sync operation
   * @param {boolean} success - Whether the sync was successful
   * @param {Error} [error] - Optional error if sync failed
   */
  endSync(success = true, error = null) {
    this.isSyncing = false;
    
    if (success) {
      this.lastSyncTime = new Date();
      console.log('Sync completed successfully at', this.lastSyncTime);
    } else if (error) {
      this.syncErrors.push({
        timestamp: new Date(),
        error: error.message || 'Unknown error'
      });
      console.error('Sync failed:', error);
    }
  },
  
  /**
   * Add a pending change to be synced
   * @param {Object} change - Change object with entity, id, and type
   */
  addPendingChange(change) {
    // Ensure change has required properties
    if (!change || !change.entity || !change.type) {
      console.error('Invalid change object:', change);
      return;
    }
    
    this.pendingChanges.push({
      ...change,
      timestamp: new Date()
    });
    
    console.log('Added pending change:', change);
  },
  
  /**
   * Clear all pending changes
   */
  clearPendingChanges() {
    const count = this.pendingChanges.length;
    this.pendingChanges = [];
    console.log(`Cleared ${count} pending changes`);
  },
  
  /**
   * Get the current sync status
   * @returns {Object} Current sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChangesCount: this.pendingChanges.length,
      hasErrors: this.syncErrors.length > 0
    };
  },
  
  /**
   * Check if a sync is currently in progress
   * @returns {boolean} True if syncing, false otherwise
   */
  isSyncInProgress() {
    return this.isSyncing;
  },
  
  /**
   * Get the last sync time
   * @returns {Date|null} The last sync time or null if never synced
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
};

export default syncState;
