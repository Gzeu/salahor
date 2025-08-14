# Reactive Form Validation with Salahor

This example demonstrates how to build a reactive form with real-time validation using Salahor's event streams. The form includes various validation rules, error messages, and visual feedback.

## Features

- **Real-time validation** with instant feedback
- **Custom validation rules** with error messages
- **Password strength meter** with visual feedback
- **Responsive design** that works on all devices
- **Form state management** with Salahor streams
- **Accessible** form controls and error messages
- **Interactive UI** with loading states and success messages

## How It Works

The form uses Salahor's event streams to handle user input and validation in a reactive way:

1. **Event Streams**: Each form field has its own event stream that emits values on input and blur events.
2. **Validation**: Custom validators are applied to each field based on data attributes.
3. **State Management**: The form state is managed reactively, updating the UI based on validation results.
4. **Visual Feedback**: Fields show validation states (valid/invalid) and display error messages.
5. **Form Submission**: The submit button is enabled/disabled based on form validity.

## Validation Rules

The form includes the following validation rules:

- **Required fields**: All fields are required
- **Email format**: Validates email format
- **Minimum length**: Enforces minimum length for usernames and passwords
- **Alphanumeric usernames**: Only allows letters and numbers in usernames
- **Strong passwords**: Requires uppercase, lowercase, numbers, and special characters
- **Password confirmation**: Ensures password and confirm password match
- **Terms acceptance**: Requires accepting terms and conditions

## Running the Example

1. Make sure you have Node.js and pnpm installed
2. Install dependencies in the root directory:
   ```bash
   pnpm install
   ```
3. Build the core package:
   ```bash
   pnpm build --filter @salahor/core
   ```
4. Start the development server from the examples directory:
   ```bash
   cd examples
   pnpm install
   pnpm start
   ```
5. Open http://localhost:3000/web/form-validation in your browser

## Code Structure

- `index.html` - The main HTML file with the form structure
- `css/styles.css` - Styles for the form and validation states
- `js/form-validator.js` - The main JavaScript file with the validation logic

## Key Concepts

### Creating Field Streams

Each form field has its own event stream that handles input and validation:

```javascript
const createFieldStream = (field) => {
  const input = field.querySelector('input, textarea, select');
  // ... create event streams and validation
};
```

### Validation Rules

Validation rules are defined as functions that return an object with `isValid` and `message` properties:

```javascript
const validators = {
  required: (value, fieldName) => ({
    isValid: value.trim() !== '',
    message: `${fieldName} is required`
  }),
  // ... more validators
};
```

### Form State Management

The form state is managed reactively, with updates triggering UI changes:

```javascript
function updateFormState() {
  // Update form validity and UI
}
```

## Extending the Example

### Adding New Validation Rules

To add a new validation rule:

1. Add a new function to the `validators` object
2. Apply it to a field using the `data-validate` attribute

Example:
```javascript
// In form-validator.js
validators.customRule = (value, fieldName, param) => ({
  isValid: /* validation logic */,
  message: `Custom validation message`
});
```

```html
<!-- In index.html -->
<input data-validate="required,customRule:param">
```

### Styling

Customize the look and feel by modifying the CSS in `css/styles.css`. The form uses CSS custom properties for colors and spacing, making it easy to theme.

## License

MIT
