/**
 * Pinterest Embed Handler
 * Handles embedding of Pinterest pins and boards
 */

import { fetchMetadata } from '../utils/metadataFetcher.js';

/**
 * Create a Pinterest embed
 * @param {string} url Pinterest URL
 * @param {HTMLElement} container Container element for the embed
 */
export function createPinterestEmbed(url, container) {
  // Create a placeholder while the Pinterest content loads
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 animate-pulse p-4 h-64 flex items-center justify-center';
  placeholder.innerHTML = '<p class="text-gray-500">Loading Pinterest content...</p>';
  container.appendChild(placeholder);

  // Determine if it's a pin or board
  const isPinUrl = url.includes('/pin/');
  // Board URLs can be in format /username/boardname/ or /username/board/boardname/
  const isBoardUrl = url.includes('/board/') || (/pinterest\.com\/([^\/]+)\/([^\/]+)\/?$/.test(url) && !url.includes('/pin/'));
  
  if (!isPinUrl && !isBoardUrl) {
    showEmbedError(container, 'Invalid Pinterest URL', url);
    return;
  }

  // Extract pin ID or board info for fallback purposes
  let pinId = '';
  let boardInfo = { username: '', boardName: '' };
  
  if (isPinUrl) {
    pinId = extractPinId(url);
    if (!pinId) {
      showEmbedError(container, 'Invalid Pinterest pin URL', url);
      return;
    }
  } else if (isBoardUrl) {
    boardInfo = extractBoardInfo(url);
    if (!boardInfo.username || !boardInfo.boardName) {
      showEmbedError(container, 'Invalid Pinterest board URL', url);
      return;
    }
  }
  
  // Clear any existing embeds in the container first
  const existingEmbeds = container.querySelectorAll('.pinterest-official-embed, .pinterest-fallback-container');
  existingEmbeds.forEach(embed => embed.remove());
  
  // Create a container for the official Pinterest embed
  const officialEmbedContainer = document.createElement('div');
  officialEmbedContainer.className = 'pinterest-official-embed';
  officialEmbedContainer.style.display = 'block'; // Make sure it's visible by default
  
  // Create the official Pinterest embed
  if (isPinUrl) {
    const pinEmbed = document.createElement('a');
    pinEmbed.href = url;
    pinEmbed.setAttribute('data-pin-do', 'embedPin');
    pinEmbed.setAttribute('data-pin-width', 'medium'); // Use medium size for better display
    officialEmbedContainer.appendChild(pinEmbed);
  } else if (isBoardUrl) {
    const boardEmbed = document.createElement('a');
    boardEmbed.href = url;
    boardEmbed.setAttribute('data-pin-do', 'embedBoard');
    boardEmbed.setAttribute('data-pin-board-width', '100%');
    boardEmbed.setAttribute('data-pin-scale-height', '400');
    boardEmbed.setAttribute('data-pin-scale-width', '60'); // Reduced to avoid multiple boards
    // Set a fixed number of columns to 1 to ensure only one board is displayed
    boardEmbed.setAttribute('data-pin-columns', '1');
    officialEmbedContainer.appendChild(boardEmbed);
  }
  
  // Add the official embed container to the main container
  container.appendChild(officialEmbedContainer);
  
  // Create a fallback container for our custom solution (hidden initially)
  const fallbackContainer = document.createElement('div');
  fallbackContainer.className = 'pinterest-fallback-container';
  fallbackContainer.style.display = 'none';
  container.appendChild(fallbackContainer);
  
  // Load the Pinterest script for the official embed
  loadPinterestScript();
  
  // Set a timeout to check if the official embed loaded correctly
  const embedTimeout = setTimeout(() => {
    // Check if the official embed has rendered content
    const hasContent = officialEmbedContainer.querySelector('iframe, span[data-pin-href]');
    
    if (!hasContent) {
      console.log('Pinterest official embed failed to load, using fallback');
      // Hide the official embed container
      officialEmbedContainer.style.display = 'none';
      
      // Show the fallback container
      fallbackContainer.style.display = 'block';
      
      // Fetch metadata using our Cloudflare Worker for the fallback
      fetchMetadata(url).then(metadata => {
        // Create a rich preview card with the fetched metadata
        createPinterestMetadataCard(url, fallbackContainer, metadata, isPinUrl);
      }).catch(error => {
        console.error('Error fetching Pinterest metadata:', error);
        // Fallback to the old method if metadata fetching fails
        createPinterestPreviewCard(url, fallbackContainer, isPinUrl, pinId, boardInfo);
      });
    } else {
      // If official embed loaded successfully, make sure fallback is hidden
      fallbackContainer.style.display = 'none';
      // And make sure official embed is visible
      officialEmbedContainer.style.display = 'block';
    }
  }, 3000); // Give the official embed 3 seconds to load
  
  // Remove placeholder after setting up both options
  if (placeholder && placeholder.parentNode) {
    placeholder.remove();
  }
}

