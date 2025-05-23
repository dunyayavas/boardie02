/**
 * Tag management functionality for Boardie
 */

// Cache for unique tags to avoid reloading all posts
let uniqueTagsCache = null;
let lastCacheUpdateTime = 0;

// Maximum age of cache in milliseconds (5 seconds)
const CACHE_MAX_AGE = 5000;

/**
 * Determine if a color is light or dark
 * @param {string} color - Hex color code
 * @returns {boolean} True if the color is light, false if dark
 */
function isColorLight(color) {
  // Default to light if invalid color
  if (!color || typeof color !== 'string') {
    return true;
  }
  
  // Remove the hash if it exists
  color = color.replace('#', '');
  
  // Handle shorthand hex (#fff)
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // If any value is NaN, default to light
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return true;
  }
  
  // Calculate perceived brightness using the formula
  // (0.299*R + 0.587*G + 0.114*B)
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is light (brightness > 0.5)
  return brightness > 0.5;
}

/**
 * Create a tag element
 * @param {string|Object} tag Tag name or tag object
 * @param {boolean} isClickable Whether the tag is clickable for filtering
 * @param {boolean} isDeletable Whether the tag can be deleted
 * @returns {HTMLElement} The tag element
 */
export function createTagElement(tag, isClickable = false, isDeletable = false) {
  // Handle both string tags and object tags
  let tagName;
  
  if (typeof tag === 'object' && tag !== null && tag.name) {
    tagName = tag.name;
  } else {
    tagName = String(tag);
  }
  
  const tagElement = document.createElement('span');
  tagElement.className = 'tag';
  tagElement.dataset.tagName = tagName;
  tagElement.dataset.tag = tagName; // Add this for backward compatibility
  
  // Set all tags to gray
  tagElement.style.backgroundColor = 'transparent';
  tagElement.style.borderColor = '#cccccc'; // Standard gray for all tags
  tagElement.style.color = '#171717'; // Dark gray text for readability
  
  // Add click functionality if tag is clickable
  if (isClickable) {
    tagElement.classList.add('cursor-pointer', 'hover:bg-blue-200');
    tagElement.addEventListener('click', (e) => {
      // Prevent click from bubbling if clicking on the delete button
      if (e.target.tagName === 'BUTTON') return;
      
      // Get the tag name and add it to the filter
      const tagName = tagElement.dataset.tag;
      
      // Check if we have the new filter system
      if (document.getElementById('tagFilterContainer')) {
        // Use the new filter system
        const event = new CustomEvent('addTagFilter', { 
          detail: { tag: tagName } 
        });
        document.dispatchEvent(event);
      } else {
        // Legacy support for dropdown filter
        const tagFilter = document.getElementById('tagFilter');
        if (tagFilter) {
          // Make sure the option exists
          let optionExists = false;
          for (let i = 0; i < tagFilter.options.length; i++) {
            if (tagFilter.options[i].value === tagName) {
              optionExists = true;
              break;
            }
          }
          
          // If the option doesn't exist, add it
          if (!optionExists) {
            const option = document.createElement('option');
            option.value = tagName;
            option.textContent = tagName;
            tagFilter.appendChild(option);
          }
          
          // Set the value and trigger the change event
          tagFilter.value = tagName;
          tagFilter.dispatchEvent(new Event('change'));
        }
      }
    });
  }
  
  // Basic tag content
  const tagContent = document.createElement('span');
  tagContent.textContent = tagName;
  tagElement.appendChild(tagContent);
  
  // We no longer add delete buttons to tags
  // But we still need to handle the deletion event for backward compatibility
  if (isDeletable) {
    // Just add an event listener to the tag element itself
    tagElement.addEventListener('tagDelete', (e) => {
      // The event will be handled by the parent component
    });
  }
  
  return tagElement;
}

/**
 * Render tags for a post
 * @param {Array} tags Array of tag names
 * @param {HTMLElement} container Container element for the tags
 * @param {Function} onTagDelete Callback when a tag is deleted
 */
export function renderTags(tags, container, onTagDelete = null) {
  // Clear existing tags
  container.innerHTML = '';
  
  if (!tags || tags.length === 0) {
    const noTagsElement = document.createElement('span');
    noTagsElement.className = 'text-gray-400 text-sm italic';
    noTagsElement.textContent = 'No tags';
    container.appendChild(noTagsElement);
    return;
  }
  
  // Add each tag
  tags.forEach(tag => {
    const tagElement = createTagElement(tag, true, !!onTagDelete);
    
    // Add delete event listener if callback provided
    if (onTagDelete) {
      tagElement.addEventListener('tagDelete', (e) => {
        onTagDelete(e.detail.tag);
      });
    }
    
    container.appendChild(tagElement);
  });
}

