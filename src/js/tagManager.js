/**
 * Tag management functionality for Boardie
 */

/**
 * Create a tag element
 * @param {string} tagName Name of the tag
 * @param {boolean} isClickable Whether the tag is clickable for filtering
 * @param {boolean} isDeletable Whether the tag can be deleted
 * @returns {HTMLElement} The tag element
 */
export function createTagElement(tagName, isClickable = false, isDeletable = false) {
  const tagElement = document.createElement('span');
  tagElement.className = 'tag';
  tagElement.dataset.tag = tagName;
  
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
  const tagsSet = new Set();
  
  posts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        tagsSet.add(tag);
      });
    }
  });
  
  return Array.from(tagsSet).sort();
}
