import { generateUniqueId, getPlatformFromUrl, updateTagFilterOptions } from './utils.js';
import { 
  createTwitterEmbed, 
  createYouTubeEmbed, 
  createInstagramEmbed,
  createPinterestEmbed,
  createLinkedInEmbed,
  createTikTokEmbed,
  createGenericEmbed 
} from './embedHandlers.js';
import { renderTags, getAllUniqueTags, invalidateTagsCache } from './tagManager.js';

// Storage keys for localStorage
const POSTS_STORAGE_KEY_PREFIX = 'boardie_posts_';
const TAGS_STORAGE_KEY_PREFIX = 'boardie_tags_';
const ACTIVE_FILTERS_KEY_PREFIX = 'boardie_active_filters_';

/**
 * Get user-specific storage key
 * @param {string} baseKey - The base key prefix
 * @returns {string} - User-specific storage key
 */
function getUserStorageKey(baseKey) {
  // Get current user from auth state if available
  const user = window.boardie?.currentUser;
  
  // If user is logged in, use user-specific key
  if (user && user.id) {
    return `${baseKey}${user.id}`;
  }
  
  // Otherwise use anonymous key
  return `${baseKey}anonymous`;
}

/**
 * Get current posts storage key
 * @returns {string} - Current posts storage key
 */
function getPostsStorageKey() {
  return getUserStorageKey(POSTS_STORAGE_KEY_PREFIX);
}

/**
 * Get current tags storage key
 * @returns {string} - Current tags storage key
 */
function getTagsStorageKey() {
  return getUserStorageKey(TAGS_STORAGE_KEY_PREFIX);
}

/**
 * Get current active filters storage key
 * @returns {string} - Current active filters storage key
 */
function getActiveFiltersStorageKey() {
  return getUserStorageKey(ACTIVE_FILTERS_KEY_PREFIX);
}

// Create global boardie object if it doesn't exist
window.boardie = window.boardie || {};

/**
 * Render posts to the UI
 * @param {Array} posts - Array of post objects to render
 */
function renderPosts(posts) {
  console.log('Rendering posts to UI');
  // Display posts
  displayPosts(posts);
  
  // Update tag filter options
  updateTagFilterOptions(getAllUniqueTags(posts));
  
  // Show message if no posts exist
  if (posts.length === 0) {
    showNoPostsMessage();
  }
}

// Add renderPosts to the global boardie object
window.boardie.renderPosts = renderPosts;

/**
 * Update a single post in the UI without re-rendering all posts
 * @param {Object} post - The post object to update in the UI
 * @returns {boolean} - True if the post was found and updated, false otherwise
 * @export
 */
export function updateSinglePostInUI(post) {
  if (!post || !post.id) {
    console.log('Invalid post object, cannot update UI');
    return false;
  }
  
  console.log('Updating single post in UI:', post.id);
  
  // Try multiple approaches to find the post card in the DOM
  console.log(`Looking for post card with ID: ${post.id}`);
  
  // First try using querySelector with data-id attribute
  let postCard = document.querySelector(`.post-card[data-id="${post.id}"]`);
  
  // If that fails, try using attribute selector
  if (!postCard) {
    postCard = document.querySelector(`.post-card[data-id='${post.id}']`);
  }
  
  // If that still fails, try a more general approach
  if (!postCard) {
    // Try finding by iterating through all post cards
    const allPostCards = document.querySelectorAll('.post-card');
    console.log(`Found ${allPostCards.length} post cards in the DOM`);
    
    for (const card of allPostCards) {
      console.log(`Post card data-id: ${card.dataset.id}, attribute: ${card.getAttribute('data-id')}`);
      if (card.dataset.id === post.id || card.getAttribute('data-id') === post.id) {
        postCard = card;
        console.log('Found post card by iterating through all cards');
        break;
      }
    }
  }
  
  if (!postCard) {
    console.log('Post card not found in DOM after all attempts, will re-render all posts');
    
    // If we can't find the post card, re-render all posts
    // This is a fallback to ensure the UI is updated
    const allPosts = loadPosts(true); // Skip rendering in loadPosts
    displayPosts(allPosts);
    
    // Return true since we've updated the UI
    return true;
  }
  
  // Use the populatePostElement function to update the post card
  populatePostElement(postCard, post);
  
  console.log('Single post UI update complete');
  return true;
}

