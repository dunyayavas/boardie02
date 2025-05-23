/**
 * Render Manager
 * Handles efficient rendering of posts and UI updates
 */

import { loadPosts } from './postManager.js';
import { getPostById, updateSinglePostInUI } from './postManager.js';

class RenderManager {
  constructor() {
    this.pendingRenders = new Set();
    this.isRendering = false;
    this.debounceTimer = null;
    this.renderDelay = 50; // ms
  }
  
  /**
   * Schedule a render operation
   * @param {string} [postId=null] - Specific post ID to render, or null for all posts
   */
  scheduleRender(postId = null) {
    if (postId) {
      this.pendingRenders.add(postId);
    } else {
      this.pendingRenders.clear(); // Full render
      this.pendingRenders.add('all');
    }
    
    this.debounceRender();
  }
  
  /**
   * Debounce render operations to prevent multiple rapid renders
   */
  debounceRender() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.executeRender();
    }, this.renderDelay);
  }
  
  /**
   * Execute the actual render operation
   */
  async executeRender() {
    if (this.isRendering) return;
    this.isRendering = true;
    
    try {
      console.log('Executing render operation');
      
      if (this.pendingRenders.has('all')) {
        // Full render
        console.log('Performing full render');
        const posts = loadPosts(true); // Skip auto-render
        window.boardie.renderPosts(posts);
      } else {
        // Partial render for specific posts
        console.log(`Performing partial render for ${this.pendingRenders.size} posts`);
        
        for (const postId of this.pendingRenders) {
          const post = getPostById(postId);
          if (post) {
            updateSinglePostInUI(post);
          }
        }
      }
    } catch (error) {
      console.error('Error during render:', error);
    } finally {
      this.pendingRenders.clear();
      this.isRendering = false;
    }
  }
  
  /**
   * Render a specific post
   * @param {Object} post - The post object to render
   */
  renderPost(post) {
    if (!post || !post.id) return;
    
    this.scheduleRender(post.id);
  }
  
  /**
   * Render all posts
   * @param {boolean} [immediate=false] - Whether to render immediately or debounce
   */
  renderAllPosts(immediate = false) {
    if (immediate) {
      this.pendingRenders.clear();
      this.pendingRenders.add('all');
      this.executeRender();
    } else {
      this.scheduleRender();
    }
  }
}

// Create a singleton instance
const renderManager = new RenderManager();

export default renderManager;
