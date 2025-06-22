import { addPost, deletePost, loadPosts, filterPostsByTag, filterPostsByTags, getActiveTagFilters, getPostById, updatePost, populatePostElement, updateSinglePostInUI } from './postManager.js';
import { checkClipboardAndOpenModal, readClipboardUrl } from './clipboardManager.js';

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
import { forceSync, isSyncInProgress, getLastSyncTime, syncSinglePostToCloud } from './database/index.js';
import renderManager from './renderManager.js';

/**
 * Open the Add Link modal with a URL pre-filled
 * @param {string} url - URL to pre-fill in the modal
 */
export function openAddLinkModalWithUrl(url) {
  const addLinkModal = document.getElementById('addLinkModal');
  const linkUrlInput = document.getElementById('linkUrl');
  
  if (!addLinkModal || !linkUrlInput) {
    console.error('Add Link modal or URL input not found');
    return;
  }
  
  // Show the modal
  addLinkModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden'); // Prevent scrolling when modal is open
  
  // Set the URL in the input field
  linkUrlInput.value = url;
  
  // Focus on the input field
  linkUrlInput.focus();
  
  // Show tag suggestions
  const tagInput = document.getElementById('linkTags');
  if (tagInput) {
    const cachedTags = getCachedUniqueTags();
    if (cachedTags && cachedTags.length > 0) {
      createTagSuggestions(tagInput, cachedTags);
    } else {
      // Fallback to loading all tags if cache is empty
      getAllUniqueTags().then(tags => {
        createTagSuggestions(tagInput, tags);
      });
    }
  }
  
  console.log('Opened Add Link modal with URL:', url);
}

// Flag to track if event listeners have already been set up
let eventListenersInitialized = false;

