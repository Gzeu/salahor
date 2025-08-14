# Real-time Search Example

This example demonstrates how to implement a real-time search feature using Salahor's event streams and operators, including debouncing and filtering.

## Features

- Real-time search as you type
- Debouncing to prevent excessive API calls
- Loading states and error handling
- Highlighting of search matches
- Responsive UI with clean design

## What it demonstrates

- Creating and using event streams from DOM events
- Using `debounceTime` to optimize search performance
- Chaining operators with `pipe`
- Handling asynchronous operations (simulated API calls)
- Updating the UI reactively

## How to run

1. Ensure you have built the Salahor packages:
   ```bash
   cd ../../../
   pnpm build
   ```

2. Open the example in a web browser. You can use a simple HTTP server like `http-server` or `serve`:
   ```bash
   # If you have http-server installed globally
   npx http-server . -p 3000
   ```
   Then open http://localhost:3000 in your browser.

3. Start typing in the search box to see real-time search results.

## Code Overview

The example creates a search input that reacts to user input with the following features:

1. **Event Stream Creation**:
   ```typescript
   const searchTerm$ = createEventStream();
   searchInput.addEventListener('input', (e) => {
     searchTerm$.next(e.target.value);
   });
   ```

2. **Search Processing Pipeline**:
   ```typescript
   searchTerm$.pipe(
     map(term => term.trim()),
     filter(term => term.length >= 2),
     debounceTime(300)
   ).subscribe({ /* ... */ });
   ```

3. **Simulated API Call**:
   ```typescript
   async function searchCountries(query) {
     return new Promise((resolve) => {
       setTimeout(() => {
         const results = countries.filter(country =>
           country.toLowerCase().includes(query.toLowerCase())
         );
         resolve(results);
       }, 300 + Math.random() * 500);
     });
   }
   ```

## Key Concepts

- **debounceTime**: Waits for a specified time period after the last source emission before emitting the latest value
- **filter**: Only allows values that meet a certain condition to pass through
- **map**: Transforms each value in the stream
- **Async Operations**: Handling promises and async/await with streams

## Customization

- Adjust the `debounceTime` value to change how long to wait after the user stops typing
- Modify the minimum search term length by changing the `filter` condition
- Replace the simulated API call with a real API endpoint
- Customize the UI styling in the `<style>` section

## Next Steps

- Add error handling for failed API requests
- Implement caching of search results
- Add loading indicators for better UX
- Support keyboard navigation of search results
