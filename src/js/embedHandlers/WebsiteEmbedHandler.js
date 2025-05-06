/**
 * Website Embed Handler
 * Handles embedding of generic websites with Open Graph data
 */

/**
 * Create a website embed with Open Graph data
 * @param {string} url Website URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createWebsiteEmbed(url, container) {
  // Create a placeholder while we fetch the Open Graph data
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 animate-pulse p-4 h-32 flex items-center justify-center';
  placeholder.innerHTML = '<p class="text-gray-500">Loading website data...</p>';
  container.appendChild(placeholder);

  // Create the website preview container
  const previewContainer = document.createElement('div');
  previewContainer.className = 'website-preview rounded-lg overflow-hidden border border-gray-200';
  
  // Fetch Open Graph data
  fetchOpenGraphData(url)
    .then(data => {
      // Remove placeholder
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }
      
      // Create the preview based on Open Graph data
      const hasImage = data.image && data.image.trim() !== '';
      
      let html = `
        <div class="website-preview-content">
      `;
      
      // Add image if available
      if (hasImage) {
        html += `
          <div class="website-preview-image">
            <img src="${data.image}" alt="${data.title || 'Website preview'}" class="w-full h-auto object-cover" onerror="this.style.display='none'">
          </div>
        `;
      }
      
      html += `
          <div class="website-preview-text p-4">
            <h3 class="text-lg font-semibold mb-2 line-clamp-2">${data.title || 'Website'}</h3>
            ${data.description ? `<p class="text-sm text-gray-600 mb-2 line-clamp-3">${data.description}</p>` : ''}
            <div class="text-xs text-gray-500 flex items-center">
              ${data.favicon ? `<img src="${data.favicon}" class="w-4 h-4 mr-1" onerror="this.style.display='none'">` : ''}
              <span>${new URL(url).hostname}</span>
            </div>
          </div>
        </div>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="block w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2 border-t border-gray-200">
          Visit Website
        </a>
      `;
      
      previewContainer.innerHTML = html;
      container.appendChild(previewContainer);
    })
    .catch(error => {
      console.error('Error fetching Open Graph data:', error);
      showEmbedError(container, 'Could not load website preview', url);
    });
}

/**
 * Fetch Open Graph data for a URL
 * @param {string} url URL to fetch Open Graph data for
 * @returns {Promise<Object>} Promise resolving to Open Graph data
 */
async function fetchOpenGraphData(url) {
  try {
    // Use a proxy service to fetch the Open Graph data
    // This avoids CORS issues when fetching from different domains
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No content returned from proxy');
    }
    
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    
    // Extract Open Graph data
    const ogData = {
      title: getMetaContent(doc, 'og:title') || getMetaContent(doc, 'twitter:title') || doc.title,
      description: getMetaContent(doc, 'og:description') || getMetaContent(doc, 'twitter:description') || getMetaContent(doc, 'description'),
      image: getMetaContent(doc, 'og:image') || getMetaContent(doc, 'twitter:image'),
      favicon: getFavicon(doc, url)
    };
    
    return ogData;
  } catch (error) {
    console.error('Error fetching Open Graph data:', error);
    // Return basic data if we can't fetch Open Graph data
    return {
      title: new URL(url).hostname,
      description: '',
      image: '',
      favicon: `https://www.google.com/s2/favicons?domain=${url}`
    };
  }
}

/**
 * Get meta tag content
 * @param {Document} doc Document to search
 * @param {string} property Meta property to search for
 * @returns {string} Meta tag content
 */
function getMetaContent(doc, property) {
  const meta = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  return meta ? meta.getAttribute('content') : '';
}

/**
 * Get favicon URL
 * @param {Document} doc Document to search
 * @param {string} url Base URL
 * @returns {string} Favicon URL
 */
function getFavicon(doc, url) {
  const favicon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon) {
    const faviconUrl = favicon.getAttribute('href');
    if (faviconUrl) {
      // Handle relative URLs
      if (faviconUrl.startsWith('/')) {
        const baseUrl = new URL(url);
        return `${baseUrl.protocol}//${baseUrl.host}${faviconUrl}`;
      }
      return faviconUrl;
    }
  }
  
  // Fallback to Google's favicon service
  return `https://www.google.com/s2/favicons?domain=${url}`;
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