/**
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
  // Prevent duplicate event listeners
  if (eventListenersInitialized) {
    console.log('Event listeners already initialized, skipping setup');
    return;
  }
  
  // Mark as initialized
  eventListenersInitialized = true;
  
  console.log('Setting up event listeners...');
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
  // Menu items are now in the profile dropdown
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const syncDataBtn = document.getElementById('syncDataBtn');
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
  
  // Open modal when Add Link button is clicked
  addLinkBtn.addEventListener('click', async () => {
    // Try to read from clipboard first
    const clipboardUrl = await readClipboardUrl();
    
    if (clipboardUrl) {
      // If we found a URL in the clipboard, use it
      openAddLinkModalWithUrl(clipboardUrl);
    } else {
      // Otherwise just open the modal normally
      addLinkModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden'); // Prevent scrolling when modal is open
      document.getElementById('linkUrl').focus();
    }
    
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
  
  // Track the last submitted URL to prevent double submissions
  let lastSubmittedUrl = '';
  let lastSubmitTime = 0;
  const SUBMIT_COOLDOWN_MS = 2000; // 2 seconds cooldown between submissions
  
  // Submit new link
  linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = document.getElementById('linkUrl').value.trim();
    const tagsInput = document.getElementById('linkTags').value.trim();
    const tagStrings = extractTags(tagsInput);
    
    // Check if this is a duplicate submission (same URL within cooldown period)
    const currentTime = Date.now();
    const normalizedUrl = url.toLowerCase();
    if (normalizedUrl === lastSubmittedUrl && currentTime - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
      console.log('Preventing duplicate submission of the same URL');
      return;
    }
    
    // Update submission tracking
    lastSubmittedUrl = normalizedUrl;
    lastSubmitTime = currentTime;
    
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
        
        // Check if the post was added successfully or if it was a duplicate
        if (!newPost) {
          console.log('Duplicate URL detected, not adding post');
          alert('This URL has already been added to your collection.');
          closeAddLinkModal();
          return;
        }
        
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
            // Use our new single post sync feature for better performance
            // This will only sync the newly added post instead of all posts
            syncWithSupabase(newPost.id);
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
    
    // Handle delete button clicks
    const deleteButton = e.target.closest('.delete-post-btn');
    if (deleteButton) {
      const postId = deleteButton.getAttribute('data-post-id') || 
                    deleteButton.closest('.post-card')?.dataset.id;
      
      if (postId) {
        console.log('Delete button clicked for post ID:', postId);
        
        // Confirm deletion with the user
        if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
          console.log('Deletion confirmed for post ID:', postId);
          
          // Delete the post locally and sync with Supabase
          deletePost(postId, false, false).then(success => {
            if (success) {
              console.log('Post deleted successfully');
              
              // Sync with Supabase to ensure deletion is saved
              if (window.boardie && window.boardie.isAuthenticated) {
                console.log('Syncing with Supabase after post deletion...');
                forceSync().catch(error => {
                  console.error('Error syncing with Supabase after post deletion:', error);
                });
              }
            } else {
              console.error('Failed to delete post');
            }
          }).catch(error => {
            console.error('Error deleting post:', error);
          });
        } else {
          console.log('Post deletion cancelled by user');
        }
      } else {
        console.error('Could not find post ID for deletion');
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
      
      // Execute the sync immediately with the specific post ID
      // This is more efficient than syncing all posts
      syncWithSupabase(postId);
    }
  });
  
  // Menu dropdown functionality has been moved to profile dropdown
  
  // Export posts - Add null check
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Close the user menu dropdown
      const userMenu = document.getElementById('userMenu');
      if (userMenu) {
        userMenu.classList.add('hidden');
      }
      exportPosts();
    });
  } else {
    console.log('Export button not found in DOM');
  }
  
  // Import posts - Add null check
  if (importFile) {
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
  } else {
    console.log('Import file input not found in DOM');
  }
  
  // Sync a specific post with Supabase after changes
  function syncWithSupabase(postId) {
    // Check if user is logged in
    getCurrentUser().then(async user => {
      if (user) {
        console.log('User is logged in, syncing post with Supabase...');
        
        // Check if sync is already in progress
        if (isSyncInProgress()) {
          console.log('Sync already in progress, will sync this post when current sync completes');
          return;
        }
        
        try {
          // If we have a specific post ID, sync just that post
          if (postId) {
            const post = getPostById(postId);
            if (post) {
              console.log('Syncing specific post to cloud:', postId);
              await syncSinglePostToCloud(post);
              console.log('Post sync completed');
            } else {
              console.log('Post not found, falling back to full sync');
              await forceSync(true); // Skip render
            }
          } else {
            // Otherwise do a full sync
            console.log('No specific post ID, performing full sync');
            await forceSync(true); // Skip render
          }
          
          // Get last sync time
          const lastSync = getLastSyncTime();
          if (lastSync) {
            console.log('Last sync time:', lastSync.toLocaleString());
          }
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
        }
      } else {
        console.log('User not logged in, skipping sync');
      }
    });
  }
  
  // Sync data with Supabase - Add null check
  if (syncDataBtn) {
    syncDataBtn.addEventListener('click', async () => {
      // Close the user menu dropdown
      const userMenu = document.getElementById('userMenu');
      if (userMenu) {
        userMenu.classList.add('hidden');
      }
      
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
        // Use the new sync system
        await forceSync(false); // false = don't skip rendering
        
        // Show success message
        alert('Data sync completed successfully!');
        
        // No need to reload the page, the render manager will handle updates
        // Just update the UI to reflect the latest sync time
        const lastSync = getLastSyncTime();
        if (lastSync) {
          const syncStatusEl = document.getElementById('syncStatus');
          if (syncStatusEl) {
            syncStatusEl.textContent = `Last synced: ${lastSync.toLocaleString()}`;
          }
        }
      } catch (error) {
        console.error('Sync error:', error);
        alert(`Sync failed: ${error.message}`);
      } finally {
        // Reset button
        syncDataBtn.innerHTML = originalText;
        syncDataBtn.disabled = false;
      }
    });
  } else {
    console.log('Sync data button not found in DOM');
  }
  
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
