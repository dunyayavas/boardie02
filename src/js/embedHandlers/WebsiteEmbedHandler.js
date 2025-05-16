/**
 * Website Embed Handler
 * Creates a simple, attractive preview card for websites
 */

/**
 * Create a website embed preview
 * @param {string} url Website URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createWebsiteEmbed(url, container) {
  try {
    // Parse the URL to get domain information
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const domain = hostname.replace(/^www\./, '');
    
    // Create the website preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'website-preview rounded-lg overflow-hidden';
    
    // Get favicon from Google's service
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    
    // Create a nice preview card with the information we have
    const html = `
      <div class="website-preview-content">
        <div class="website-preview-header p-4 pb-2 flex items-center">
          <img src="${favicon}" class="w-6 h-6 mr-2 rounded-sm" onerror="this.style.display='none'">
          <span class="text-sm text-gray-600 truncate">${hostname}</span>
        </div>
        <div class="website-preview-text p-4 pt-0">
          <h3 class="text-lg font-semibold mb-2 line-clamp-2">${getDisplayTitle(url, domain)}</h3>
          <p class="text-sm text-gray-600 mb-2 line-clamp-3">${getDescriptionFromUrl(url)}</p>
        </div>
        <div class="website-preview-image bg-gray-100 flex items-center justify-center" style="height: 140px;">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="block w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2">
        Visit Website
      </a>
    `;
    
    previewContainer.innerHTML = html;
    container.appendChild(previewContainer);
    
    // Try to load a preview image using a free service if available
    tryLoadPreviewImage(url, previewContainer);
    
  } catch (error) {
    console.error('Error creating website preview:', error);
    showEmbedError(container, 'Could not create website preview', url);
  }
}

/**
 * Try to load a preview image for the website
 * @param {string} url Website URL
 * @param {HTMLElement} container Preview container
 */
function tryLoadPreviewImage(url, container) {
  // Use screenshot API to get a preview image
  // Note: This is a free service with limitations
  const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/noanimate/${url}`;
  
  const imageContainer = container.querySelector('.website-preview-image');
  if (imageContainer) {
    const img = document.createElement('img');
    img.className = 'w-full h-full object-cover';
    img.alt = 'Website preview';
    
    // Handle image load success
    img.onload = function() {
      imageContainer.innerHTML = '';
      imageContainer.appendChild(img);
    };
    
    // Handle image load error - keep the default icon
    img.onerror = function() {
      // Keep the existing content
    };
    
    img.src = screenshotUrl;
  }
}

/**
 * Get a display title from the URL
 * @param {string} url Full URL
 * @param {string} domain Domain name
 * @returns {string} Display title
 */
function getDisplayTitle(url, domain) {
  // Try to extract a title from the URL path
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
  
  if (pathSegments.length > 0) {
    // Get the last meaningful segment
    let titleSegment = pathSegments[pathSegments.length - 1];
    
    // Remove file extensions and query parameters
    titleSegment = titleSegment.replace(/\.(html|php|asp|jsp)$/, '');
    
    // Replace dashes and underscores with spaces
    titleSegment = titleSegment.replace(/[-_]/g, ' ');
    
    // Capitalize words
    titleSegment = titleSegment.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    if (titleSegment.length > 3) {
      return titleSegment;
    }
  }
  
  // Fallback to domain name with first letter capitalized
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * Get a description from the URL
 * @param {string} url Website URL
 * @returns {string} Description
 */
function getDescriptionFromUrl(url) {
  const urlObj = new URL(url);
  
  // Check if it's a specific type of site we can create a better description for
  if (urlObj.hostname.includes('github.com')) {
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    if (pathSegments.length >= 2) {
      return `GitHub repository by ${pathSegments[0]}`;
    }
    return 'GitHub - Where the world builds software';
  }
  
  if (urlObj.hostname.includes('medium.com')) {
    return 'Article on Medium - Where good ideas find you';
  }
  
  if (urlObj.hostname.includes('wikipedia.org')) {
    return 'Wikipedia article - The Free Encyclopedia';
  }
  
  // Generic description
  return `Web page on ${urlObj.hostname.replace(/^www\./, '')}`;
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
