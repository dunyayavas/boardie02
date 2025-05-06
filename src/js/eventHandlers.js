import { addPost, deletePost, loadPosts, filterPostsByTag, filterPostsByTags, getActiveTagFilters, getPostById, updatePost } from './postManager.js';
import { extractTags } from './utils.js';
import { createTagSuggestions, getAllUniqueTags } from './tagManager.js';
import { exportPosts, importPosts } from './importExport.js';

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
      const tagElement = document.createElement('span');
      tagElement.className = 'tag cursor-pointer hover:bg-blue-200';
      tagElement.dataset.tag = tag;
      tagElement.textContent = tag;
      
      tagElement.addEventListener('click', () => {
        addTagFilter(tag);
      });
      
      availableTagsContainer.appendChild(tagElement);
    });
  }
  
  // Function to add a tag filter
  function addTagFilter(tag) {
    const filterContainer = document.getElementById('tagFilterContainer');
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    
    // Check if this tag is already in the filter
    const existingTag = filterContainer.querySelector(`.tag[data-tag="${tag}"]`);
    if (existingTag) return;
    
    // Create the tag element
    const tagElement = document.createElement('span');
    tagElement.className = 'tag bg-blue-100 text-blue-800';
    tagElement.dataset.tag = tag;
    
    // Create the tag content
    const tagContent = document.createElement('span');
    tagContent.textContent = tag;
    tagElement.appendChild(tagContent);
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ml-1 text-blue-800 hover:text-red-500 focus:outline-none';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.setAttribute('aria-label', `Remove ${tag} filter`);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      tagElement.remove();
      
      // Update the filter
      const activeFilters = getActiveTagFilters();
      filterPostsByTags(activeFilters);
    });
    tagElement.appendChild(deleteBtn);
    
    // Add to filter container
    filterContainer.appendChild(tagElement);
    
    // Hide this tag from available tags
    const availableTag = availableTagsContainer.querySelector(`.tag[data-tag="${tag}"]`);
    if (availableTag) {
      availableTag.classList.add('hidden');
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
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const url = document.getElementById('linkUrl').value.trim();
    const tagsInput = document.getElementById('linkTags').value.trim();
    const tags = extractTags(tagsInput);
    
    if (url) {
      addPost(url, tags);
      closeAddLinkModal();
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
    document.getElementById('editLinkTags').value = post.tags.join(', ');
    
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
    const tags = extractTags(tagsInput);
    
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
