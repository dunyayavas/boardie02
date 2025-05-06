/**
 * TikTok Embed Handler
 * Handles embedding of TikTok videos
 */

/**
 * Create a TikTok embed
 * @param {string} url TikTok URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createTikTokEmbed(url, container) {
  // Extract TikTok video ID
  const videoId = extractTikTokId(url);
  
  if (!videoId) {
    showEmbedError(container, 'Invalid TikTok URL', url);
    return;
  }

  // Create the TikTok embed container
  const embedContainer = document.createElement('div');
  embedContainer.className = 'tiktok-embed-container';
  
  // Use TikTok's blockquote approach which is the official way to embed TikTok videos
  embedContainer.innerHTML = `
    <blockquote class="tiktok-embed" cite="${url}" 
      data-video-id="${videoId}" 
      style="max-width: 605px; min-width: 325px;">
      <section>
        <a target="_blank" href="https://www.tiktok.com/@tiktok">@tiktok</a>
      </section>
    </blockquote>
  `;
  
  container.appendChild(embedContainer);
  
  // Load TikTok embed script
  loadTikTokScript();
}

/**
 * Extract TikTok video ID from URL
 * @param {string} url TikTok URL
 * @returns {string} TikTok video ID
 */
function extractTikTokId(url) {
  // Handle various TikTok URL formats
  // Standard format: https://www.tiktok.com/@username/video/1234567890123456789
  // Short format: https://vm.tiktok.com/ABCDEF/
  
  // Try to match the standard format first
  let regex = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i;
  let match = url.match(regex);
  
  if (match) {
    return match[1];
  }
  
  // Try to match the short URL format
  // For short URLs, we can't extract the ID directly, so we'll use the full URL
  regex = /vm\.tiktok\.com\/[\w]+\/?/i;
  match = url.match(regex);
  
  if (match) {
    return 'shorturl'; // Special case for short URLs
  }
  
  return '';
}

/**
 * Show an error message for invalid embeds
 * @param {HTMLElement} container Container element
 * @param {string} message Error message
 * @param {string} url URL that caused the error
 */
function showEmbedError(container, message, url) {
  container.innerHTML = `
    <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
      <p class="font-medium">${message}</p>
      <p class="text-sm mt-2 break-all">${url}</p>
    </div>
  `;
}

/**
 * Load TikTok embed script if not already loaded
 */
function loadTikTokScript() {
  if (window.tiktokEmbedsLoaded) {
    // If TikTok script is already loaded and has a process function, use it
    if (window.tiktokProcessEmbed) {
      window.tiktokProcessEmbed();
    }
    return;
  }
  
  if (!document.querySelector('script[src*="//www.tiktok.com/embed.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    // Mark as loaded
    window.tiktokEmbedsLoaded = true;
    
    // Setup callback for when TikTok script is loaded
    script.onload = () => {
      // TikTok doesn't expose a global function to reprocess embeds,
      // but we'll create a reference to track that the script is loaded
      window.tiktokProcessEmbed = () => {
        // TikTok automatically processes embeds when the script loads
        console.log('TikTok embed script loaded');
      };
      
      window.tiktokProcessEmbed();
    };
  }
}
