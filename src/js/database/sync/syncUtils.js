/**
 * Sync Utilities
 * Common utilities for synchronization operations
 */

/**
 * Determine the sync direction based on comparing local and cloud data
 * @param {Array} localPosts - Posts from local storage
 * @param {Array} cloudPosts - Posts from Supabase
 * @returns {string} - Direction to sync: 'local-to-cloud', 'cloud-to-local', or 'in-sync'
 */
export function determineSyncDirection(localPosts, cloudPosts) {
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
 * Convert a Supabase post to a local post format
 * @param {Object} cloudPost - Post from Supabase
 * @returns {Object} Post in local format
 */
export function cloudPostToLocalFormat(cloudPost) {
  if (!cloudPost) return null;
  
  return {
    id: cloudPost.id,
    url: cloudPost.url,
    platform: cloudPost.platform,
    title: cloudPost.title || '',
    description: cloudPost.description || '',
    imageUrl: cloudPost.image_url || '',
    embedHtml: cloudPost.embed_html || '',
    dateAdded: cloudPost.created_at,
    lastUpdated: cloudPost.updated_at,
    tags: [] // Tags will be added separately
  };
}

/**
 * Convert a local post to Supabase format
 * @param {Object} localPost - Post from local storage
 * @returns {Object} Post in Supabase format
 */
export function localPostToCloudFormat(localPost) {
  if (!localPost) return null;
  
  // Create a clean post object for Supabase
  const cloudPost = {
    url: localPost.url,
    platform: localPost.platform,
    title: localPost.title || '',
    description: localPost.description || '',
    image_url: localPost.imageUrl || '',
    embed_html: localPost.embedHtml || '',
    updated_at: localPost.lastUpdated || new Date().toISOString()
  };
  
  // Only include created_at if it exists
  if (localPost.dateAdded) {
    cloudPost.created_at = localPost.dateAdded;
  }
  
  // Include user_id if it exists
  if (localPost.user_id) {
    cloudPost.user_id = localPost.user_id;
  }
  
  return cloudPost;
}

/**
 * Create a map of posts by URL for easy lookup
 * @param {Array} posts - Array of posts
 * @returns {Object} Map of posts by URL
 */
export function createPostMapByUrl(posts) {
  const postMap = {};
  
  if (!posts || !Array.isArray(posts)) {
    return postMap;
  }
  
  posts.forEach(post => {
    if (post && post.url) {
      postMap[post.url] = post;
    }
  });
  
  return postMap;
}

/**
 * Create a map of posts by ID for easy lookup
 * @param {Array} posts - Array of posts
 * @returns {Object} Map of posts by ID
 */
export function createPostMapById(posts) {
  const postMap = {};
  
  if (!posts || !Array.isArray(posts)) {
    return postMap;
  }
  
  posts.forEach(post => {
    if (post && post.id) {
      postMap[post.id] = post;
    }
  });
  
  return postMap;
}

/**
 * Create a map of tags by name (case-insensitive) for easy lookup
 * @param {Array} tags - Array of tags
 * @returns {Object} Map of tags by lowercase name
 */
export function createTagMapByName(tags) {
  const tagMap = {};
  
  if (!tags || !Array.isArray(tags)) {
    return tagMap;
  }
  
  tags.forEach(tag => {
    if (tag && tag.name) {
      tagMap[tag.name.toLowerCase()] = tag;
    }
  });
  
  return tagMap;
}

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
