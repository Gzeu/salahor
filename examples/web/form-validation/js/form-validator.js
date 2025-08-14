// Import Salahor core
import { createEventStream, combineLatest, fromEvent, merge } from '../../../../packages/core/dist/index.js';

// DOM Elements
const form = document.getElementById('registrationForm');
const formStateEl = document.getElementById('formState');
const formSuccessToast = document.getElementById('formSuccess');
const termsModal = document.getElementById('termsModal');
const closeModalBtn = document.querySelector('.close-modal');
const termsLink = document.getElementById('termsLink');
const privacyLink = document.getElementById('privacyLink');

// Form state
const formState = {
  values: {},
  errors: {},
  touched: {},
  isValid: false,
  isSubmitting: false,
  isSubmitted: false,
  isDirty: false
};

// Validation rules
const validators = {
  required: (value, fieldName) => ({
    isValid: value.trim() !== '',
    message: `${fieldName} is required`
  }),
  
  email: (value) => ({
    isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Please enter a valid email address'
  }),
  
  minLength: (value, fieldName, param) => ({
    isValid: value.length >= parseInt(param, 10),
    message: `${fieldName} must be at least ${param} characters`
  }),
  
  maxLength: (value, fieldName, param) => ({
    isValid: value.length <= parseInt(param, 10),
    message: `${fieldName} must be less than ${param} characters`
  }),
  
  alphanumeric: (value, fieldName) => ({
    isValid: /^[a-zA-Z0-9]+$/.test(value),
    message: `${fieldName} can only contain letters and numbers`
  }),
  
  strongPassword: (value) => {
    const hasMinLength = value.length >= 8;
    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    return {
      isValid: hasMinLength && hasNumber && hasUpper && hasLower && hasSpecial,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
    };
  },
  
  match: (value, fieldName, param) => {
    const otherField = document.getElementById(param);
    return {
      isValid: !otherField || value === otherField.value,
      message: `Passwords do not match`
    };
  }
};

// Create event streams for form fields
const createFieldStream = (field) => {
  const input = field.querySelector('input, textarea, select');
  if (!input) return null;
  
  const name = input.name || input.id;
  const validationRules = input.dataset.validate ? input.dataset.validate.split(',') : [];
  
  // Create event streams for different events
  const input$ = fromEvent(input, 'input').map(e => ({
    type: 'input',
    value: e.target.value,
    name
  }));
  
  const blur$ = fromEvent(input, 'blur').map(e => ({
    type: 'blur',
    value: e.target.value,
    name
  }));
  
  // Merge input and blur events
  const field$ = merge(input$, blur$);
  
  // Add validation
  const validatedField$ = field$
    .map(event => {
      // Mark field as touched on blur
      if (event.type === 'blur') {
        formState.touched[event.name] = true;
      }
      
      // Update form state
      formState.values[event.name] = event.value;
      
      // Validate field
      const errors = [];
      let isValid = true;
      
      validationRules.forEach(rule => {
        const [ruleName, param] = rule.split(':');
        if (validators[ruleName]) {
          const result = validators[ruleName](event.value, input.labels[0]?.textContent || name, param);
          if (!result.isValid) {
            errors.push(result.message);
            isValid = false;
          }
        }
      });
      
      // Update form state
      formState.errors[event.name] = errors.length > 0 ? errors[0] : '';
      
      // Update UI
      updateFieldUI(event.name, errors, event.value);
      
      return {
        name: event.name,
        value: event.value,
        errors,
        isValid,
        isTouched: formState.touched[event.name] || false
      };
    });
  
  return validatedField$;
};

// Update field UI based on validation state
function updateFieldUI(fieldName, errors, value) {
  const field = document.querySelector(`[name="${fieldName}"]`);
  if (!field) return;
  
  const fieldContainer = field.closest('.form-group');
  const errorEl = document.getElementById(`${fieldName}-error`);
  const inputGroup = field.closest('.input-group');
  
  if (!fieldContainer || !errorEl || !inputGroup) return;
  
  // Reset classes
  inputGroup.classList.remove('valid', 'invalid', 'warning');
  errorEl.classList.remove('visible');
  
  // Update based on validation state
  if (errors.length > 0) {
    if (formState.touched[fieldName]) {
      inputGroup.classList.add('invalid');
      errorEl.textContent = errors[0];
      errorEl.classList.add('visible');
    }
  } else if (value && value.trim() !== '') {
    inputGroup.classList.add('valid');
  }
  
  // Special handling for password strength
  if (fieldName === 'password' && value) {
    updatePasswordStrength(value);
  }
  
  // Update form state display
  updateFormState();
}

