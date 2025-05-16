/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Determine platform from URL
 * @param {string} url URL to check
 * @returns {string} Platform name
 */
export function getPlatformFromUrl(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'Twitter';
  } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'YouTube';
  } else if (lowerUrl.includes('instagram.com')) {
    return 'Instagram';
  } else if (lowerUrl.includes('linkedin.com')) {
    return 'LinkedIn';
  } else if (lowerUrl.includes('pinterest.com')) {
    return 'Pinterest';
  } else if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) {
    return 'TikTok';
  } else {
    return 'Website';
  }
}

/**
 * Extract tags from a comma-separated string
 * @param {string} tagsString Comma-separated tags
 * @returns {Array} Array of tags
 */
export function extractTags(tagsString) {
  if (!tagsString) return [];
  
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Update tag filter options in the dropdown
 * @param {Array} tags Array of tags (can be strings or objects)
 */
export function updateTagFilterOptions(tags) {
  const tagFilter = document.getElementById('tagFilter');
  if (!tagFilter) return; // Safety check
  
  // Save current selection
  const currentSelection = tagFilter.value;
  
  // Clear existing options (except the first "All posts" option)
  while (tagFilter.options.length > 1) {
    tagFilter.remove(1);
  }
  
  // Add tag options only if we have tags
  if (tags && tags.length > 0) {
    // Sort tags alphabetically by name
    const sortedTags = [...tags].sort((a, b) => {
      const nameA = typeof a === 'object' && a !== null && a.name ? a.name.toLowerCase() : String(a).toLowerCase();
      const nameB = typeof b === 'object' && b !== null && b.name ? b.name.toLowerCase() : String(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Add tag options
    sortedTags.forEach(tag => {
      // Get tag name based on whether it's an object or string
      let tagName, tagValue;
      
      if (typeof tag === 'object' && tag !== null && tag.name) {
        tagName = tag.name;
        // Store the full tag object as a JSON string in the value
        tagValue = JSON.stringify(tag);
      } else if (tag && String(tag).trim()) {
        tagName = String(tag);
        tagValue = tagName;
      } else {
        return; // Skip invalid tags
      }
      
      const option = document.createElement('option');
      option.value = tagValue;
      option.textContent = tagName;
      option.dataset.tagName = tagName; // Store tag name for easier access
      tagFilter.appendChild(option);
    });
    
    // Try to restore selection if possible
    let selectionFound = false;
    for (let i = 0; i < tagFilter.options.length; i++) {
      const option = tagFilter.options[i];
      if (option.dataset.tagName === currentSelection) {
        tagFilter.selectedIndex = i;
        selectionFound = true;
        break;
      }
    }
    
    // If selection not found, reset to "All posts"
    if (!selectionFound) {
      tagFilter.selectedIndex = 0;
    }
  }
}