/**
 * Create a rich preview card for Pinterest content
 * @param {string} url Original Pinterest URL
 * @param {HTMLElement} container Container element
 * @param {boolean} isPinUrl Whether the URL is for a pin
 * @param {string} pinId Pin ID if applicable
 * @param {Object} boardInfo Board info if applicable
 */
function createPinterestPreviewCard(url, container, isPinUrl, pinId, boardInfo) {
  // Create the preview card container
  const previewCard = document.createElement('div');
  previewCard.className = 'pinterest-preview-card bg-white border border-gray-200 rounded-lg overflow-hidden';
  
  // Pinterest branding header
  const header = document.createElement('div');
  header.className = 'flex items-center p-3 bg-red-50 border-b border-gray-200';
  header.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 mr-2 text-red-600">
      <path fill="currentColor" d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44.2-.84 1.3-5.34 1.3-5.34s-.33-.67-.33-1.66c0-1.56.9-2.73 2.02-2.73.96 0 1.42.72 1.42 1.58 0 .96-.61 2.4-.93 3.74-.26 1.1.56 2.01 1.65 2.01 1.97 0 3.5-2.08 3.5-5.09 0-2.66-1.9-4.52-4.62-4.52-3.16 0-5.01 2.36-5.01 4.8 0 .95.37 1.96.82 2.52.1.11.1.2.08.31-.1.37-.3 1.16-.34 1.32-.05.21-.18.26-.4.16-1.5-.7-2.42-2.89-2.42-4.65 0-3.77 2.74-7.25 7.9-7.25 4.14 0 7.36 2.95 7.36 6.9 0 4.11-2.59 7.43-6.18 7.43-1.21 0-2.35-.63-2.74-1.37l-.74 2.84c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z"/>
    </svg>
    <span class="font-semibold text-gray-800">${isPinUrl ? 'Pinterest Pin' : 'Pinterest Board'}</span>
  `;
  
  // Image placeholder
  const imageContainer = document.createElement('div');
  imageContainer.className = 'w-full aspect-square bg-gray-100 flex items-center justify-center';
  imageContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  `;
  
  // Description section
  const description = document.createElement('div');
  description.className = 'p-4';
  
  // Content description
  const contentDesc = document.createElement('p');
  contentDesc.className = 'text-sm text-gray-600 mb-4';
  
  if (isPinUrl) {
    contentDesc.textContent = 'View this Pinterest pin to discover creative ideas and inspiration.';
    
    // Add pin ID if available
    if (pinId) {
      const pinInfo = document.createElement('p');
      pinInfo.className = 'text-xs text-gray-500 mt-2';
      pinInfo.textContent = `Pin ID: ${pinId}`;
      description.appendChild(contentDesc);
      description.appendChild(pinInfo);
    } else {
      description.appendChild(contentDesc);
    }
  } else {
    contentDesc.textContent = 'Explore this Pinterest board to discover a collection of related pins and ideas.';
    description.appendChild(contentDesc);
    
    // Add board info if available
    if (boardInfo.username && boardInfo.boardName) {
      const boardInfoText = document.createElement('p');
      boardInfoText.className = 'text-xs text-gray-500 mt-2';
      boardInfoText.textContent = `Board by ${boardInfo.username}: ${boardInfo.boardName.replace(/-/g, ' ')}`;
      description.appendChild(boardInfoText);
    }
  }
  
  // URL display
  const urlDisplay = document.createElement('div');
  urlDisplay.className = 'mt-2 text-xs text-gray-500 truncate';
  urlDisplay.textContent = url;
  description.appendChild(urlDisplay);
  
  // Action button
  const button = document.createElement('a');
  button.href = url;
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.className = 'block w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-center rounded-b-lg transition-colors mt-4';
  button.textContent = isPinUrl ? 'View Pin on Pinterest' : 'View Board on Pinterest';
  description.appendChild(button);
  
  // Assemble the preview card
  previewCard.appendChild(header);
  previewCard.appendChild(imageContainer);
  previewCard.appendChild(description);
  
  // Add the preview card to the container
  container.appendChild(previewCard);
}

