/**
 * Instagram Embed Handler
 * Handles embedding of Instagram posts and reels
 */

/**
 * Create an Instagram embed
 * @param {string} url Instagram URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createInstagramEmbed(url, container) {
  // Extract Instagram post ID
  const postId = extractInstagramId(url);
  
  if (!postId) {
    showEmbedError(container, 'Invalid Instagram URL', url);
    return;
  }

  // Create the Instagram embed container
  const embedContainer = document.createElement('div');
  embedContainer.className = 'instagram-embed-container';
  
  // Use Instagram's blockquote approach which is more reliable
  // This triggers their embedded.js script to convert it to a proper embed
  embedContainer.innerHTML = `
    <blockquote 
      class="instagram-media" 
      data-instgrm-captioned 
      data-instgrm-permalink="https://www.instagram.com/p/${postId}/" 
      data-instgrm-version="14">
      <a href="https://www.instagram.com/p/${postId}/">View this post on Instagram</a>
    </blockquote>
  `;
  
  container.appendChild(embedContainer);
  
  // We've removed the fallback link as requested by the user
  
  // Load Instagram embed script
  loadInstagramScript();
}

/**
 * Extract Instagram post ID from URL
 * @param {string} url Instagram URL
 * @returns {string} Instagram post ID
 */
function extractInstagramId(url) {
  // Handle various Instagram URL formats
  // Regular post: https://www.instagram.com/p/ABC123/
  // Reel: https://www.instagram.com/reel/ABC123/
  const regex = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/i;
  const match = url.match(regex);
  
  return match ? match[1] : '';
}

/**
 * Show an error message when embed creation fails
 * @param {HTMLElement} container Container element for the embed
 * @param {string} message Error message to display
 * @param {string} url Optional URL to link to
 */
function showEmbedError(container, message, url = null) {
  // Clear container
  container.innerHTML = '';
  
  const errorElement = document.createElement('div');
  errorElement.className = 'p-4 bg-red-50 text-red-700 text-center';
  
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'underline hover:text-red-800';
    link.textContent = message + ' - Open original';
    errorElement.appendChild(link);
  } else {
    errorElement.textContent = message;
  }
  
  container.appendChild(errorElement);
}

/**
 * Load Instagram embed script if not already loaded
 */
function loadInstagramScript() {
  if (window.instgrm) {
    // If Instagram script is already loaded, process any pending embeds
    if (window.instgrm.Embeds && window.instgrm.Embeds.process) {
      window.instgrm.Embeds.process();
    }
    return;
  }
  
  if (!document.querySelector('script[src*="//www.instagram.com/embed.js"]')) {
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    // Setup callback for when Instagram script is loaded
    script.onload = () => {
      if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
        window.instgrm.Embeds.process();
      }
    };
  }
}
