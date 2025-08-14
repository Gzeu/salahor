# @salahor/react-devtools

[![npm version](https://badge.fury.io/js/%40salahor%2Freact-devtools.svg)](https://badge.fury.io/js/%40salahor%2Freact-devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

React DevTools for debugging and monitoring [Salahor](https://github.com/Gzeu/salahor) event streams in your application.

## Features

- 🔍 Inspect all active event streams in your application
- 📊 View real-time stream values and updates
- ⏯️ Pause/resume stream updates
- 🔄 Emit custom values to streams
- 🎨 Light/dark theme support
- 🔌 Zero configuration setup

## Installation

```bash
# Using npm
npm install @salahor/react-devtools

# Using yarn
yarn add @salahor/react-devtools

# Using pnpm
pnpm add @salahor/react-devtools
```

## Quick Start

### Basic Usage

Wrap your application with the `SalahorDevTools` component:

```tsx
import { SalahorDevTools } from '@salahor/react-devtools';

function App() {
  return (
    <>
      {/* Your app components */}
      <SalahorDevTools />
    </>
  );
}
```

### With Custom Options

```tsx
import { SalahorDevTools } from '@salahor/react-devtools';

function App() {
  return (
    <>
      {/* Your app components */}
      <SalahorDevTools 
        defaultOpen={true} 
        position="bottom"
        panelStyle={{ height: '400px' }}
      />
    </>
  );
}
```

### Track Streams Automatically

Use the `useTrackedStream` hook to automatically track streams in the dev tools:

```tsx
import { useTrackedStream } from '@salahor/react-devtools';
import { createEventStream } from '@salahor/core';

function MyComponent() {
  const stream = createEventStream<number>();
  
  // Track the stream in dev tools with a custom name
  useTrackedStream(stream, 'My Stream');
  
  // ... rest of your component
}
```

## API Reference

### `SalahorDevTools` Component

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultOpen` | `boolean` | `false` | Whether the dev tools panel is open by default |
| `position` | `'left' | 'right' | 'top' | 'bottom'` | `'right'` | Position of the dev tools panel |
| `panelStyle` | `React.CSSProperties` | `{}` | Custom styles for the panel |
| `buttonStyle` | `React.CSSProperties` | `{}` | Custom styles for the toggle button |
| `panelClassName` | `string` | `''` | Additional CSS class for the panel |
| `buttonClassName` | `string` | `''` | Additional CSS class for the toggle button |

### `useTrackedStream` Hook

```ts
useTrackedStream(stream: EventStream<T>, name: string): { updateName: (newName: string) => void }
```

Tracks an event stream in the dev tools.

#### Parameters:
- `stream`: The event stream to track
- `name`: Display name for the stream in the dev tools

#### Returns:
An object with an `updateName` function to change the display name of the stream.

## Advanced Usage

### With Higher-Order Component

```tsx
import { withSalahorDevTools } from '@salahor/react-devtools';

function MyApp() {
  return <div>My App</div>;
}

export default withSalahorDevTools(MyApp, {
  defaultOpen: true,
  position: 'bottom'
});
```

### Customizing Stream Display

You can customize how stream values are displayed in the dev tools by providing a custom formatter:

```tsx
import { useTrackedStream } from '@salahor/react-devtools';

function MyComponent() {
  const stream = createEventStream<{ id: string; name: string }>();
  
  useTrackedStream(stream, 'User Stream');
  
  // The stream value will be displayed as a formatted string
  // in the dev tools
  
  return (
    <button onClick={() => stream.emit({ id: '1', name: 'John Doe' })}>
      Emit User
    </button>
  );
}
```

## Development

### Building

```bash
# Build the package
pnpm build

# Watch for changes
pnpm dev
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage
pnpm test:coverage
```

## License

MIT © [Your Name](https://github.com/Gzeu)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
