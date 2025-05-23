/**
 * Sync Queue
 * Manages a queue of sync operations to prevent race conditions
 */

import syncState from './syncState.js';

class SyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
  }
  
  /**
   * Add an operation to the queue
   * @param {Function} operation - Async function to execute
   * @param {string} name - Name of the operation for logging
   * @param {Object} [metadata={}] - Additional metadata about the operation
   */
  add(operation, name, metadata = {}) {
    const queueItem = {
      operation,
      name,
      metadata,
      retries: 0,
      addedAt: new Date()
    };
    
    console.log(`Adding operation to sync queue: ${name}`);
    this.queue.push(queueItem);
    
    if (!this.processing) {
      this.process();
    }
  }
  
  /**
   * Process the next item in the queue
   * @returns {Promise<void>}
   */
  async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      console.log('Sync queue is empty, processing complete');
      return;
    }
    
    this.processing = true;
    const item = this.queue.shift();
    
    console.log(`Processing sync operation: ${item.name} (attempt ${item.retries + 1})`);
    
    try {
      // Update sync state
      syncState.startSync();
      
      // Execute the operation
      await item.operation();
      
      // Operation succeeded
      console.log(`Sync operation completed successfully: ${item.name}`);
      syncState.endSync(true);
    } catch (error) {
      console.error(`Error in sync operation ${item.name}:`, error);
      
      // Check if we should retry
      if (item.retries < this.maxRetries) {
        item.retries++;
        console.log(`Retrying operation ${item.name} (attempt ${item.retries + 1}/${this.maxRetries + 1})`);
        this.queue.unshift(item); // Put back at the front of the queue
      } else {
        console.error(`Operation ${item.name} failed after ${this.maxRetries + 1} attempts`);
        syncState.endSync(false, error);
      }
    }
    
    // Process next item with a small delay to prevent CPU hogging
    setTimeout(() => {
      this.process();
    }, 100);
  }
  
  /**
   * Clear all pending operations from the queue
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    console.log(`Cleared ${count} operations from sync queue`);
  }
  
  /**
   * Get the current status of the queue
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      pendingOperations: this.queue.map(item => ({
        name: item.name,
        retries: item.retries,
        addedAt: item.addedAt
      }))
    };
  }
}

// Create a singleton instance
const syncQueue = new SyncQueue();

export default syncQueue;