/**
 * Extract Pinterest pin ID from URL
 * @param {string} url Pinterest pin URL
 * @returns {string} Pinterest pin ID
 */
function extractPinId(url) {
  // Handle various Pinterest pin URL formats
  const regex = /pinterest\.com\/pin\/([0-9]+)/i;
  const match = url.match(regex);
  
  return match ? match[1] : '';
}

/**
 * Extract Pinterest board info from URL
 * @param {string} url Pinterest board URL
 * @returns {Object} Object with username and boardName
 */
function extractBoardInfo(url) {
  // Handle various Pinterest board URL formats
  // Format 1: pinterest.com/username/board/boardname/
  // Format 2: pinterest.com/username/boardname/
  
  let username = '';
  let boardName = '';
  
  // Try the /board/ format first
  const boardRegex = /pinterest\.com\/([^\/]+)\/board\/([^\/]+)/i;
  const boardMatch = url.match(boardRegex);
  
  if (boardMatch) {
    username = boardMatch[1];
    boardName = boardMatch[2];
  } else {
    // Try the direct format: pinterest.com/username/boardname/
    const directRegex = /pinterest\.com\/([^\/]+)\/([^\/]+)\/?$/i;
    const directMatch = url.match(directRegex);
    
    if (directMatch && !url.includes('/pin/')) {
      username = directMatch[1];
      boardName = directMatch[2];
    }
  }
  
  return { username, boardName };
}

/**
 * Load Pinterest widget script if not already loaded
 */
function loadPinterestScript() {
  // Check if Pinterest script is already loaded
  if (window.PinUtils && window.PinUtils.build) {
    console.log('Pinterest widgets already loaded');
    return;
  }
  
  console.log('Loading Pinterest widget script');
  
  // Set up a global error handler to catch Pinterest errors
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('Cannot read properties of null')) {
      console.warn('Caught Pinterest error:', event.message);
      event.preventDefault();
      event.stopPropagation();
      return true; // Prevent the error from bubbling up
    }
  }, true);
  
  // Create the script element
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = '//assets.pinterest.com/js/pinit.js';
  script.setAttribute('data-pin-build', 'doBuild');
  
  // Add a flag to prevent multiple loads
  window.PinterestLoaded = true;
  
  // Setup callback for when script is loaded
  script.onload = function() {
    console.log('Pinterest script loaded successfully');
    
    // Check if there's a global Pinterest object
    if (window.PinUtils) {
      console.log('PinUtils is available, will build pins');
      
      // Force Pinterest to rebuild pins
      if (typeof window.PinUtils.build === 'function') {
        setTimeout(() => {
          try {
            console.log('Rebuilding Pinterest pins');
            window.PinUtils.build();
            
            // Make adjustments to the Pinterest embeds
            adjustPinterestEmbeds();
          } catch (error) {
            console.error('Error rebuilding Pinterest pins:', error);
          }
        }, 1000); // Delay to ensure DOM is ready
      }
    } else {
      console.log('PinUtils not available yet, will try again');
      
      // Try again after a delay
      setTimeout(() => {
        if (window.PinUtils && typeof window.PinUtils.build === 'function') {
          try {
            console.log('Rebuilding Pinterest pins (delayed)');
            window.PinUtils.build();
            
            // Make adjustments to the Pinterest embeds
            adjustPinterestEmbeds();
          } catch (error) {
            console.error('Error rebuilding Pinterest pins:', error);
          }
        } else {
          console.warn('PinUtils still not available after delay');
        }
      }, 2000);
    }
  };
  
  // Handle script load error
  script.onerror = function() {
    console.error('Failed to load Pinterest script');
    window.PinterestLoaded = false; // Reset flag to allow retry
  };
  
  // Add the script to the document
  document.head.appendChild(script);
}

/**
 * Make minor adjustments to Pinterest embeds to ensure they display correctly
 */
