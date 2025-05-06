import { addPost, deletePost, loadPosts, filterPostsByTag, savePosts } from './postManager.js';
import { extractTags } from './utils.js';
import { createTagSuggestions, getAllUniqueTags } from './tagManager.js';
import { exportPosts, importPosts } from './importExport.js';

/**
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
  // Add link button
  const addLinkBtn = document.getElementById('addLinkBtn');
  const addLinkForm = document.getElementById('addLinkForm');
  const cancelAddLink = document.getElementById('cancelAddLink');
  const linkForm = document.getElementById('linkForm');
  const tagFilter = document.getElementById('tagFilter');
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
  
  // Toggle add link form
  addLinkBtn.addEventListener('click', () => {
    addLinkForm.classList.toggle('hidden');
    document.getElementById('linkUrl').focus();
    
    // Show tag suggestions when opening the form
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
  
  // Cancel add link
  cancelAddLink.addEventListener('click', () => {
    addLinkForm.classList.add('hidden');
    linkForm.reset();
    document.getElementById('tagSuggestions').innerHTML = '';
  });
  
  // Submit new link
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const url = document.getElementById('linkUrl').value.trim();
    const tagsInput = document.getElementById('linkTags').value.trim();
    const tags = extractTags(tagsInput);
    
    if (url) {
      addPost(url, tags);
      linkForm.reset();
      addLinkForm.classList.add('hidden');
    }
  });
  
  // Filter by tag
  tagFilter.addEventListener('change', (e) => {
    const selectedTag = e.target.value;
    filterPostsByTag(selectedTag);
  });
  
  // Card menu and actions (using event delegation)
  document.getElementById('postsGrid').addEventListener('click', (e) => {
    // Handle menu button click
    if (e.target.closest('.card-menu-button')) {
      e.stopPropagation(); // Prevent document click from immediately closing it
      const menuButton = e.target.closest('.card-menu-button');
      const dropdown = menuButton.closest('.dropdown');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      // Close all other menus first
      document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.add('hidden');
      });
      
      // Toggle this menu
      menu.classList.toggle('hidden');
    }
    
    // Handle delete action
    if (e.target.closest('.delete-post')) {
      e.stopPropagation(); // Prevent the event from bubbling up
      const postCard = e.target.closest('.post-card');
      if (postCard && postCard.dataset.id) {
        if (confirm('Are you sure you want to delete this post?')) {
          deletePost(postCard.dataset.id);
        }
      }
      // Close the menu
      const menu = e.target.closest('.dropdown-menu');
      if (menu) {
        menu.classList.add('hidden');
      }
    }
    
    // Handle edit tags action
    if (e.target.closest('.edit-post')) {
      e.stopPropagation(); // Prevent the event from bubbling up
      const postCard = e.target.closest('.post-card');
      if (postCard && postCard.dataset.id) {
        openTagEditModal(postCard.dataset.id);
      }
      // Close the menu
      const menu = e.target.closest('.dropdown-menu');
      if (menu) {
        menu.classList.add('hidden');
      }
    }
  });
  
  // Toggle menu dropdown
  menuBtn.addEventListener('click', () => {
    menuDropdown.classList.toggle('hidden');
  });
  
  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    // Close main menu dropdown
    if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.classList.add('hidden');
    }
    
    // Close card menus
    if (!e.target.closest('.dropdown-menu') && !e.target.closest('.card-menu-button')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });
  
  // Add global event listener for card menu buttons
  document.addEventListener('DOMContentLoaded', () => {
    // Initial setup for existing cards
    setupCardMenuListeners();
  });
  
  // Function to set up card menu listeners (called when new cards are added)
  window.setupCardMenuListeners = function() {
    document.querySelectorAll('.card-menu-button').forEach(button => {
      // Remove existing listeners to avoid duplicates
      button.removeEventListener('click', toggleCardMenu);
      // Add fresh listener
      button.addEventListener('click', toggleCardMenu);
    });
  };
  
  // Function to toggle a card menu
  function toggleCardMenu(e) {
    e.stopPropagation();
    const dropdown = e.currentTarget.closest('.dropdown');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    // Close all other menus first
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      if (m !== menu) {
        m.classList.add('hidden');
      }
    });
    
    // Toggle this menu
    menu.classList.toggle('hidden');
  }
  
  // Export posts
  exportBtn.addEventListener('click', () => {
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
      addLinkForm.classList.remove('hidden');
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
  
  // Tag Edit Modal Functionality
  const tagEditModal = document.getElementById('tagEditModal');
  const closeTagModal = document.getElementById('closeTagModal');
  const tagInput = document.getElementById('tagInput');
  const addTagBtn = document.getElementById('addTagBtn');
  const currentTagsContainer = document.getElementById('currentTags');
  const saveTagsBtn = document.getElementById('saveTagsBtn');
  
  let currentEditingPostId = null;
  let currentTags = [];
  
  // Function to open the tag edit modal
  window.openTagEditModal = function(postId) {
    currentEditingPostId = postId;
    
    // Get the post from the posts array
    const posts = loadPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Set current tags
    currentTags = [...post.tags];
    
    // Display current tags
    renderCurrentTags();
    
    // Show the modal
    tagEditModal.classList.remove('hidden');
    
    // Focus the input field
    tagInput.focus();
  }
  
  // Function to render the current tags in the modal
  function renderCurrentTags() {
    currentTagsContainer.innerHTML = '';
    
    if (currentTags.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-gray-500 text-sm w-full text-center py-4';
      emptyState.textContent = 'No tags added yet';
      currentTagsContainer.appendChild(emptyState);
      return;
    }
    
    currentTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'inline-flex items-center bg-transparent border border-gray-300 rounded px-2 py-1 text-sm text-gray-700';
      
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      tagElement.appendChild(tagText);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'ml-1 text-gray-500 hover:text-gray-700';
      removeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      `;
      removeBtn.addEventListener('click', () => {
        currentTags = currentTags.filter(t => t !== tag);
        renderCurrentTags();
      });
      
      tagElement.appendChild(removeBtn);
      currentTagsContainer.appendChild(tagElement);
    });
  }
  
  // Add tag when clicking the add button
  addTagBtn.addEventListener('click', () => {
    addTag();
  });
  
  // Add tag when pressing Enter in the input field
  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });
  
  // Function to add a new tag
  function addTag() {
    const tag = tagInput.value.trim();
    
    if (tag && !currentTags.includes(tag)) {
      currentTags.push(tag);
      renderCurrentTags();
      tagInput.value = '';
      tagInput.focus();
    } else if (currentTags.includes(tag)) {
      // Flash the input to indicate the tag already exists
      tagInput.classList.add('border-red-500');
      setTimeout(() => {
        tagInput.classList.remove('border-red-500');
      }, 500);
    }
  }
  
  // Close the modal when clicking the close button
  closeTagModal.addEventListener('click', () => {
    tagEditModal.classList.add('hidden');
    currentEditingPostId = null;
    currentTags = [];
    tagInput.value = '';
  });
  
  // Close the modal when clicking outside of it
  tagEditModal.addEventListener('click', (e) => {
    if (e.target === tagEditModal) {
      tagEditModal.classList.add('hidden');
      currentEditingPostId = null;
      currentTags = [];
      tagInput.value = '';
    }
  });
  
  // Save tags when clicking the save button
  saveTagsBtn.addEventListener('click', () => {
    if (currentEditingPostId) {
      // Update the post tags
      updatePostTags(currentEditingPostId, currentTags);
      
      // Close the modal
      tagEditModal.classList.add('hidden');
      currentEditingPostId = null;
      currentTags = [];
      tagInput.value = '';
    }
  });
  
  // Function to update post tags
  function updatePostTags(postId, tags) {
    // Get the posts array
    const posts = loadPosts();
    
    // Get the post index
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    // Update the post tags
    posts[postIndex].tags = [...tags];
    
    // Save posts to storage
    savePosts(posts);
    
    // Update the post card in the UI
    const postCard = document.querySelector(`.post-card[data-id="${postId}"]`);
    if (postCard) {
      const tagsContainer = postCard.querySelector('.post-tags');
      tagsContainer.innerHTML = '';
      
      // Add tags to the card
      tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag filter-tag';
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag;
        tagsContainer.appendChild(tagElement);
      });
    }
  }
}