/**
 * Populate a post element with data from a post object
 * @param {HTMLElement} postElement - The post element to populate
 * @param {Object} post - The post object containing the data
 * @export
 */
export function populatePostElement(postElement, post) {
  if (!postElement || !post) return;
  
  // Set data attributes
  postElement.dataset.id = post.id;
  postElement.dataset.platform = post.platform || getPlatformFromUrl(post.url);
  postElement.dataset.url = post.url;
  postElement.setAttribute('data-id', post.id); // Ensure the attribute is set directly
  
  // Add tags
  const tagsContainer = postElement.querySelector('.post-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = ''; // Clear existing tags
    renderTags(post.tags, tagsContainer, (tagToRemove) => {
      // Remove the tag from this post
      removeTagFromPost(post.id, tagToRemove);
    });
    
    // Invalidate tags cache and trigger tag filter setup
    invalidateTagsCache();
    
    // Dispatch event to update tag filters
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('setupTagFilters'));
    }, 100); // Small delay to ensure DOM is updated
  }
  
  // Add a placeholder for the embed with fixed height based on platform
  const embedContainer = postElement.querySelector('.post-embed');
  if (embedContainer) {
    console.log(`Updating embed for post ${post.id} with URL ${post.url}`);
    
    // Clear the existing embed content
    embedContainer.innerHTML = '';
    
    const platform = post.platform || getPlatformFromUrl(post.url);
    const placeholderHeight = platform === 'twitter' ? '500px' : 
                           platform === 'instagram' ? '600px' : '300px';
    embedContainer.innerHTML = `
      <div class="embed-placeholder bg-gray-100 animate-pulse flex items-center justify-center" 
           style="height: ${placeholderHeight}">
        <p class="text-gray-500">Loading ${platform} post...</p>
      </div>
    `;
    
    // Create the actual embed
    createEmbed(post.url, platform, embedContainer);
    
    // Make sure the post is visible
    postElement.classList.remove('opacity-0');
    postElement.classList.add('opacity-100');
    
    // Add load event listeners to embeds
    const handleContentLoaded = () => {
      // Remove placeholder
      const placeholder = embedContainer.querySelector('.embed-placeholder');
      if (placeholder) placeholder.remove();
    };
    
    // Listen for iframe and image load events
    setTimeout(() => {
      const iframes = embedContainer.querySelectorAll('iframe');
      const images = embedContainer.querySelectorAll('img');
      
      if (iframes.length === 0 && images.length === 0) {
        // If no iframes or images, just show the post
        handleContentLoaded();
      } else {
        // Set up load listeners
        iframes.forEach(iframe => {
          if (iframe.complete || iframe.contentDocument?.readyState === 'complete') {
            handleContentLoaded();
          } else {
            iframe.addEventListener('load', handleContentLoaded, { once: true });
          }
        });
        
        images.forEach(img => {
          if (img.complete) {
            handleContentLoaded();
          } else {
            img.addEventListener('load', handleContentLoaded, { once: true });
          }
        });
        
        // Fallback in case embed doesn't trigger load events
        setTimeout(handleContentLoaded, 3000);
      }
    }, 100);
  }
}

/**
 * Helper function to create the appropriate embed based on post platform
 * @param {Object} post - The post object
 * @param {HTMLElement} container - The container element for the embed
 */
function createEmbedForPost(post, container) {
  const url = post.url;
  const platform = post.platform;
  
  // Use the existing createEmbed function
  createEmbed(url, platform, container);
}

