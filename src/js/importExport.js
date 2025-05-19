/**
 * Import/Export functionality for Boardie
 */

// Import storage functions from postManager
import { loadPosts, savePosts } from './postManager.js';

/**
 * Export posts to a JSON file
 */
export function exportPosts() {
  try {
    // Get posts using the loadPosts function (with skipRender=true)
    const posts = loadPosts(true);
    
    if (!posts || posts.length === 0) {
      alert('No posts to export');
      return;
    }
    
    // Create export data with metadata
    const exportData = {
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      count: posts.length,
      posts: posts
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `boardie-export-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting posts:', error);
    alert('Failed to export posts: ' + error.message);
    return false;
  }
}

/**
 * Import posts from a JSON file
 * @param {File} file JSON file to import
 * @returns {Promise<Object>} Result of the import operation
 */
export function importPosts(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // Parse JSON
        const importData = JSON.parse(event.target.result);
        
        // Validate import data
        if (!importData.posts || !Array.isArray(importData.posts)) {
          reject(new Error('Invalid import file format'));
          return;
        }
        
        // Get current posts using loadPosts function
        const currentPosts = loadPosts(true);
        
        // Create a map of existing post IDs for quick lookup
        const existingPostIds = new Set(currentPosts.map(post => post.id));
        
        // Filter out posts that already exist by ID
        const newPosts = importData.posts.filter(post => !existingPostIds.has(post.id));
        
        // Combine current and new posts
        const combinedPosts = [...currentPosts, ...newPosts];
        
        // Save to localStorage using savePosts function
        savePosts(combinedPosts);
        
        // Return result
        resolve({
          success: true,
          totalImported: importData.posts.length,
          newPostsAdded: newPosts.length,
          duplicatesSkipped: importData.posts.length - newPosts.length
        });
      } catch (error) {
        console.error('Error importing posts:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}