// Update password strength meter
function updatePasswordStrength(password) {
  const strengthMeter = document.getElementById('password-strength');
  const strengthText = document.getElementById('password-strength-text');
  
  if (!strengthMeter || !strengthText) return;
  
  // Reset
  strengthMeter.style.width = '0%';
  strengthMeter.style.backgroundColor = '#ddd';
  
  if (!password) {
    strengthText.textContent = 'Password Strength';
    return;
  }
  
  // Calculate strength
  let strength = 0;
  let messages = [];
  
  // Length check
  if (password.length >= 8) strength += 20;
  else messages.push('at least 8 characters');
  
  // Contains numbers
  if (/[0-9]/.test(password)) strength += 20;
  else messages.push('include numbers');
  
  // Contains lowercase
  if (/[a-z]/.test(password)) strength += 20;
  else messages.push('include lowercase letters');
  
  // Contains uppercase
  if (/[A-Z]/.test(password)) strength += 20;
  else messages.push('include uppercase letters');
  
  // Contains special chars
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;
  else messages.push('include special characters');
  
  // Update UI
  strengthMeter.style.width = `${strength}%`;
  
  // Set color and text based on strength
  if (strength < 40) {
    strengthMeter.style.backgroundColor = '#ff4444';
    strengthText.textContent = 'Weak';
    strengthText.style.color = '#ff4444';
  } else if (strength < 80) {
    strengthMeter.style.backgroundColor = '#ffbb33';
    strengthText.textContent = 'Moderate';
    strengthText.style.color = '#ffbb33';
  } else {
    strengthMeter.style.backgroundColor = '#00C851';
    strengthText.textContent = 'Strong';
    strengthText.style.color = '#00C851';
  }
  
  // Add requirements text for weak passwords
  if (strength < 100 && messages.length > 0) {
    strengthText.textContent += ` - Needs ${messages.join(', ')}`;
  }
}

// Update form state display
function updateFormState() {
  // Check if form is valid
  const allFieldsValid = Object.values(formState.errors).every(error => !error);
  const allRequiredFilled = Array.from(form.querySelectorAll('[data-validate*="required"]'))
    .every(field => {
      const value = field.value || '';
      return value.trim() !== '';
    });
  
  formState.isValid = allFieldsValid && allRequiredFilled;
  
  // Update submit button
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = !formState.isValid || formState.isSubmitting;
  }
  
  // Update form state display
  if (formStateEl) {
    formStateEl.textContent = JSON.stringify({
      isValid: formState.isValid,
      isSubmitting: formState.isSubmitting,
      isSubmitted: formState.isSubmitted,
      isDirty: formState.isDirty,
      fields: Object.keys(formState.values).reduce((acc, key) => ({
        ...acc,
        [key]: {
          value: formState.values[key],
          error: formState.errors[key] || null,
          touched: formState.touched[key] || false
        }
      }), {})
    }, null, 2);
  }
}

// Handle form submission
function handleSubmit(event) {
  event.preventDefault();
  
  if (!formState.isValid || formState.isSubmitting) return;
  
  // Set submitting state
  formState.isSubmitting = true;
  formState.isDirty = true;
  updateFormState();
  
  // Show loading state
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    
    if (btnText) btnText.textContent = 'Submitting...';
    if (spinner) spinner.style.display = 'inline-block';
  }
  
  // Simulate API call
  setTimeout(() => {
    // Reset form
    form.reset();
    
    // Reset form state
    Object.keys(formState.values).forEach(key => {
      formState.values[key] = '';
      formState.errors[key] = '';
      formState.touched[key] = false;
    });
    
    // Update UI
    document.querySelectorAll('.input-group').forEach(group => {
      group.classList.remove('valid', 'invalid', 'warning');
    });
    
    document.querySelectorAll('.error-message').forEach(el => {
      el.classList.remove('visible');
    });
    
    // Reset password strength
    updatePasswordStrength('');
    
    // Update state
    formState.isSubmitting = false;
    formState.isSubmitted = true;
    formState.isDirty = false;
    
    // Show success message
    showSuccessMessage();
    
    // Update form state display
    updateFormState();
    
    // Reset submit button
    if (submitBtn) {
      const btnText = submitBtn.querySelector('.btn-text');
      const spinner = submitBtn.querySelector('.spinner');
      
      if (btnText) btnText.textContent = 'Create Account';
      if (spinner) spinner.style.display = 'none';
    }
  }, 1500);
}

// Show success message
function showSuccessMessage() {
  if (!formSuccessToast) return;
  
  formSuccessToast.classList.add('show');
  
  setTimeout(() => {
    formSuccessToast.classList.remove('show');
  }, 5000);
}

// Toggle password visibility
function setupPasswordToggle() {
  const toggleBtns = document.querySelectorAll('.toggle-password');
  
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

// Modal functionality
function setupModal() {
  function openModal() {
    termsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    termsModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Open modal when terms/privacy links are clicked
  if (termsLink) termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
  
  if (privacyLink) privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
  
  // Close modal when X is clicked
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside content
  termsModal.addEventListener('click', (e) => {
    if (e.target === termsModal) {
      closeModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && termsModal.classList.contains('active')) {
      closeModal();
    }
  });
}

// Initialize the form
function initForm() {
  if (!form) return;
  
  // Create event streams for all form fields
  const fields = Array.from(form.querySelectorAll('.form-group'));
  const fieldStreams = fields
    .map(createFieldStream)
    .filter(Boolean);
  
  // Combine all field streams
  const form$ = combineLatest(fieldStreams);
  
  // Subscribe to form changes
  form$.subscribe({
    next: () => {
      // Form validation happens in the individual field streams
      // This subscription ensures the stream is active
    },
    error: (err) => console.error('Form error:', err)
  });
  
  // Handle form submission
  form.addEventListener('submit', handleSubmit);
  
  // Setup password toggle
  setupPasswordToggle();
  
  // Setup modal
  setupModal();
  
  // Initial form state update
  updateFormState();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initForm);