// Add updateSinglePostInUI to the global boardie object
window.boardie.updateSinglePostInUI = updateSinglePostInUI;

/**
 * Load posts from localStorage
 * @param {boolean} [forceRender=false] Whether to force rendering the posts (default: false)
 * @returns {Array} Array of post objects
 */
export function loadPosts(forceRender = false) {
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Loading posts from storage key: ${storageKey}`);
    
    const savedPosts = localStorage.getItem(storageKey);
    const posts = savedPosts ? JSON.parse(savedPosts) : [];
    
    // Only render posts if explicitly requested
    if (forceRender) {
      console.log('Explicitly rendering posts from loadPosts()');
      // Use the safeRenderPosts function for consistency and to respect the rendering lock
      if (window.boardie && window.boardie.safeRenderPosts) {
        window.boardie.safeRenderPosts(posts);
      } else {
        // Fallback to direct rendering if safeRenderPosts is not available
        displayPosts(posts);
      }
    } else {
      console.log('Not rendering posts in loadPosts() - use window.boardie.safeRenderPosts() to render');
    }
    
    return posts;
  } catch (error) {
    console.error('Error loading posts:', error);
    // If there's an error, try to recover by clearing localStorage
    if (error instanceof SyntaxError) {
      console.log('Attempting to recover from corrupted storage');
      localStorage.removeItem(getPostsStorageKey());
    }
    return [];
  }
}

/**
 * Clear all posts from localStorage for the current user
 */
export function clearPosts() {
  try {
    localStorage.removeItem(getPostsStorageKey());
    console.log('Cleared posts from localStorage');
  } catch (error) {
    console.error('Error clearing posts:', error);
  }
}

/**
 * Clear all user data from localStorage
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(getPostsStorageKey());
    localStorage.removeItem(getTagsStorageKey());
    localStorage.removeItem(getActiveFiltersStorageKey());
    console.log('Cleared all user data from localStorage');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Save posts to localStorage
 * @param {Array} posts Array of post objects
 */
export function savePosts(posts) {
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Saving posts to storage key: ${storageKey}`);
    localStorage.setItem(storageKey, JSON.stringify(posts));
  } catch (error) {
    console.error('Error saving posts:', error);
  }
}

/**
 * Load tags from localStorage
 * @returns {Array} Array of tag objects
 */
export function loadTags() {
  try {
    const storageKey = getTagsStorageKey();
    console.log(`Loading tags from storage key: ${storageKey}`);
    const savedTags = localStorage.getItem(storageKey);
    return savedTags ? JSON.parse(savedTags) : [];
  } catch (error) {
    console.error('Error loading tags:', error);
    // If there's an error, try to recover by clearing localStorage
    if (error instanceof SyntaxError) {
      console.log('Attempting to recover from corrupted tags storage');
      localStorage.removeItem(getTagsStorageKey());
    }
    return [];
  }
}

/**
 * Save tags to localStorage
 * @param {Array} tags Array of tag objects
 */
export function saveTags(tags) {
  try {
    const storageKey = getTagsStorageKey();
    console.log(`Saving tags to storage key: ${storageKey}`);
    localStorage.setItem(storageKey, JSON.stringify(tags));
  } catch (error) {
    console.error('Error saving tags:', error);
  }
}

/**
 * Add a new post
 * @param {string} url URL of the post
 * @param {Array} tags Array of tags
 * @param {boolean} [skipRender=false] Whether to skip rendering the posts
 * @returns {Object} The newly created post
 */
