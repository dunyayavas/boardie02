/**
 * Login Form Component
 * Provides a form for users to sign in to their account
 */

import { login } from './AuthContext.js';

/**
 * Login Form Component
 * @returns {HTMLElement} The login form element
 */
export function createLoginForm() {
  // Create the form container
  const formContainer = document.createElement('div');
  formContainer.className = 'auth-form-container bg-white p-6 rounded-lg shadow-md max-w-md mx-auto';
  
  // Create the form
  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.id = 'loginForm';
  
  // Form title
  const title = document.createElement('h2');
  title.className = 'text-2xl font-bold text-center text-gray-800 mb-6';
  title.textContent = 'Log in to Boardie';
  
  // Email input
  const emailGroup = document.createElement('div');
  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'email';
  emailLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  emailLabel.textContent = 'Email';
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'email';
  emailInput.name = 'email';
  emailInput.required = true;
  emailInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  emailInput.placeholder = 'you@example.com';
  
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  
  // Password input
  const passwordGroup = document.createElement('div');
  const passwordLabel = document.createElement('label');
  passwordLabel.htmlFor = 'password';
  passwordLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  passwordLabel.textContent = 'Password';
  
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'password';
  passwordInput.name = 'password';
  passwordInput.required = true;
  passwordInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  passwordInput.placeholder = '••••••••';
  
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200';
  submitButton.textContent = 'Sign in';
  
  // Error message container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'text-red-600 text-sm hidden';
  errorContainer.id = 'loginError';
  
  // Register link
  const registerLink = document.createElement('div');
  registerLink.className = 'text-center mt-4 text-sm';
  registerLink.innerHTML = `Don't have an account? <a href="#" id="showRegisterForm" class="text-blue-600 hover:text-blue-800">Sign up</a>`;
  
  // Assemble the form
  form.appendChild(title);
  form.appendChild(emailGroup);
  form.appendChild(passwordGroup);
  form.appendChild(errorContainer);
  form.appendChild(submitButton);
  form.appendChild(registerLink);
  
  // Add the form to the container
  formContainer.appendChild(form);
  
  // Add event listener for form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Clear previous errors
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
    
    // Disable the submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Signing in...';
    
    try {
      // Attempt to sign in
      await login(email, password);
      
      // Close the modal or redirect if successful
      // This will be handled by the auth state change in AuthContext
      
    } catch (error) {
      // Show error message
      errorContainer.textContent = error.message || 'Failed to sign in. Please check your credentials.';
      errorContainer.classList.remove('hidden');
      
      // Reset the submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
    }
  });
  
  return formContainer;
}

/**
 * Show the login form in a modal
 */
export function showLoginForm() {
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  backdrop.id = 'authModal';
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4';
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.className = 'absolute top-4 right-4 text-gray-400 hover:text-gray-600';
  closeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(backdrop);
  });
  
  // Add the login form
  const loginForm = createLoginForm();
  
  // Assemble the modal
  modal.appendChild(closeButton);
  modal.appendChild(loginForm);
  backdrop.appendChild(modal);
  
  // Add to the document
  document.body.appendChild(backdrop);
  
  // Focus the email input
  setTimeout(() => {
    document.getElementById('email').focus();
  }, 100);
}

/**
 * Initialize auth UI event listeners
 */
export function initAuthUI() {
  // Add event listeners to login/register buttons in the app
  document.addEventListener('click', (e) => {
    if (e.target.id === 'loginButton' || e.target.closest('#loginButton')) {
      showLoginForm();
    }
  });
}
