import { addPost, deletePost, loadPosts, filterPostsByTag } from './postManager.js';
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
  
  // Delete post (using event delegation)
  document.getElementById('postsGrid').addEventListener('click', (e) => {
    if (e.target.closest('.delete-post')) {
      const postCard = e.target.closest('.post-card');
      if (postCard && postCard.dataset.id) {
        if (confirm('Are you sure you want to delete this post?')) {
          deletePost(postCard.dataset.id);
        }
      }
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
}