export function addPost(url, tags = [], skipRender = false) {
  // Load existing posts first
  let posts = [];
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Loading existing posts from storage key: ${storageKey}`);
    const savedPosts = localStorage.getItem(storageKey);
    posts = savedPosts ? JSON.parse(savedPosts) : [];
  } catch (error) {
    console.error('Error loading existing posts:', error);
    posts = [];
  }
  
  const platform = getPlatformFromUrl(url);
  
  const newPost = {
    id: generateUniqueId(),
    url,
    platform,
    tags,
    dateAdded: new Date().toISOString()
  };
  
  // Add the new post
  posts.push(newPost);
  
  // Save all posts
  savePosts(posts);
  
  // Invalidate the tags cache since we've added a new post
  invalidateTagsCache();
  
  if (!skipRender) {
    console.log('Rendering posts after adding new post');
    
    // We'll let the caller handle the UI update for the new post
    // This is more efficient than re-rendering all posts
    // The eventHandlers.js file will add just the new post to the UI
    
    // Update tag filter options
    updateTagFilterOptions(getAllUniqueTags(posts));
    
    // Trigger tag filter setup
    document.dispatchEvent(new CustomEvent('setupTagFilters'));
  } else {
    console.log('Skipping render after adding new post');
  }
  
  // Hide no posts message if it was showing
  document.getElementById('noPostsMessage').classList.add('hidden');
  
  // Return the newly created post
  return newPost;
}

/**
 * Delete a post by ID
 * @param {string} id ID of the post to delete
 * @param {boolean} [skipRender=false] Whether to skip re-rendering the posts grid
 */
export function deletePost(id, skipRender = false) {
  // Skip rendering when loading posts
  const posts = loadPosts(false);
  const updatedPosts = posts.filter(post => post.id !== id);
  savePosts(updatedPosts);
  
  // Invalidate the tags cache since we've deleted a post
  invalidateTagsCache();
  
  // Find and remove the post element from the DOM directly
  // This is more efficient than re-rendering all posts
  const postElement = document.querySelector(`.post-card[data-id="${id}"]`);
  if (postElement) {
    console.log('Removing post element from DOM:', id);
    postElement.remove();
    
    // Check if we need to show the empty state message
    if (updatedPosts.length === 0) {
      showNoPostsMessage();
    }
  } else if (!skipRender) {
    // If we couldn't find the post element, fall back to re-rendering all posts
    console.log('Post element not found in DOM, re-rendering all posts');
    displayPosts(updatedPosts);
  }
  
  // Update tag filter options
  updateTagFilterOptions(getAllUniqueTags(updatedPosts));
  
  // Trigger tag filter setup to ensure tags are properly displayed
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('setupTagFilters'));
  }, 100); // Small delay to ensure DOM is updated
}

/**
 * Get a post by ID
 * @param {string} id Post ID to find
 * @returns {Object|null} The post object or null if not found
 */
export function getPostById(id) {
  console.log('Getting post by ID:', id);
  let posts = [];
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Loading posts from storage key: ${storageKey}`);
    const savedPosts = localStorage.getItem(storageKey);
    posts = savedPosts ? JSON.parse(savedPosts) : [];
    console.log('Loaded posts from localStorage:', posts.length);
  } catch (error) {
    console.error('Error loading post by ID:', error);
    return null;
  }
  
  const post = posts.find(post => post.id === id);
  if (post) {
    console.log('Found post:', post);
  } else {
    console.error('Post not found with ID:', id);
  }
  
  return post || null;
}

/**
 * Update an existing post
 * @param {string} id Post ID to update
 * @param {string} url New URL for the post
 * @param {Array} tags New tags for the post
 * @param {boolean} [skipRender=false] Whether to skip re-rendering the posts grid
 * @param {boolean} [updateUIOnly=false] Whether to only update the UI for this post without re-rendering all posts
 * @returns {boolean} True if the post was updated, false otherwise
 */