/**
 * Create tag suggestions based on existing tags
 * @param {Array} existingTags Array of all existing tags
 * @param {HTMLElement} container Container element for the suggestions
 * @param {Function} onTagSelect Callback when a tag is selected
 */
export function createTagSuggestions(existingTags, container, onTagSelect) {
  // Clear existing suggestions
  container.innerHTML = '';
  
  if (!existingTags || existingTags.length === 0) {
    return;
  }
  
  const heading = document.createElement('p');
  heading.className = 'text-sm text-gray-500 mb-2';
  heading.textContent = 'Suggested tags:';
  container.appendChild(heading);
  
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'flex flex-wrap gap-1';
  
  // Add each suggestion
  existingTags.forEach(tag => {
    const tagElement = createTagElement(tag, false, false);
    tagElement.classList.add('cursor-pointer', 'hover:bg-blue-200');
    
    tagElement.addEventListener('click', () => {
      onTagSelect(tag);
    });
    
    suggestionsContainer.appendChild(tagElement);
  });
  
  container.appendChild(suggestionsContainer);
}

/**
 * Get all unique tags from posts
 * @param {Array} posts Array of post objects
 * @returns {Array} Array of unique tags sorted alphabetically
 */
export function getAllUniqueTags(posts) {
  // Use a Map to store unique tags by name
  const tagsMap = new Map();
  
  posts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        // Handle both string tags and object tags
        if (typeof tag === 'object' && tag !== null && tag.name) {
          // It's a tag object
          tagsMap.set(tag.name.toLowerCase(), tag);
        } else if (typeof tag === 'string') {
          // It's a string tag
          // Only add if there's not already an object with this name
          if (!tagsMap.has(tag.toLowerCase())) {
            tagsMap.set(tag.toLowerCase(), tag);
          }
        }
      });
    }
  });
  
  // Convert map values to array and sort by tag name
  return Array.from(tagsMap.values())
    .sort((a, b) => {
      const nameA = typeof a === 'object' && a !== null && a.name ? a.name.toLowerCase() : String(a).toLowerCase();
      const nameB = typeof b === 'object' && b !== null && b.name ? b.name.toLowerCase() : String(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
}

/**
 * Get cached unique tags or refresh cache if needed
 * @param {Array} [additionalPosts] Optional array of posts to include in the tags (without loading all posts)
 * @returns {Array} Array of unique tags sorted alphabetically
 */
export function getCachedUniqueTags(additionalPosts = []) {
  const now = Date.now();
  const cacheExpired = !lastCacheUpdateTime || (now - lastCacheUpdateTime > CACHE_MAX_AGE);
  
  // If we have additional posts or the cache is expired/empty, we need to update it
  if (additionalPosts.length > 0 || cacheExpired || !uniqueTagsCache) {
    console.log('Tag cache miss, refreshing tags cache...');
    
    // If we have additional posts and a valid cache, merge them instead of reloading all posts
    if (additionalPosts.length > 0 && uniqueTagsCache && !cacheExpired) {
      console.log('Merging additional posts with cached tags');
      // Get tags from the additional posts
      const newTags = getAllUniqueTags(additionalPosts);
      
      // Create a map of existing cached tags
      const existingTagsMap = new Map();
      uniqueTagsCache.forEach(tag => {
        const tagKey = typeof tag === 'object' && tag.name ? tag.name.toLowerCase() : String(tag).toLowerCase();
        existingTagsMap.set(tagKey, tag);
      });
      
      // Add new tags to the map
      newTags.forEach(tag => {
        const tagKey = typeof tag === 'object' && tag.name ? tag.name.toLowerCase() : String(tag).toLowerCase();
        existingTagsMap.set(tagKey, tag);
      });
      
      // Convert back to array and sort
      uniqueTagsCache = Array.from(existingTagsMap.values())
        .sort((a, b) => {
          const nameA = typeof a === 'object' && a !== null && a.name ? a.name.toLowerCase() : String(a).toLowerCase();
          const nameB = typeof b === 'object' && b !== null && b.name ? b.name.toLowerCase() : String(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });
    } else {
      // Load all posts if cache is expired or empty
      console.log('Loading all posts for tags cache');
      // Use a direct call to avoid circular dependency
      // We can't use dynamic imports in browser environment
      const allPosts = window.boardie.loadPosts();
      uniqueTagsCache = getAllUniqueTags(allPosts);
    }
    
    // Update the cache timestamp
    lastCacheUpdateTime = now;
  } else {
    console.log('Using cached tags, cache age:', now - lastCacheUpdateTime, 'ms');
  }
  
  return uniqueTagsCache;
}

/**
 * Invalidate the tags cache to force a refresh on next request
 */
export function invalidateTagsCache() {
  console.log('Invalidating tags cache');
  lastCacheUpdateTime = 0;
  uniqueTagsCache = null;
}
