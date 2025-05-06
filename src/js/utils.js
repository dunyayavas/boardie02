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
 * @param {Array} tags Array of tags
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
    // Sort tags alphabetically
    const sortedTags = [...tags].sort();
    
    // Add tag options
    sortedTags.forEach(tag => {
      if (tag && tag.trim()) { // Only add non-empty tags
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
      }
    });
    
    // Restore selection if it still exists
    if (sortedTags.includes(currentSelection)) {
      tagFilter.value = currentSelection;
    }
  }
}
