/**
 * LinkedIn Embed Handler
 * Handles embedding of LinkedIn posts and articles
 * 
 * Note: LinkedIn doesn't provide a direct embed API like other platforms,
 * so we create a rich link preview similar to WhatsApp messages using metadata.
 */

import { fetchMetadata } from '../utils/metadataFetcher.js';

/**
 * Create a LinkedIn embed
 * @param {string} url LinkedIn URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createLinkedInEmbed(url, container) {
  // Create a placeholder while content loads
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 animate-pulse p-4 h-32 flex items-center justify-center';
  placeholder.innerHTML = '<p class="text-gray-500">Loading LinkedIn content...</p>';
  container.appendChild(placeholder);

  // Fetch metadata for the URL
  fetchMetadata(url).then(metadata => {
    // Create a WhatsApp-style rich link preview card
    const card = document.createElement('div');
    card.className = 'linkedin-preview bg-white rounded-lg overflow-hidden cursor-pointer';
    
    // Make the entire card clickable
    card.addEventListener('click', function() {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    
    // Structure for the card
    let cardHTML = '';
    
    // If we have an image, show it
    if (metadata.image) {
      cardHTML += `
        <div class="linkedin-preview-image-container w-full aspect-video bg-gray-100 overflow-hidden">
          <img src="${metadata.image}" alt="${metadata.title}" class="w-full h-full object-cover">
        </div>
      `;
    }
    
    // Content section with title, description, caption, and source
    cardHTML += `
      <div class="linkedin-preview-content p-4">
        <div class="flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 text-blue-700 flex-shrink-0">
            <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"></path>
          </svg>
          <span class="font-semibold text-gray-800 text-sm">${metadata.siteName}</span>
        </div>
        <h3 class="font-bold text-gray-900 mb-1 text-base leading-tight">${metadata.title}</h3>
        
        <!-- We're not showing any captions for LinkedIn posts to avoid mock content -->
        <!-- If we want to show captions in the future, we'll need to extract them from the actual LinkedIn posts -->
        
        <p class="text-sm text-gray-600 mb-2 line-clamp-2">${metadata.description}</p>
        <p class="text-xs text-gray-500 truncate">${url}</p>
      </div>
    `;
    

    
    // Set the card HTML
    card.innerHTML = cardHTML;
    
    // Remove placeholder and add the card
    placeholder.remove();
    container.appendChild(card);
  }).catch(error => {
    console.error('Error fetching LinkedIn metadata:', error);
    
    // Fallback to basic preview if metadata fetching fails
    const fallbackCard = document.createElement('div');
    fallbackCard.className = 'linkedin-preview bg-white rounded-lg overflow-hidden cursor-pointer';
    
    // Make the fallback card clickable too
    fallbackCard.addEventListener('click', function() {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    
    fallbackCard.innerHTML = `
      <div class="linkedin-preview-content p-4">
        <div class="flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 text-blue-700 flex-shrink-0">
            <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"></path>
          </svg>
          <span class="font-semibold text-gray-800 text-sm">LinkedIn</span>
        </div>
        <h3 class="font-bold text-gray-900 mb-1 text-base leading-tight">LinkedIn Content</h3>
        <p class="text-sm text-gray-600 mb-2">View this content on LinkedIn, the world's largest professional network.</p>
        <p class="text-xs text-gray-500 truncate">${url}</p>
      </div>
    `;
    
    placeholder.remove();
    container.appendChild(fallbackCard);
  });
}

/**
 * Determine the type of LinkedIn content from the URL
 * @param {string} url LinkedIn URL
 * @returns {string} Content type (post, article, profile, company, or unknown)
 */
function getLinkedInContentType(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('/posts/')) {
    return 'post';
  } else if (lowerUrl.includes('/pulse/')) {
    return 'article';
  } else if (lowerUrl.includes('/in/')) {
    return 'profile';
  } else if (lowerUrl.includes('/company/')) {
    return 'company';
  } else {
    return 'unknown';
  }
}

/**
 * Extract information from LinkedIn URL
 * @param {string} url LinkedIn URL
 * @param {string} type Content type
 * @returns {Object} Extracted information
 */
function extractLinkedInInfo(url, type) {
  const info = {};
  
  if (type === 'profile') {
    // Extract username from profile URL
    // Format: linkedin.com/in/username
    const regex = /linkedin\.com\/in\/([^\/\?#]+)/i;
    const match = url.match(regex);
    if (match && match[1]) {
      info.username = match[1].replace(/-/g, ' ');
    }
  } else if (type === 'company') {
    // Extract company name from company URL
    // Format: linkedin.com/company/company-name
    const regex = /linkedin\.com\/company\/([^\/\?#]+)/i;
    const match = url.match(regex);
    if (match && match[1]) {
      info.company = match[1].replace(/-/g, ' ');
    }
  } else if (type === 'post') {
    // Extract post ID and activity from post URL
    // Format: linkedin.com/posts/username_activity-id
    const regex = /linkedin\.com\/posts\/([^\/\?#]+)(?:_([^\?#]+))?/i;
    const match = url.match(regex);
    if (match) {
      if (match[1]) info.username = match[1].replace(/-/g, ' ');
      if (match[2]) info.activity = match[2];
    }
  } else if (type === 'article') {
    // Extract article title and author from article URL
    // Format: linkedin.com/pulse/article-title-username
    const regex = /linkedin\.com\/pulse\/([^\/\?#]+)(?:-([^\/\?#]+))?/i;
    const match = url.match(regex);
    if (match) {
      if (match[1]) info.title = match[1].replace(/-/g, ' ');
      if (match[2]) info.username = match[2].replace(/-/g, ' ');
    }
  }
  
  return info;
}
