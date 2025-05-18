import { addPost, deletePost, loadPosts, filterPostsByTag, filterPostsByTags, getActiveTagFilters, getPostById, updatePost } from './postManager.js';

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
import { createTagSuggestions, getAllUniqueTags } from './tagManager.js';
import { exportPosts, importPosts } from './importExport.js';
import { getCurrentUser } from './auth/supabaseClient.js';
import { forceSync, isSyncInProgress, getLastSyncTime } from './database/syncService.js';

/**
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
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
    
    // Show tag suggestions when opening the modal
    const posts = loadPosts();
    const allTags = getAllUniqueTags(posts);
    const tagSuggestionsContainer = document.getElementById('tagSuggestions');
    
    createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
      // Get current tags input
      const tagsInput = document.getElementById('linkTags');
      const currentTags = extractTags(tagsInput.value);
      
      // Add the selected tag if it's not already there
      if (!currentTags.includes(selectedTag)) {
        // Add comma if there are already tags
        const prefix = currentTags.length > 0 ? ', ' : '';
        tagsInput.value += prefix + selectedTag;
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
    const posts = loadPosts();
    const allTags = getAllUniqueTags(posts);
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
    
    // Check if this tag is already in the filter
    const existingTag = filterContainer.querySelector(`.tag[data-tag-name="${tagName}"]`);
    if (existingTag) return;
    
    // Create the tag element
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.dataset.tagName = tagName;
    tagElement.dataset.tagJson = JSON.stringify(tagObject);
    tagElement.textContent = tagName;
    
    // Make the background transparent and just use border color
    tagElement.style.backgroundColor = 'transparent';
    tagElement.style.borderColor = tagColor;
    tagElement.style.color = '#171717'; // Use consistent dark gray for better readability
    
    // Add click event to toggle the tag filter
    tagElement.addEventListener('click', () => {
      removeTagFilter(tagObject);
    });
    
    // Simply append the tag to the filter container
    // The CSS flex-direction: row-reverse will handle the positioning
    filterContainer.appendChild(tagElement);
    
    // Hide this tag from available tags
    const availableTag = availableTagsContainer.querySelector(`.tag[data-tag-name="${tagName}"]`);
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
    const tagElement = filterContainer.querySelector(`.tag[data-tag-name="${tagName}"]`);
    if (tagElement) {
      tagElement.remove();
    }
    
    // Show this tag in available tags
    const availableTag = availableTagsContainer.querySelector(`.tag[data-tag-name="${tagName}"]`);
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
        await addPost(url, tags);
        
        // Check if user is logged in and sync if needed
        const user = await getCurrentUser();
        if (user) {
          try {
            // Try to sync with Supabase
            if (!isSyncInProgress()) {
              await forceSync();
            }
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
  document.getElementById('postsGrid').addEventListener('click', (e) => {
    if (e.target.closest('.edit-post')) {
      const postCard = e.target.closest('.post-card');
      if (postCard && postCard.dataset.id) {
        openEditModal(postCard.dataset.id);
      }
    }
  });
  
  // Function to open the edit modal with post data
  function openEditModal(postId) {
    const post = getPostById(postId);
    if (!post) return;
    
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
    editLinkModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Focus on the URL field
    document.getElementById('editLinkUrl').focus();
    
    // Show tag suggestions
    const posts = loadPosts();
    const allTags = getAllUniqueTags(posts);
    const tagSuggestionsContainer = document.getElementById('editTagSuggestions');
    
    createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
      // Get current tags input
      const tagsInput = document.getElementById('editLinkTags');
      const currentTags = extractTags(tagsInput.value);
      
      // Add the selected tag if it's not already there
      if (!currentTags.includes(selectedTag)) {
        // Add comma if there are already tags
        const prefix = currentTags.length > 0 ? ', ' : '';
        tagsInput.value += prefix + selectedTag;
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
      updatePost(postId, url, tags);
      closeEditLinkModal();
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
      
      // Show tag suggestions
      const posts = loadPosts();
      const allTags = getAllUniqueTags(posts);
      const tagSuggestionsContainer = document.getElementById('tagSuggestions');
      
      createTagSuggestions(allTags, tagSuggestionsContainer, (selectedTag) => {
        // Get current tags input
        const tagsInput = document.getElementById('linkTags');
        const currentTags = extractTags(tagsInput.value);
        
        // Add the selected tag if it's not already there
        if (!currentTags.includes(selectedTag)) {
          // Add comma if there are already tags
          const prefix = currentTags.length > 0 ? ', ' : '';
          tagsInput.value += prefix + selectedTag;
        }
      });
    });
  }
}