export function updatePost(id, url, tags, skipRender = false, updateUIOnly = false) {
  console.log('Updating post:', id, 'Skip render:', skipRender, 'Update UI only:', updateUIOnly);
  // Load existing posts directly from localStorage
  let posts = [];
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Loading posts for update from storage key: ${storageKey}`);
    const savedPosts = localStorage.getItem(storageKey);
    posts = savedPosts ? JSON.parse(savedPosts) : [];
  } catch (error) {
    console.error('Error loading posts for update:', error);
    return false;
  }
  
  const postIndex = posts.findIndex(post => post.id === id);
  
  if (postIndex !== -1) {
    const platform = getPlatformFromUrl(url);
    const currentPost = posts[postIndex];
    
    // Check if anything has actually changed
    const urlChanged = currentPost.url !== url;
    const platformChanged = currentPost.platform !== platform;
    
    // Compare tags (handle both string tags and object tags)
    let tagsChanged = false;
    if (currentPost.tags.length !== tags.length) {
      tagsChanged = true;
    } else {
      // Compare each tag
      tagsChanged = tags.some((tag, index) => {
        const currentTag = currentPost.tags[index];
        if (typeof tag === 'object' && tag !== null && tag.name) {
          if (typeof currentTag === 'object' && currentTag !== null && currentTag.name) {
            return tag.name !== currentTag.name;
          }
          return true; // Different types
        } else if (typeof tag === 'string') {
          if (typeof currentTag === 'string') {
            return tag !== currentTag;
          }
          return true; // Different types
        }
        return true; // Default to changed if we can't determine
      });
    }
    
    // Only update if something has changed or we're forcing an update
    if (urlChanged || platformChanged || tagsChanged) {
      console.log('Post has changed, updating...');
      // Update the post with new values
      const updatedPost = {
        ...posts[postIndex],
        url,
        platform,
        tags,
        updatedAt: new Date().toISOString()
      };
      
      // Update the post in the array
      posts[postIndex] = updatedPost;
      
      // Save the updated posts
      savePosts(posts);
      
      // Invalidate the tags cache since we've updated a post
      invalidateTagsCache();
      
      // Handle UI updates based on parameters
      if (!skipRender) {
        // Always update only the modified post in the UI by default
        // This is more efficient than re-rendering all posts
        console.log('Updating only the modified post in the UI');
        const updateSuccess = updateSinglePostInUI(updatedPost);
        
        // Still update tag filter options since tags might have changed
        updateTagFilterOptions(getAllUniqueTags(posts));
        
        // Only if single post update fails, fall back to re-rendering all posts
        if (!updateSuccess && !updateUIOnly) {
          console.log('Single post update failed, falling back to re-rendering all posts');
          displayPosts(posts);
        }
        
        // Trigger tag filter setup to ensure tags are properly displayed
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('setupTagFilters'));
        }, 100); // Small delay to ensure DOM is updated
      }
      
      return true; // Return true to indicate post was updated
    } else {
      console.log('No changes detected, skipping update');
      return false; // Return false to indicate no changes were made
    }
  }
  
  return false; // Return false if post not found
}

/**
 * Display posts in the grid
 * @param {Array} posts Array of post objects
 * @param {boolean} [skipTagUpdate=false] Whether to skip triggering tag filter updates
 */
export function displayPosts(posts, skipTagUpdate = false) {
  console.log('Rendering posts to UI');
  
  // We don't need to check the rendering flag here anymore
  // That's handled by window.boardie.safeRenderPosts
  const postsGrid = document.getElementById('postsGrid');
  const postTemplate = document.getElementById('postTemplate');
  
  // Clear the grid
  postsGrid.innerHTML = '';
  
  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.dateAdded) - new Date(a.dateAdded);
  });
  
  // First, create all post elements with placeholders for embeds
  const postElements = sortedPosts.map((post) => {
    const postElement = document.importNode(postTemplate.content, true).firstElementChild;
    
    // Set post ID as data attribute
    postElement.dataset.id = post.id;
    postElement.dataset.platform = post.platform;
    postElement.dataset.url = post.url;
    
    // Make sure the post ID is properly set and visible in the DOM
    postElement.setAttribute('data-id', post.id); // Ensure the attribute is set directly
    
    // Initially hide the post until it's ready
    postElement.classList.add('opacity-0');
    
    // We're no longer displaying platform name/icon and timestamp
    
    // Add a placeholder for the embed with fixed height based on platform
    const embedContainer = postElement.querySelector('.post-embed');
    const placeholderHeight = post.platform === 'twitter' ? '500px' : 
                             post.platform === 'instagram' ? '600px' : '300px';
    embedContainer.innerHTML = `
      <div class="embed-placeholder bg-gray-100 animate-pulse flex items-center justify-center" 
           style="height: ${placeholderHeight}">
        <p class="text-gray-500">Loading ${post.platform} post...</p>
      </div>
    `;
    
    // Add tags with the ability to delete them
    const tagsContainer = postElement.querySelector('.post-tags');
    renderTags(post.tags, tagsContainer, (tagToRemove) => {
      // Remove the tag from this post
      removeTagFromPost(post.id, tagToRemove);
    });
    
    return { element: postElement, post };
  });
  
  // Add all posts to the grid at once
  postElements.forEach(({ element }) => {
    postsGrid.appendChild(element);
  });
  
  // Now load embeds one by one with a small delay to prevent layout shifts
  postElements.forEach(({ element, post }, index) => {
    setTimeout(() => {
      const embedContainer = element.querySelector('.post-embed');
      
      // Create the actual embed
      createEmbed(post.url, post.platform, embedContainer);
      
      // Add load event listeners to embeds
      const handleContentLoaded = () => {
        // Remove placeholder
        const placeholder = embedContainer.querySelector('.embed-placeholder');
        if (placeholder) placeholder.remove();
        
        // Show the post (without hover effect)
        element.classList.remove('opacity-0');
        element.classList.add('opacity-100');
      };
      
      // Listen for iframe and image load events
      setTimeout(() => {
        const iframes = embedContainer.querySelectorAll('iframe');
        const images = embedContainer.querySelectorAll('img');
        
        if (iframes.length === 0 && images.length === 0) {
          // If no iframes or images, just show the post
          handleContentLoaded();
        } else {
          // Set up load listeners
          iframes.forEach(iframe => {
            if (iframe.complete || iframe.contentDocument?.readyState === 'complete') {
              handleContentLoaded();
            } else {
              iframe.addEventListener('load', handleContentLoaded, { once: true });
            }
          });
          
          images.forEach(img => {
            if (img.complete) {
              handleContentLoaded();
            } else {
              img.addEventListener('load', handleContentLoaded, { once: true });
            }
          });
          
          // Fallback in case embed doesn't trigger load events
          setTimeout(handleContentLoaded, 3000);
        }
      }, 100);
    }, index * 100); // Load embeds with a 100ms delay between each
  });
  
  // Show empty state if no posts
  if (sortedPosts.length === 0) {
    showNoPostsMessage();
  } else {
    document.getElementById('noPostsMessage').classList.add('hidden');
  }
  
  // Only trigger tag filter setup if not explicitly skipped
  if (!skipTagUpdate) {
    // We don't need to invalidate tags cache here anymore
    // That's handled by the setupTagFilters function
    
    // Let main.js handle the tag filter setup
    // It will be triggered by the data ready events
  }
  
  // We don't need to reset the rendering flag here anymore
  // That's handled by window.boardie.safeRenderPosts
  
  // Dispatch an event to notify that posts have been rendered
  // This allows other components to react to the posts being rendered
  document.dispatchEvent(new CustomEvent('postsRendered', { 
    detail: { count: sortedPosts.length }
  }));
  
  console.log('Posts rendered event dispatched:', sortedPosts.length, 'posts');
}

/**
 * Create an embed based on the platform
 * @param {string} url URL of the post
 * @param {string} platform Platform of the post
 * @param {HTMLElement} container Container element for the embed
 */
function createEmbed(url, platform, container) {
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      createTwitterEmbed(url, container);
      break;
    case 'youtube':
      createYouTubeEmbed(url, container);
      break;
    case 'instagram':
      createInstagramEmbed(url, container);
      break;
    case 'pinterest':
      createPinterestEmbed(url, container);
      break;
    case 'linkedin':
      createLinkedInEmbed(url, container);
      break;
    case 'tiktok':
      createTikTokEmbed(url, container);
      break;
    default:
      createGenericEmbed(url, container);
  }
}

/**
 * Get the currently active tag filters
 * @returns {Array} Array of active tag filters (as objects)
 */
export function getActiveTagFilters() {
  const activeFilters = [];
  const filterContainer = document.getElementById('tagFilterContainer');
  const filterTags = filterContainer.querySelectorAll('.tag');
        
  filterTags.forEach(tag => {
    // Try to get the tag as a JSON object first
    if (tag.dataset.tagJson) {
      try {
        const tagObject = JSON.parse(tag.dataset.tagJson);
        activeFilters.push(tagObject);
      } catch (e) {
        // Fallback to using the tag name if JSON parsing fails
        activeFilters.push(tag.dataset.tagName);
      }
    } else if (tag.dataset.tagName) {
      // Use tag name as fallback
      activeFilters.push(tag.dataset.tagName);
    } else if (tag.dataset.tag) {
      // Legacy support for old format
      activeFilters.push(tag.dataset.tag);
    }
  });
  
  return activeFilters;
}

/**
 * Filter posts by tags
 * @param {Array} tags Array of tags to filter by (empty array for all posts)
 */
export function filterPostsByTags(tags = []) {
  // Load posts directly from localStorage to avoid recursive issues
  let posts = [];
  try {
    const storageKey = getPostsStorageKey();
    console.log(`Loading posts for filtering from storage key: ${storageKey}`);
    const savedPosts = localStorage.getItem(storageKey);
    posts = savedPosts ? JSON.parse(savedPosts) : [];
  } catch (error) {
    console.error('Error loading posts for filtering:', error);
    posts = [];
  }
  
  // Show the clear filters button if there are active filters
  const clearFiltersBtn = document.getElementById('clearTagFilters');
  if (tags.length > 0) {
    clearFiltersBtn.classList.remove('hidden');
  } else {
    clearFiltersBtn.classList.add('hidden');
  }
  
  if (tags.length === 0) {
    // Show all posts if no tags selected
    displayPosts(posts);
  } else {
    // Filter posts by tags (post must have ALL selected tags)
    const filteredPosts = posts.filter(post => {
      if (!post.tags || !Array.isArray(post.tags) || post.tags.length === 0) return false;
      
      // Check if the post has all the required tags
      return tags.every(filterTag => {
        // Handle filter tag as object or string
        const filterTagName = typeof filterTag === 'object' && filterTag !== null && filterTag.name 
          ? filterTag.name.toLowerCase() 
          : String(filterTag).toLowerCase();
        
        // Check if any of the post's tags match the filter tag
        return post.tags.some(postTag => {
          // Handle post tag as object or string
          const postTagName = typeof postTag === 'object' && postTag !== null && postTag.name 
            ? postTag.name.toLowerCase() 
            : String(postTag).toLowerCase();
          
          return postTagName === filterTagName;
        });
      });
    });
    
    displayPosts(filteredPosts);
  }
}

/**
 * Filter posts by a single tag (legacy support)
 * @param {string} tag Tag to filter by (empty string for all posts)
 */
export function filterPostsByTag(tag) {
  if (!tag) {
    filterPostsByTags([]);
  } else {
    filterPostsByTags([tag]);
  }
}

/**
 * Remove a tag from a post
 * @param {string} postId ID of the post
 * @param {string} tagToRemove Tag to remove
 */
export function removeTagFromPost(postId, tagToRemove) {
  // Skip rendering when loading posts since we'll render after tag removal
  const posts = loadPosts(true);
  const postIndex = posts.findIndex(post => post.id === postId);
  
  if (postIndex !== -1) {
    // Remove the tag from the post's tags array
    posts[postIndex].tags = posts[postIndex].tags.filter(tag => tag !== tagToRemove);
    
    // Save the updated posts
    savePosts(posts);
    
    // Invalidate the tags cache since we've modified tags
    invalidateTagsCache();
    
    // Now render the updated posts
    displayPosts(posts);
    
    // Update tag filter options
    updateTagFilterOptions(getAllUniqueTags(posts));
  }
}

/**
 * Show message when no posts exist
 */
export function showNoPostsMessage() {
  const postsContainer = document.getElementById('postsContainer');
  if (!postsContainer) return;
  
  // Clear the posts container
  postsContainer.innerHTML = '';
  
  // Create and add the no posts message
  const noPostsMessage = document.createElement('div');
  noPostsMessage.id = 'no-posts-message';
  noPostsMessage.className = 'no-posts-message';
  noPostsMessage.innerHTML = `
    <div class="text-center p-8">
      <h3 class="text-xl font-semibold mb-2">No posts yet</h3>
      <p class="text-gray-600 mb-4">Add your first link by clicking the + button below</p>
      <button id="addFirstPostBtn" class="btn btn-primary">
        <i class="fas fa-plus mr-2"></i> Add Your First Link
      </button>
    </div>
  `;
  postsContainer.appendChild(noPostsMessage);
  
  // Add event listener to the button
  const addFirstPostBtn = document.getElementById('addFirstPostBtn');
  if (addFirstPostBtn) {
    addFirstPostBtn.addEventListener('click', () => {
      document.getElementById('addPostBtn').click();
    });
  }
}

/**
 * Format a date string to a relative time (e.g., "2 days ago")
 * @param {string} dateString ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get platform name with an icon
 * @param {string} platform Platform name
 * @returns {string} HTML string with platform icon and name
 */
function getPlatformWithIcon(platform) {
  const platformLower = platform.toLowerCase();
  let icon = '';
  
  switch (platformLower) {
    case 'twitter':
    case 'x':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>';
      return `${icon} ${platformLower === 'x' ? 'Twitter' : platform}`;
    case 'youtube':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>';
      break;
    case 'instagram':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"></path></svg>';
      break;
    case 'pinterest':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44.2-.84 1.3-5.34 1.3-5.34s-.33-.67-.33-1.66c0-1.56.9-2.73 2.02-2.73.96 0 1.42.72 1.42 1.58 0 .96-.61 2.4-.93 3.74-.26 1.1.56 2.01 1.65 2.01 1.97 0 3.5-2.08 3.5-5.09 0-2.66-1.9-4.52-4.62-4.52-3.16 0-5.01 2.36-5.01 4.8 0 .95.37 1.96.82 2.52.1.11.1.2.08.31-.1.37-.3 1.16-.34 1.32-.05.21-.18.26-.4.16-1.5-.7-2.42-2.89-2.42-4.65 0-3.77 2.74-7.25 7.9-7.25 4.14 0 7.36 2.95 7.36 6.9 0 4.11-2.59 7.43-6.18 7.43-1.21 0-2.35-.63-2.74-1.37l-.74 2.84c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z"/></svg>';
      break;
    case 'linkedin':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
      break;
    case 'tiktok':
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>';
      break;
    default:
      icon = '<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M14.8 3a2 2 0 0 1 1.4.6l4.2 4.2c.4.4.6.9.6 1.4V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9.8zm-2.6 5.6V6H5v14h14v-8.8h-4.2a2 2 0 0 1-2-2V8.6h-.6zM16 2v5.4h5.4L16 2z"/></svg>';
  }
  
  return `${icon} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
}

// Expose loadPosts to the global scope for use in other modules
// Always skip rendering when called through the global object to prevent unexpected renders
window.boardie.loadPosts = function() {
  return loadPosts(true); // Always skip rendering
};
