/**
 * Auth UI Component
 * Provides UI components for authentication and user management
 */

import { getAuthState, logout, subscribeToAuth } from './AuthContext.js';
import { showLoginForm } from './LoginForm.js';
import { showRegisterForm } from './RegisterForm.js';

// Store the current user state
let currentUser = null;

/**
 * Initialize the auth UI
 * This should be called when the app starts
 */
export function initAuthUI() {
  try {
    // Get current auth state
    const authState = getAuthState();
    currentUser = authState.user;
    updateAuthUI();
    
    // Subscribe to auth state changes
    subscribeToAuth((state) => {
      currentUser = state.user;
      updateAuthUI();
    });
    
    // Add event listeners for auth buttons
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing auth UI:', error);
  }
}

/**
 * Set up event listeners for auth-related UI elements
 */
function setupEventListeners() {
  // Global click handler for auth buttons
  document.addEventListener('click', (e) => {
    // Login button
    if (e.target.id === 'loginButton' || e.target.closest('#loginButton')) {
      showLoginForm();
    }
    
    // Register button
    if (e.target.id === 'registerButton' || e.target.closest('#registerButton')) {
      showRegisterForm();
    }
    
    // Logout button
    if (e.target.id === 'logoutButton' || e.target.closest('#logoutButton')) {
      handleLogout();
    }
    
    // User menu toggle
    if (e.target.id === 'userMenuButton' || e.target.closest('#userMenuButton')) {
      const menu = document.getElementById('userMenu');
      if (menu) {
        menu.classList.toggle('hidden');
      }
    }
    
    // Close user menu when clicking outside
    if (!e.target.closest('#userMenuButton') && !e.target.closest('#userMenu')) {
      const menu = document.getElementById('userMenu');
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
      }
    }
    
    // Switch between login and register forms
    if (e.target.id === 'showLoginForm') {
      e.preventDefault();
      // Remove existing modal
      const modal = document.getElementById('authModal');
      if (modal) {
        document.body.removeChild(modal);
      }
      showLoginForm();
    }
    
    if (e.target.id === 'showRegisterForm') {
      e.preventDefault();
      // Remove existing modal
      const modal = document.getElementById('authModal');
      if (modal) {
        document.body.removeChild(modal);
      }
      showRegisterForm();
    }
  });
}

/**
 * Handle user logout
 */
async function handleLogout() {
  try {
    await logout();
    // No need to update currentUser or UI here as the auth state change will trigger the subscriber
    
    // Show logout success message
    showNotification('You have been logged out successfully');
    
  } catch (error) {
    console.error('Error logging out:', error);
    showNotification('Failed to log out. Please try again.', 'error');
  }
}

/**
 * Update the UI based on authentication state
 */
export function updateAuthUI() {
  const authButtonsContainer = document.getElementById('authButtons');
  
  // If the container doesn't exist yet, create it
  if (!authButtonsContainer) {
    createAuthButtonsContainer();
    return;
  }
  
  // Update the container based on auth state
  if (currentUser) {
    // User is logged in
    authButtonsContainer.innerHTML = createLoggedInUI(currentUser);
  } else {
    // User is not logged in
    authButtonsContainer.innerHTML = createLoggedOutUI();
  }
}

/**
 * Create the auth buttons container if it doesn't exist
 */
function createAuthButtonsContainer() {
  // Check if we're in the header section
  const header = document.querySelector('header');
  
  if (header) {
    // Create the auth buttons container
    const authButtonsContainer = document.createElement('div');
    authButtonsContainer.id = 'authButtons';
    authButtonsContainer.className = 'ml-auto flex items-center';
    
    // Add the container to the header
    header.appendChild(authButtonsContainer);
    
    // Update the container based on auth state
    updateAuthUI();
  }
}

/**
 * Create UI for logged in users
 * @param {Object} user - The current user object
 * @returns {string} HTML for logged in state
 */
function createLoggedInUI(user) {
  return `
    <div class="flex items-center">
      <span class="text-sm text-gray-700 mr-3 hidden sm:inline">
        ${user.email || 'User'}
      </span>
      <div class="relative">
        <button
          id="userMenuButton"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
          aria-expanded="false"
        >
          <span class="sr-only">User menu</span>
          <span class="text-sm font-medium">${getUserInitials(user)}</span>
        </button>
        <div
          id="userMenu"
          class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden"
        >
          <a
            href="#profile"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Your Profile
          </a>
          <a
            href="#settings"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>
          <hr class="my-1 border-gray-200">
          <button
            id="logoutButton"
            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create UI for logged out users
 * @returns {string} HTML for logged out state
 */
function createLoggedOutUI() {
  return `
    <div class="flex items-center space-x-2">
      <button
        id="loginButton"
        class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        Log in
      </button>
      <button
        id="registerButton"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Sign up
      </button>
    </div>
  `;
}

/**
 * Get user initials from email or name
 * @param {Object} user - User object
 * @returns {string} User initials
 */
function getUserInitials(user) {
  if (!user) return '?';
  
  // If user has a name, use the first letter of first and last name
  if (user.user_metadata && user.user_metadata.full_name) {
    const nameParts = user.user_metadata.full_name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  }
  
  // Otherwise use the first letter of the email
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  
  return '?';
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-md z-50 ${
    type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
  }`;
  notification.textContent = message;
  
  // Add to the document
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

/**
 * Update the current user
 * @param {Object} user - The new user object
 */
export function setCurrentUser(user) {
  currentUser = user;
  updateAuthUI();
}