function adjustPinterestEmbeds() {
  console.log('Adjusting Pinterest embeds to fit properly');
  
  // Find all Pinterest embed containers
  const containers = document.querySelectorAll('.pinterest-official-embed');
  containers.forEach(container => {
    // Ensure container is centered
    container.style.textAlign = 'center';
    container.style.width = '100%';
    container.style.maxWidth = '100%';
    container.style.margin = '0 auto';
    
    // Find any Pinterest iframes and ensure they're properly sized
    const iframes = container.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      // Make sure iframe is not too small
      if (iframe.width < 300) {
        iframe.style.minWidth = '300px';
      }
      // Ensure the iframe is responsive
      iframe.style.maxWidth = '100%';
    });
    
    // Find any Pinterest pins and ensure they're properly sized
    const pins = container.querySelectorAll('[data-pin-do="embedPin"]');
    pins.forEach(pin => {
      // Center pins but don't force width
      pin.style.margin = '0 auto';
      pin.style.display = 'block';
    });
    
    // Find any Pinterest boards and ensure they're properly sized
    const boards = container.querySelectorAll('[data-pin-do="embedBoard"]');
    boards.forEach(board => {
      // Make board containers full width
      board.style.width = '100%';
      board.style.maxWidth = '100%';
      
      // Ensure board has only one column
      if (!board.hasAttribute('data-pin-columns')) {
        board.setAttribute('data-pin-columns', '1');
      }
      
      // Also adjust parent node if needed
      if (board.parentNode) {
        board.parentNode.style.width = '100%';
      }
      
      // Find any board widgets that might have been created and ensure they have one column
      const boardWidgets = container.querySelectorAll('.pinterest-board-widget');
      boardWidgets.forEach(widget => {
        widget.style.maxWidth = '100%';
        widget.style.width = '100%';
      });
    });
  });
}

/**
 * Create a Pinterest preview card using metadata from our Cloudflare Worker
 * @param {string} url Original Pinterest URL
 * @param {HTMLElement} container Container element
 * @param {Object} metadata Metadata object from the Cloudflare Worker
 * @param {boolean} isPinUrl Whether the URL is for a pin
 */
function createPinterestMetadataCard(url, container, metadata, isPinUrl) {
  // Create the preview card container
  const previewCard = document.createElement('div');
  previewCard.className = 'pinterest-preview-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm';
  
  // Build the card HTML
  let cardHTML = '';
  
  // Add image if available
  if (metadata.image) {
    cardHTML += `
      <div class="pinterest-preview-image-container w-full aspect-square bg-gray-100 overflow-hidden">
        <img src="${metadata.image}" alt="${metadata.title || 'Pinterest'}" class="w-full h-full object-cover">
      </div>
    `;
  }
  
  // Pinterest branding header
  cardHTML += `
    <div class="flex items-center p-3 ${metadata.image ? 'border-t border-gray-200' : 'bg-red-50 border-b border-gray-200'}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 text-red-600 flex-shrink-0">
        <path fill="currentColor" d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44.2-.84 1.3-5.34 1.3-5.34s-.33-.67-.33-1.66c0-1.56.9-2.73 2.02-2.73.96 0 1.42.72 1.42 1.58 0 .96-.61 2.4-.93 3.74-.26 1.1.56 2.01 1.65 2.01 1.97 0 3.5-2.08 3.5-5.09 0-2.66-1.9-4.52-4.62-4.52-3.16 0-5.01 2.36-5.01 4.8 0 .95.37 1.96.82 2.52.1.11.1.2.08.31-.1.37-.3 1.16-.34 1.32-.05.21-.18.26-.4.16-1.5-.7-2.42-2.89-2.42-4.65 0-3.77 2.74-7.25 7.9-7.25 4.14 0 7.36 2.95 7.36 6.9 0 4.11-2.59 7.43-6.18 7.43-1.21 0-2.35-.63-2.74-1.37l-.74 2.84c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z"/>
      </svg>
      <span class="font-semibold text-gray-800 text-sm">${metadata.siteName || 'Pinterest'}</span>
    </div>
  `;
  
  // Content section with title, description, and URL
  cardHTML += `
    <div class="p-4">
      <h3 class="font-bold text-gray-900 mb-1 text-base leading-tight">${metadata.title || (isPinUrl ? 'Pinterest Pin' : 'Pinterest Board')}</h3>
      <p class="text-sm text-gray-600 mb-2 line-clamp-2">${metadata.description || 'View this content on Pinterest'}</p>
      <p class="text-xs text-gray-500 truncate">${url}</p>
    </div>
  `;
  
  // Set the card HTML
  previewCard.innerHTML = cardHTML;
  
  // Make the entire card clickable instead of having a separate button
  previewCard.onclick = function() {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  previewCard.style.cursor = 'pointer';
  
  // Add the preview card to the container
  container.appendChild(previewCard);
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
