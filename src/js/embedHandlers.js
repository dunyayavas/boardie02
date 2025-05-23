// Import platform-specific handlers
import { createInstagramEmbed as instagramEmbedHandler } from './embedHandlers/InstagramEmbedHandler.js';
import { createPinterestEmbed as pinterestEmbedHandler } from './embedHandlers/PinterestEmbedHandler.js';
import { createLinkedInEmbed as linkedInEmbedHandler } from './embedHandlers/LinkedInEmbedHandler.js';
import { createTikTokEmbed as tikTokEmbedHandler } from './embedHandlers/TikTokEmbedHandler.js';
import { createWebsiteEmbed as websiteEmbedHandler } from './embedHandlers/WebsiteEmbedHandler.js';

/**
 * Create a Twitter/X embed
 * @param {string} url Twitter/X URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createTwitterEmbed(url, container) {
  // Create a placeholder while the tweet loads
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 animate-pulse p-4 h-48 flex items-center justify-center';
  placeholder.innerHTML = '<p class="text-gray-500">Loading tweet...</p>';
  container.appendChild(placeholder);

  // Extract tweet ID
  const tweetId = extractTwitterId(url);
  if (!tweetId) {
    showEmbedError(container, 'Invalid Twitter URL', url);
    return;
  }

  // Create the tweet embed
  const tweetContainer = document.createElement('div');
  tweetContainer.className = 'twitter-embed-container';
  container.appendChild(tweetContainer);
  
  // Function to create tweet when Twitter widgets are available
  const createTweet = () => {
    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.createTweet(
        tweetId,
        tweetContainer,
        {
          theme: 'light',
          dnt: true,
          align: 'center'
        }
      ).then((el) => {
        // Remove placeholder when tweet is loaded
        placeholder.remove();
      }).catch(error => {
        console.error('Error creating Twitter embed:', error);
        showEmbedError(container, 'Could not load tweet', url);
      });
    } else {
      // Try again after a short delay if Twitter widgets aren't loaded yet
      setTimeout(createTweet, 1000);
    }
  };
  
  // Start the creation process
  createTweet();
}

/**
 * Create a YouTube embed
 * @param {string} url YouTube URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createYouTubeEmbed(url, container) {
  const videoId = extractYouTubeId(url);
  
  if (!videoId) {
    showEmbedError(container, 'Invalid YouTube URL');
    return;
  }
  
  // Create a placeholder while the video loads
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 animate-pulse p-4 h-48 flex items-center justify-center';
  placeholder.innerHTML = '<p class="text-gray-500">Loading YouTube video...</p>';
  container.appendChild(placeholder);
  
  // Create responsive container for the iframe
  const embedWrapper = document.createElement('div');
  embedWrapper.className = 'youtube-embed-container'; // Use the CSS class defined in main.css
  
  // Create the iframe with proper YouTube embed URL
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent(window.location.origin)}&enablejsapi=1`;
  iframe.title = 'YouTube video player';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  
  // Add load event listener to remove placeholder when iframe loads
  iframe.addEventListener('load', () => {
    if (placeholder && placeholder.parentNode) {
      placeholder.remove();
    }
  });
  
  // Add the iframe to the wrapper
  embedWrapper.appendChild(iframe);
  
  // Add the wrapper to the container
  container.appendChild(embedWrapper);
}

/**
 * Create an Instagram embed
 * @param {string} url Instagram URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createInstagramEmbed(url, container) {
  // Use the imported function from InstagramEmbedHandler.js
  return instagramEmbedHandler(url, container);
}

/**
 * Create a Pinterest embed
 * @param {string} url Pinterest URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createPinterestEmbed(url, container) {
  // Use the imported function from PinterestEmbedHandler.js
  return pinterestEmbedHandler(url, container);
}

/**
 * Create a LinkedIn embed
 * @param {string} url LinkedIn URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createLinkedInEmbed(url, container) {
  // Use the imported function from LinkedInEmbedHandler.js
  return linkedInEmbedHandler(url, container);
}

/**
 * Create a TikTok embed
 * @param {string} url TikTok URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createTikTokEmbed(url, container) {
  tikTokEmbedHandler(url, container);
}

/**
 * Create a generic embed for URLs that don't match any specific platform
 * @param {string} url URL to embed
 * @param {HTMLElement} container Container element for the embed
 */
export function createGenericEmbed(url, container) {
  // Use the WebsiteEmbedHandler to create a rich preview with Open Graph data
  return websiteEmbedHandler(url, container);
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
 * Extract Twitter/X post ID from URL
 * @param {string} url Twitter/X URL
 * @returns {string} Twitter/X post ID
 */
function extractTwitterId(url) {
  // Handle both twitter.com and x.com domains with various URL formats
  const regex = /(?:twitter|x)\.com\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i;
  const match = url.match(regex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Try another pattern for mobile or alternate formats
  const altRegex = /(?:twitter|x)\.com\/(?:i\/web|intent)\/status\/(\d+)/i;
  const altMatch = url.match(altRegex);
  
  return altMatch ? altMatch[1] : '';
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url YouTube URL
 * @returns {string} YouTube video ID
 */
function extractYouTubeId(url) {
  // Handle various YouTube URL formats
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}
