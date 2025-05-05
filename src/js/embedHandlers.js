// Import platform-specific handlers
import { createInstagramEmbed as instagramEmbedHandler } from './embedHandlers/InstagramEmbedHandler.js';
import { createPinterestEmbed as pinterestEmbedHandler } from './embedHandlers/PinterestEmbedHandler.js';
import { createLinkedInEmbed as linkedInEmbedHandler } from './embedHandlers/LinkedInEmbedHandler.js';

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
  
  // Create responsive container for the iframe
  const embedWrapper = document.createElement('div');
  embedWrapper.className = 'relative pt-[56.25%]'; // 16:9 aspect ratio
  
  // Create the iframe
  const iframe = document.createElement('iframe');
  iframe.className = 'absolute top-0 left-0 w-full h-full';
  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  iframe.title = 'YouTube video player';
  iframe.frameBorder = '0';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  
  embedWrapper.appendChild(iframe);
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
 * Create a generic embed for unsupported platforms
 * @param {string} url URL to embed
 * @param {HTMLElement} container Container element for the embed
 */
export function createGenericEmbed(url, container) {
  const linkPreview = document.createElement('a');
  linkPreview.href = url;
  linkPreview.target = '_blank';
  linkPreview.rel = 'noopener noreferrer';
  linkPreview.className = 'block p-4 hover:bg-gray-50 transition-colors';
  
  const linkContent = document.createElement('div');
  linkContent.className = 'flex items-center';
  
  // Link icon
  const icon = document.createElement('div');
  icon.className = 'flex-shrink-0 mr-3';
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  `;
  
  // Link text
  const text = document.createElement('div');
  text.className = 'flex-1 overflow-hidden';
  
  const urlText = document.createElement('p');
  urlText.className = 'text-sm font-medium text-primary truncate';
  urlText.textContent = url;
  
  const visitText = document.createElement('p');
  visitText.className = 'text-xs text-gray-500 mt-1';
  visitText.textContent = 'Click to visit website';
  
  text.appendChild(urlText);
  text.appendChild(visitText);
  
  linkContent.appendChild(icon);
  linkContent.appendChild(text);
  linkPreview.appendChild(linkContent);
  
  container.appendChild(linkPreview);
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
