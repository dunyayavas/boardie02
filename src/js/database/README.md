# Boardie Database and Sync System

This directory contains the database services and synchronization system for the Boardie application.

## Architecture Overview

The database module has been refactored into a modular, domain-driven architecture to improve maintainability, testability, and performance. The main components are:

### Services

Located in the `services/` directory, these modules handle direct database operations with Supabase:

- **postService.js**: Handles post-related database operations
- **tagService.js**: Handles tag-related database operations
- **relationService.js**: Handles relationships between posts and tags
- **userService.js**: Handles user profile operations

### Sync System

Located in the `sync/` directory, these modules handle synchronization between local storage and Supabase:

- **syncManager.js**: Orchestrates the sync process and provides the main API
- **postSyncService.js**: Handles post-specific synchronization
- **tagSyncService.js**: Handles tag-specific synchronization
- **syncState.js**: Manages the state of sync operations
- **syncQueue.js**: Provides a queue-based system for handling sync operations
- **syncUtils.js**: Common utilities for sync operations
- **migrationHelper.js**: Helps migrate from the old sync system

## Usage

### Basic Import

```javascript
// Import everything
import * as database from './database/index.js';

// Or import specific modules
import { postService, tagService } from './database/services/index.js';
import { forceSync, initSmartSync } from './database/sync/index.js';
```

### Sync Operations

```javascript
// Initialize sync on app startup
await initSmartSync();

// Force a sync operation
await forceSync();

// Sync a specific post
const post = getPostById('123');
await syncSinglePostToCloud(post);

// Check sync status
const isSyncing = isSyncInProgress();
const lastSync = getLastSyncTime();
```

### Database Operations

```javascript
// Post operations
const posts = await postService.getPosts();
const post = await postService.getPostById('123');
await postService.createPost(postData);
await postService.updatePost('123', updateData);
await postService.deletePost('123');

// Tag operations
const tags = await tagService.getTags();
const newTag = await tagService.createTag({ name: 'example', color: '#ff0000' });
await tagService.updateTag('123', { color: '#00ff00' });
await tagService.deleteTag('123');

// Relation operations
await relationService.associateTagsWithPost('post123', ['tag1', 'tag2']);
const postTags = await relationService.getPostTags('post123');
```

## Performance Optimizations

The new sync system includes several performance optimizations:

1. **Selective Sync**: Ability to sync individual posts instead of the entire database
2. **Queue-Based Processing**: Prevents race conditions and manages sync operations efficiently
3. **Debounced Operations**: Prevents multiple rapid sync calls
4. **State Management**: Tracks sync status and prevents redundant operations

## Migration

The system includes a migration helper to transition from the old sync system to the new one:

```javascript
// Check if migration is needed
const migrationNeeded = await isMigrationNeeded();

// Perform migration if needed
if (migrationNeeded) {
  await migrateToNewSyncSystem();
}
```

## Best Practices

1. **Use Single Post Sync When Possible**: For better performance, use `syncSinglePostToCloud` when updating a single post instead of syncing all posts.

2. **Check Sync Status**: Always check if a sync is in progress before starting a new one:
   ```javascript
   if (!isSyncInProgress()) {
     await forceSync();
   }
   ```

3. **Handle Errors**: Always wrap sync operations in try/catch blocks to handle errors gracefully.

4. **Use the Render Manager**: The render manager optimizes UI updates and prevents unnecessary re-renders.
