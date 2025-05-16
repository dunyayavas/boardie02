/**
 * Tag management functionality for Boardie
 */

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
  let tagName, tagColor;
  
  if (typeof tag === 'object' && tag !== null && tag.name) {
    tagName = tag.name;
    tagColor = tag.color || '#cccccc';
  } else {
    tagName = String(tag);
    tagColor = '#cccccc';
  }
  
  const tagElement = document.createElement('span');
  tagElement.className = 'tag';
  tagElement.dataset.tag = tagName;
  
  // Set tag background color if available
  if (tagColor) {
    tagElement.style.backgroundColor = tagColor;
    
    // Adjust text color for better contrast
    const isLightColor = isColorLight(tagColor);
    if (!isLightColor) {
      tagElement.style.color = 'white';
    }
  }
  
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
  
  // Add delete button if tag is deletable
  if (isDeletable) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ml-1 text-blue-800 hover:text-red-500 focus:outline-none';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.setAttribute('aria-label', `Remove ${tagName} tag`);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the tag click event
      e.preventDefault();
      
      // Dispatch a custom event for tag deletion
      const customEvent = new CustomEvent('tagDelete', { 
        bubbles: true, 
        cancelable: true,
        detail: { tag: tagName } 
      });
      
      tagElement.dispatchEvent(customEvent);
    });
    tagElement.appendChild(deleteBtn);
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
