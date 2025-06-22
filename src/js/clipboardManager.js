/**
 * Clipboard Manager for Boardie
 * Handles clipboard operations and link detection
 */

import { getPlatformFromUrl } from './utils.js';

// Regular expression to match URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Track last clipboard check time to prevent duplicate checks
let lastClipboardCheckTime = 0;
const CLIPBOARD_CHECK_COOLDOWN_MS = 2000; // 2 seconds cooldown between checks

/**
 * Check if a string contains a URL
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains a URL
 */
function containsUrl(text) {
  return text && URL_REGEX.test(text);
}

/**
 * Extract the first URL from text
 * @param {string} text - Text to extract URL from
 * @returns {string|null} First URL found or null
 */
function extractUrl(text) {
  if (!text) return null;
  
  const matches = text.match(URL_REGEX);
  return matches && matches.length > 0 ? matches[0] : null;
}

/**
 * Save a URL to localStorage for later retrieval
 * @param {string} url - URL to save
 */
function saveClipboardUrl(url) {
  if (!url) return;
  
  try {
    localStorage.setItem('boardie_clipboard_url', url);
    localStorage.setItem('boardie_clipboard_timestamp', Date.now().toString());
    console.log('Saved URL to clipboard storage:', url);
  } catch (error) {
    console.error('Error saving clipboard URL to localStorage:', error);
  }
}

/**
 * Get saved clipboard URL if it exists and is recent
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 5 minutes)
 * @returns {string|null} Saved URL or null if none exists or is too old
 */
function getSavedClipboardUrl(maxAgeMs = 5 * 60 * 1000) {
  try {
    const url = localStorage.getItem('boardie_clipboard_url');
    const timestamp = localStorage.getItem('boardie_clipboard_timestamp');
    
    if (!url || !timestamp) return null;
    
    const savedTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    
    // Check if URL is recent enough
    if (currentTime - savedTime > maxAgeMs) {
      // URL is too old, clear it
      clearSavedClipboardUrl();
      return null;
    }
    
    return url;
  } catch (error) {
    console.error('Error getting saved clipboard URL:', error);
    return null;
  }
}

/**
 * Clear saved clipboard URL
 */
function clearSavedClipboardUrl() {
  try {
    localStorage.removeItem('boardie_clipboard_url');
    localStorage.removeItem('boardie_clipboard_timestamp');
  } catch (error) {
    console.error('Error clearing saved clipboard URL:', error);
  }
}

/**
 * Read from clipboard and check for URLs
 * @returns {Promise<string|null>} URL from clipboard or null
 */
async function readClipboardUrl() {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      console.warn('Clipboard API not available');
      return null;
    }
    
    // Request permission to read clipboard
    const text = await navigator.clipboard.readText();
    const url = extractUrl(text);
    
    if (url) {
      console.log('Found URL in clipboard:', url);
      saveClipboardUrl(url);
      return url;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading from clipboard:', error);
    return null;
  }
}

/**
 * Check if clipboard contains a URL and open the add link modal if it does
 * @param {Function} openAddLinkModal - Function to open the add link modal
 * @returns {Promise<boolean>} True if URL was found and modal opened
 */
async function checkClipboardAndOpenModal(openAddLinkModal) {
  if (!openAddLinkModal || typeof openAddLinkModal !== 'function') {
    console.error('Invalid openAddLinkModal function');
    return false;
  }
  
  // Check if we've recently checked the clipboard to prevent duplicate checks
  const currentTime = Date.now();
  if (currentTime - lastClipboardCheckTime < CLIPBOARD_CHECK_COOLDOWN_MS) {
    console.log('Skipping clipboard check - too soon since last check');
    return false;
  }
  
  // Update the last check time
  lastClipboardCheckTime = currentTime;
  
  // First check if we have a saved URL
  let url = getSavedClipboardUrl();
  
  // If no saved URL, try to read from clipboard
  if (!url) {
    url = await readClipboardUrl();
  }
  
  // If we found a URL, open the modal
  if (url) {
    openAddLinkModal(url);
    clearSavedClipboardUrl(); // Clear after using
    return true;
  }
  
  return false;
}

export {
  readClipboardUrl,
  checkClipboardAndOpenModal,
  saveClipboardUrl,
  getSavedClipboardUrl,
  clearSavedClipboardUrl,
  containsUrl,
  extractUrl
};
