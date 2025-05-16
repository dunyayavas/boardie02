/**
 * Register Form Component
 * Provides a form for users to create a new account
 */

import { useAuth } from './AuthContext.js';

/**
 * Register Form Component
 * @returns {HTMLElement} The registration form element
 */
export function createRegisterForm() {
  // Create the form container
  const formContainer = document.createElement('div');
  formContainer.className = 'auth-form-container bg-white p-6 rounded-lg shadow-md max-w-md mx-auto';
  
  // Create the form
  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.id = 'registerForm';
  
  // Form title
  const title = document.createElement('h2');
  title.className = 'text-2xl font-bold text-center text-gray-800 mb-6';
  title.textContent = 'Create your account';
  
  // Email input
  const emailGroup = document.createElement('div');
  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'registerEmail';
  emailLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  emailLabel.textContent = 'Email';
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'registerEmail';
  emailInput.name = 'email';
  emailInput.required = true;
  emailInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  emailInput.placeholder = 'you@example.com';
  
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  
  // Password input
  const passwordGroup = document.createElement('div');
  const passwordLabel = document.createElement('label');
  passwordLabel.htmlFor = 'registerPassword';
  passwordLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  passwordLabel.textContent = 'Password';
  
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'registerPassword';
  passwordInput.name = 'password';
  passwordInput.required = true;
  passwordInput.minLength = 8;
  passwordInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  passwordInput.placeholder = 'Minimum 8 characters';
  
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  
  // Confirm password input
  const confirmPasswordGroup = document.createElement('div');
  const confirmPasswordLabel = document.createElement('label');
  confirmPasswordLabel.htmlFor = 'confirmPassword';
  confirmPasswordLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  confirmPasswordLabel.textContent = 'Confirm Password';
  
  const confirmPasswordInput = document.createElement('input');
  confirmPasswordInput.type = 'password';
  confirmPasswordInput.id = 'confirmPassword';
  confirmPasswordInput.name = 'confirmPassword';
  confirmPasswordInput.required = true;
  confirmPasswordInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  confirmPasswordInput.placeholder = 'Confirm your password';
  
  confirmPasswordGroup.appendChild(confirmPasswordLabel);
  confirmPasswordGroup.appendChild(confirmPasswordInput);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200';
  submitButton.textContent = 'Create Account';
  
  // Error message container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'text-red-600 text-sm hidden';
  errorContainer.id = 'registerError';
  
  // Login link
  const loginLink = document.createElement('div');
  loginLink.className = 'text-center mt-4 text-sm';
  loginLink.innerHTML = `Already have an account? <a href="#" id="showLoginForm" class="text-blue-600 hover:text-blue-800">Sign in</a>`;
  
  // Terms and conditions
  const termsText = document.createElement('p');
  termsText.className = 'text-xs text-gray-500 mt-4 text-center';
  termsText.innerHTML = `By creating an account, you agree to our <a href="#" class="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" class="text-blue-600 hover:underline">Privacy Policy</a>.`;
  
  // Assemble the form
  form.appendChild(title);
  form.appendChild(emailGroup);
  form.appendChild(passwordGroup);
  form.appendChild(confirmPasswordGroup);
  form.appendChild(errorContainer);
  form.appendChild(submitButton);
  form.appendChild(loginLink);
  form.appendChild(termsText);
  
  // Add the form to the container
  formContainer.appendChild(form);
  
  // Add event listener for form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Clear previous errors
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      errorContainer.textContent = 'Passwords do not match.';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    // Disable the submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Creating account...';
    
    try {
      // Get the auth functions
      const { register } = useAuth();
      
      // Attempt to register
      await register(email, password);
      
      // Show success message or redirect
      // This will be handled by the auth state change in AuthContext
      
    } catch (error) {
      // Show error message
      errorContainer.textContent = error.message || 'Failed to create account. Please try again.';
      errorContainer.classList.remove('hidden');
      
      // Reset the submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Create Account';
    }
  });
  
  return formContainer;
}

/**
 * Show the registration form in a modal
 */
export function showRegisterForm() {
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
  
  // Add the registration form
  const registerForm = createRegisterForm();
  
  // Assemble the modal
  modal.appendChild(closeButton);
  modal.appendChild(registerForm);
  backdrop.appendChild(modal);
  
  // Add to the document
  document.body.appendChild(backdrop);
  
  // Focus the email input
  setTimeout(() => {
    document.getElementById('registerEmail').focus();
  }, 100);
}
