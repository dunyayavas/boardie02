import { addPost, deletePost, loadPosts, filterPostsByTag, filterPostsByTags, getActiveTagFilters, getPostById, updatePost, populatePostElement, updateSinglePostInUI } from './postManager.js';

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
import { extractTags } from './utils.js';
import { createTagSuggestions, getAllUniqueTags, getCachedUniqueTags, invalidateTagsCache } from './tagManager.js';
import { exportPosts, importPosts } from './importExport.js';
import { getCurrentUser } from './auth/supabaseClient.js';
import { forceSync, isSyncInProgress, getLastSyncTime } from './database/syncService.js';
import * as supabaseService from './database/supabaseService.js';

/**
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
  // Set up tag filters
  setupTagFilters();
  
  // Debounce timer for setupTagFilters
  let setupTagFiltersTimer = null;
  
  // Listen for setupTagFilters event with debounce
  document.addEventListener('setupTagFilters', () => {
    // Clear any existing timer
    if (setupTagFiltersTimer) {
      clearTimeout(setupTagFiltersTimer);
    }
    
    // Set a new timer to call setupTagFilters after a delay
    setupTagFiltersTimer = setTimeout(() => {
      console.log('Debounced setupTagFilters event');
      setupTagFilters();
      setupTagFiltersTimer = null;
    }, 300); // 300ms debounce delay
  });

  // Add link button and modal elements
  const addLinkBtn = document.getElementById('addLinkBtn');
  const addLinkModal = document.getElementById('addLinkModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelAddLink = document.getElementById('cancelAddLink');
  const linkForm = document.getElementById('linkForm');
  
  // Edit link modal elements
  const editLinkModal = document.getElementById('editLinkModal');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const cancelEditLink = document.getElementById('cancelEditLink');
  const deletePostBtn = document.getElementById('deletePostBtn');
  const editLinkForm = document.getElementById('editLinkForm');
  
  const tagFilter = document.getElementById('tagFilter');
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const syncDataBtn = document.getElementById('syncDataBtn');
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
  
  // Open modal when Add Link button is clicked
  addLinkBtn.addEventListener('click', () => {
    // Show the modal
    addLinkModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Prevent scrolling when modal is open
    document.getElementById('linkUrl').focus();
    
    // Show tag suggestions using the cached tags instead of loading all posts
    // This prevents unnecessary re-rendering
    const allTags = getCachedUniqueTags();
    const tagSuggestionsContainer = document.getElementById('tagSuggestions');
    
    createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
      // Get current tags input
      const tagsInput = document.getElementById('linkTags');
      const currentTags = extractTags(tagsInput.value);
      
      // Extract tag name if it's an object
      let tagName;
      if (typeof selectedTag === 'object' && selectedTag !== null && selectedTag.name) {
        tagName = selectedTag.name;
        console.log('Selected tag object in add form:', selectedTag, 'Using name:', tagName);
      } else {
        tagName = String(selectedTag);
        console.log('Selected tag string in add form:', tagName);
      }
      
      // Add the selected tag if it's not already there
      if (!currentTags.includes(tagName)) {
        // Add comma if there are already tags
        const prefix = currentTags.length > 0 ? ', ' : '';
        tagsInput.value += prefix + tagName;
      }
    });
  });
  
  // Close modal when X button is clicked
  closeModalBtn.addEventListener('click', () => {
    closeAddLinkModal();
  });
  
  // Close modal when clicking outside of it
  addLinkModal.addEventListener('click', (e) => {
    // Only close if the click was directly on the modal background, not on its children
    if (e.target === addLinkModal) {
      closeAddLinkModal();
    }
  });
  
  // Cancel add link
  cancelAddLink.addEventListener('click', () => {
    closeAddLinkModal();
  });
  
  // Function to close the add link modal and reset form
  function closeAddLinkModal() {
    addLinkModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    linkForm.reset();
    document.getElementById('tagSuggestions').innerHTML = '';
  }
  
  // Function to close the edit link modal and reset form
  function closeEditLinkModal() {
    editLinkModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    editLinkForm.reset();
    document.getElementById('editTagSuggestions').innerHTML = '';
  }
  
  // Function to set up tag filters
  function setupTagFilters() {
    // Force invalidation of tag cache to ensure we get the latest tags
    invalidateTagsCache();
    // Use cached tags instead of loading all posts
    const allTags = getCachedUniqueTags();
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    
    // Clear the container
    availableTagsContainer.innerHTML = '';
    
    // Add each available tag
    allTags.forEach(tag => {
      // Extract tag name and color if it's an object
      let tagName, tagColor, tagObject;
      
      if (typeof tag === 'object' && tag !== null && tag.name) {
        tagName = tag.name;
        tagColor = tag.color || '#cccccc';
        tagObject = tag;
      } else {
        tagName = String(tag);
        tagColor = '#cccccc';
        tagObject = { name: tagName, color: tagColor };
      }
      
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.dataset.tagName = tagName;
      tagElement.dataset.tagJson = JSON.stringify(tagObject);
      tagElement.textContent = tagName;
      
      // Make the background transparent and just use border color
      tagElement.style.backgroundColor = 'transparent';
      tagElement.style.borderColor = tagColor;
      tagElement.style.color = '#171717'; // Use consistent dark gray for better readability
      
      tagElement.addEventListener('click', () => {
        addTagFilter(tagObject);
      });
      
      availableTagsContainer.appendChild(tagElement);
    });
  }
  
  // Function to add a tag filter
  function addTagFilter(tag) {
    const filterContainer = document.getElementById('tagFilterContainer');
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    
    // Extract tag name (we don't need color anymore as all tags are gray)
    let tagName, tagObject;
    
    if (typeof tag === 'object' && tag !== null && tag.name) {
      tagName = tag.name;
      // Just store the name, no need for color
      tagObject = { name: tagName };
    } else {
      tagName = String(tag);
      tagObject = { name: tagName };
    }
    
    // Check if this tag is already in the filter
    // Try both data-tag-name and data-tag for compatibility
    const existingTag = filterContainer.querySelector(`.tag[data-tag-name="${tagName}"], .tag[data-tag="${tagName}"]`);
    if (existingTag) return;
    
    // Create the tag element
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.dataset.tagName = tagName;
    tagElement.dataset.tag = tagName; // Add this for backward compatibility
    tagElement.dataset.tagJson = JSON.stringify(tagObject);
    tagElement.textContent = tagName;
    
    // Styling is now handled by CSS
    
    // Add click event to toggle the tag filter
    tagElement.addEventListener('click', () => {
      removeTagFilter(tagObject);
    });
    
    // Simply append the tag to the filter container
    // The CSS flex-direction: row-reverse will handle the positioning
    filterContainer.appendChild(tagElement);
    
    // Hide this tag from available tags
    // Try both data-tag-name and data-tag for compatibility
    const availableTag = availableTagsContainer.querySelector(`.tag[data-tag-name="${tagName}"], .tag[data-tag="${tagName}"]`);
    if (availableTag) {
      availableTag.classList.add('hidden');
    }
    
    // Update the filter
    const activeFilters = getActiveTagFilters();
    filterPostsByTags(activeFilters);
  }
  
  // Function to remove a tag filter
  function removeTagFilter(tag) {
    const filterContainer = document.getElementById('tagFilterContainer');
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    
    // Extract tag name if it's an object
    let tagName;
    if (typeof tag === 'object' && tag !== null && tag.name) {
      tagName = tag.name;
    } else {
      tagName = String(tag);
    }
    
    // Find and remove the tag element
    const tagElement = filterContainer.querySelector(`.tag[data-tag-name="${tagName}"], .tag[data-tag="${tagName}"]`);
    if (tagElement) {
      tagElement.remove();
    }
    
    // Show this tag in available tags
    // Try both data-tag-name and data-tag for compatibility
    const availableTag = availableTagsContainer.querySelector(`.tag[data-tag-name="${tagName}"], .tag[data-tag="${tagName}"]`);
    if (availableTag) {
      availableTag.classList.remove('hidden');
    }
    
    // Update the filter
    const activeFilters = getActiveTagFilters();
    filterPostsByTags(activeFilters);
  }
  
  // Function to clear all tag filters
  function clearTagFilters() {
    const filterContainer = document.getElementById('tagFilterContainer');
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    
    // Clear all filters
    filterContainer.innerHTML = '';
    
    // Show all available tags
    const availableTags = availableTagsContainer.querySelectorAll('.tag');
    availableTags.forEach(tag => {
      tag.classList.remove('hidden');
    });
    
    // Update the filter to show all posts
    filterPostsByTags([]);
  }
  
  // Submit new link
  linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = document.getElementById('linkUrl').value.trim();
    const tagsInput = document.getElementById('linkTags').value.trim();
    const tagStrings = extractTags(tagsInput);
    
    // Convert tag strings to tag objects with random colors
    const tags = tagStrings.map(tagName => {
      // Generate a random color for the tag
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      return {
        name: tagName,
        color: randomColor
      };
    });
    
    if (url) {
      // Disable the submit button to prevent double submission
      const submitButton = linkForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Saving...';
      submitButton.disabled = true;
      
      try {
        // Use skipRender=true to prevent re-rendering all posts
        const newPost = await addPost(url, tags, true);
        
        // Manually add just the new post to the UI
        console.log('Adding new post to UI without re-rendering all posts');
        const postsGrid = document.getElementById('postsGrid');
        const postTemplate = document.getElementById('postTemplate');
        
        if (postsGrid && postTemplate) {
          const postElement = document.importNode(postTemplate.content, true).firstElementChild;
          
          // Set post ID as data attribute
          postElement.dataset.id = newPost.id;
          postElement.dataset.platform = newPost.platform;
          postElement.dataset.url = newPost.url;
          postElement.setAttribute('data-id', newPost.id); // Ensure the attribute is set directly
          
          // Add the post element to the beginning of the grid for newest-first ordering
          if (postsGrid.firstChild) {
            postsGrid.insertBefore(postElement, postsGrid.firstChild);
          } else {
            postsGrid.appendChild(postElement);
          }
          
          // Populate the post element with data
          populatePostElement(postElement, newPost);
          
          // Trigger tag filter setup without re-rendering all posts
          document.dispatchEvent(new CustomEvent('setupTagFilters'));
        }
        
        // Always sync with Supabase if user is logged in to ensure tags are saved
        const user = await getCurrentUser();
        if (user) {
          try {
            console.log('Syncing new post with tags to Supabase...');
            // Force immediate sync to ensure tags are saved
            await forceSync(true);
            
            // Verify that the tags were synced properly
            setTimeout(async () => {
              try {
                console.log('Verifying tag sync for new post:', newPost.id);
                const cloudPost = await supabaseService.getPostById(newPost.id);
                if (cloudPost) {
                  const postTags = await supabaseService.getPostTags(newPost.id);
                  console.log('Post tags after sync:', postTags.length);
                }
              } catch (verifyError) {
                console.error('Error verifying tag sync:', verifyError);
              }
            }, 1000); // Wait 1 second before verification
          } catch (syncError) {
            console.error('Error syncing after adding post:', syncError);
            // Don't alert the user about sync errors here
          }
        }
        
        closeAddLinkModal();
      } catch (error) {
        console.error('Error adding post:', error);
        alert(`Error adding post: ${error.message}`);
      } finally {
        // Reset the submit button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
      }
    }
  });
  
  // Set up tag filter functionality
  setupTagFilters();
  
  // Clear tag filters button
  document.getElementById('clearTagFilters').addEventListener('click', () => {
    clearTagFilters();
  });
  
  // Listen for custom addTagFilter event
  document.addEventListener('addTagFilter', (e) => {
    if (e.detail && e.detail.tag) {
      addTagFilter(e.detail.tag);
    }
  });
  
  // Edit post (using event delegation)
  // Use document instead of postsGrid to ensure it works even if postsGrid is recreated
  document.addEventListener('click', (e) => {
    // Improved event delegation to handle clicks on the button or its SVG child
    const editButton = e.target.closest('.edit-post');
    if (editButton) {
      console.log('Edit button clicked');
      const postCard = editButton.closest('.post-card');
      if (postCard && postCard.dataset.id) {
        console.log('Opening edit modal for post ID:', postCard.dataset.id);
        openEditModal(postCard.dataset.id);
      } else {
        console.error('Could not find post card or post ID');
      }
    }
  });
  
  // Re-setup edit buttons when posts are added or updated
  document.addEventListener('postsRendered', () => {
    console.log('Posts rendered event received, ensuring edit buttons are working');
    // No need to add new listeners since we're using event delegation on document
  });
  
  // Function to open the edit modal with post data
  function openEditModal(postId) {
    console.log('Opening edit modal for post ID:', postId);
    const post = getPostById(postId);
    if (!post) {
      console.error('Post not found with ID:', postId);
      return;
    }
    
    console.log('Post found:', post);
    
    // Set the form values
    document.getElementById('editPostId').value = post.id;
    document.getElementById('editLinkUrl').value = post.url;
    
    // Extract tag names from tag objects or use the tag string directly
    const tagNames = post.tags.map(tag => {
      if (typeof tag === 'object' && tag !== null && tag.name) {
        return tag.name;
      }
      return tag;
    });
    
    document.getElementById('editLinkTags').value = tagNames.join(', ');
    
    // Show the modal
    const editLinkModal = document.getElementById('editLinkModal');
    if (!editLinkModal) {
      console.error('Edit link modal element not found!');
      return;
    }
    
    console.log('Showing edit modal');
    editLinkModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Focus on the URL field
    document.getElementById('editLinkUrl').focus();
    
    // Show tag suggestions using cached tags
    // This prevents unnecessary re-rendering
    const allTags = getCachedUniqueTags([post]); // Use cached tags + current post's tags
    const tagSuggestionsContainer = document.getElementById('editTagSuggestions');
    
    createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
      // Get current tags input
      const tagsInput = document.getElementById('editLinkTags');
      const currentTags = extractTags(tagsInput.value);
      
      // Extract tag name if it's an object
      let tagName;
      if (typeof selectedTag === 'object' && selectedTag !== null && selectedTag.name) {
        tagName = selectedTag.name;
        console.log('Selected tag object:', selectedTag, 'Using name:', tagName);
      } else {
        tagName = String(selectedTag);
        console.log('Selected tag string:', tagName);
      }
      
      // Add the selected tag if it's not already there
      if (!currentTags.includes(tagName)) {
        // Add comma if there are already tags
        const prefix = currentTags.length > 0 ? ', ' : '';
        tagsInput.value += prefix + tagName;
      }
    });
  }
  
  // Close edit modal when X button is clicked
  closeEditModalBtn.addEventListener('click', () => {
    closeEditLinkModal();
  });
  
  // Close edit modal when clicking outside of it
  editLinkModal.addEventListener('click', (e) => {
    // Only close if the click was directly on the modal background, not on its children
    if (e.target === editLinkModal) {
      closeEditLinkModal();
    }
  });
  
  // Cancel edit link
  cancelEditLink.addEventListener('click', () => {
    closeEditLinkModal();
  });
  
  // Delete post button in edit modal
  deletePostBtn.addEventListener('click', () => {
    const postId = document.getElementById('editPostId').value;
    if (postId && confirm('Are you sure you want to delete this post?')) {
      deletePost(postId);
      closeEditLinkModal();
    }
  });
  
  // Submit edit link form
  editLinkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const postId = document.getElementById('editPostId').value;
    const url = document.getElementById('editLinkUrl').value.trim();
    const tagsInput = document.getElementById('editLinkTags').value.trim();
    const tagStrings = extractTags(tagsInput);
    
    // Convert tag strings to tag objects with random colors
    const tags = tagStrings.map(tagName => {
      // Generate a random color for the tag
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      return {
        name: tagName,
        color: randomColor
      };
    });
    
    if (postId && url) {
      console.log('Updating post with tags:', tags);
      
      // Use skipRender=false to ensure the post is updated in the UI
      // Use updateUIOnly=true to only update the specific post in the UI without re-rendering all posts
      const wasUpdated = updatePost(postId, url, tags, false, true);
      closeEditLinkModal();
      
      // Always force a sync after tag changes to ensure they're saved to Supabase
      const syncWithSupabase = async () => {
        try {
          const user = await getCurrentUser();
          if (user) {
            console.log('Syncing updated post with Supabase...');
            // Force immediate sync to ensure tags are saved
            await forceSync(true);
            console.log('Sync completed after post update (skipped rendering)');
            
            // Verify that the tags were synced properly
            setTimeout(async () => {
              try {
                console.log('Verifying tag sync for post:', postId);
                const cloudPost = await supabaseService.getPostById(postId);
                if (cloudPost) {
                  const postTags = await supabaseService.getPostTags(postId);
                  console.log('Post tags after sync:', postTags.length);
                }
              } catch (verifyError) {
                console.error('Error verifying tag sync:', verifyError);
              }
            }, 1000); // Wait 1 second before verification
          }
        } catch (error) {
          console.error('Error syncing after post update:', error);
        }
      };
      
      // Execute the sync immediately
      syncWithSupabase();
    }
  });
  
  // Toggle menu dropdown
  menuBtn.addEventListener('click', () => {
    menuDropdown.classList.toggle('hidden');
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.classList.add('hidden');
    }
  });
  
  // Export posts
  exportBtn.addEventListener('click', () => {
    menuDropdown.classList.add('hidden');
    exportPosts();
  });
  
  // Import posts
  importFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      
      importPosts(file)
        .then(result => {
          alert(`Import successful! Added ${result.newPostsAdded} new posts. Skipped ${result.duplicatesSkipped} duplicates.`);
          // Reload the page to show the imported posts
          window.location.reload();
        })
        .catch(error => {
          alert('Import failed: ' + error.message);
        })
        .finally(() => {
          // Reset the file input
          e.target.value = '';
        });
    }
  });
  
  // Sync data with Supabase
  syncDataBtn.addEventListener('click', async () => {
    menuDropdown.classList.add('hidden');
    
    // Check if user is logged in
    const user = await getCurrentUser();
    if (!user) {
      alert('You need to log in to sync your data with the cloud.');
      return;
    }
    
    // Check if sync is already in progress
    if (isSyncInProgress()) {
      alert('Sync is already in progress. Please wait.');
      return;
    }
    
    // Show loading indicator
    const originalText = syncDataBtn.textContent;
    syncDataBtn.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Syncing...';
    syncDataBtn.disabled = true;
    
    try {
      await forceSync();
      
      // Show success message
      alert('Data sync completed successfully!');
      
      // Reload the page to show the synced data
      window.location.reload();
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      // Reset button
      syncDataBtn.innerHTML = originalText;
      syncDataBtn.disabled = false;
    }
  });
  
  // Empty state add button
  if (emptyStateAddBtn) {
    emptyStateAddBtn.addEventListener('click', () => {
      // Show the modal
      addLinkModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      document.getElementById('linkUrl').focus();
      
      // Show tag suggestions using cached tags
      // This prevents unnecessary re-rendering
      const allTags = getCachedUniqueTags();
      const tagSuggestionsContainer = document.getElementById('tagSuggestions');
      
      createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
        // Get current tags input
        const tagsInput = document.getElementById('linkTags');
        const currentTags = extractTags(tagsInput.value);
        
        // Extract tag name if it's an object
        let tagName;
        if (typeof selectedTag === 'object' && selectedTag !== null && selectedTag.name) {
          tagName = selectedTag.name;
          console.log('Selected tag object in empty state:', selectedTag, 'Using name:', tagName);
        } else {
          tagName = String(selectedTag);
          console.log('Selected tag string in empty state:', tagName);
        }
        
        // Add the selected tag if it's not already there
        if (!currentTags.includes(tagName)) {
          // Add comma if there are already tags
          const prefix = currentTags.length > 0 ? ', ' : '';
          tagsInput.value += prefix + tagName;
        }
      });
    });
  }
}
