# Salahor

[![Simple CI](https://github.com/Gzeu/salahor/actions/workflows/simple-ci.yml/badge.svg)](https://github.com/Gzeu/salahor/actions/workflows/simple-ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-%3C50KB-brightgreen)](https://github.com/Gzeu/salahor)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen)](https://github.com/Gzeu/salahor)

> **High-performance, zero-dependency library for universal connectors between Events, EventTargets, and AsyncIterables**

Salahor is a cutting-edge TypeScript-first library designed for building reactive applications with minimal overhead. It provides seamless universal connectors that bridge different async patterns, optimized for both Node.js (v18+) and modern browsers.

## 🌟 Why Salahor?

- **🚀 Blazing Fast**: Optimized for maximum throughput with minimal memory footprint
- **📦 Zero Dependencies**: Completely self-contained with no external dependencies
- **🌐 Universal**: Works seamlessly in both browser and Node.js environments
- **🔒 Type-Safe**: Built with TypeScript for excellent type safety and IntelliSense
- **🧪 Battle-Tested**: Comprehensive test suite with 100% coverage
- **📊 Performance Monitored**: Automated bundle size and performance tracking
- **⚡ Modern**: Built with latest JavaScript features and best practices

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install salahor

# Using yarn
yarn add salahor

# Using pnpm
pnpm add salahor

# Using bun
bun add salahor
```

### Basic Usage

```typescript
import { createEventStream, map, filter, debounceTime } from 'salahor';

// Create a stream from DOM events
const buttonClicks = createEventStream<MouseEvent>(button, 'click');

// Transform and filter the stream
const processedClicks = buttonClicks
  .pipe(
    debounceTime(300),                    // Debounce rapid clicks
    filter(event => event.clientX > 100), // Only right-side clicks
    map(event => ({                       // Extract coordinates
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    }))
  );

// Consume the stream
for await (const click of processedClicks) {
  console.log('Processed click:', click);
}
```

## 🏗️ Architecture

### Core Concepts

**Event Streams**: Sequences of asynchronous events represented as AsyncIterables, compatible with JavaScript's native async iteration protocols.

**Universal Connectors**: Bridge different async patterns seamlessly:
- DOM EventTarget ↔ AsyncIterable
- Node.js EventEmitter ↔ AsyncIterable  
- Promises ↔ AsyncIterable
- Timers ↔ AsyncIterable

**Stream Operators**: Pure functions that transform streams without side effects:
- **Transformation**: `map`, `filter`, `take`, `skip`
- **Timing**: `debounceTime`, `throttleTime`, `delay`
- **Combination**: `merge`, `zip`, `concat`, `race`
- **Buffering**: `buffer`, `bufferTime`, `bufferCount`

## 📚 API Reference

### Sources

Create streams from various event sources:

```typescript
// DOM Events
const clicks = fromEventTarget(button, 'click');

// Node.js EventEmitter
const messages = fromEventEmitter(emitter, 'message');

// Promises
const data = fromPromise(fetchData());

// Intervals
const ticks = fromInterval(1000);

// Iterables
const numbers = fromIterable([1, 2, 3, 4, 5]);
```

### Operators

#### Transformation

```typescript
// Transform each value
const doubled = map(numbers, n => n * 2);

// Filter values
const evens = filter(numbers, n => n % 2 === 0);

// Take first N values
const firstFive = take(stream, 5);

// Buffer values
const batches = buffer(stream, 10);
```

#### Timing

```typescript
// Debounce rapid emissions
const debounced = debounceTime(inputEvents, 300);

// Throttle emission rate
const throttled = throttleTime(mouseMoves, 100);

// Add delay
const delayed = delay(stream, 1000);
```

#### Combination

```typescript
// Merge multiple streams
const combined = merge(stream1, stream2, stream3);

// Zip streams together
const zipped = zip(stream1, stream2); // [value1, value2]

// Concatenate in sequence
const sequential = concat(stream1, stream2);

// Race for first emission
const winner = race(request1, request2);
```

## 🔧 Development

### Prerequisites

- **Node.js 18+**
- **pnpm 8+** (recommended package manager)

### Setup

```bash
# Clone the repository
git clone https://github.com/Gzeu/salahor.git
cd salahor

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm coverage

# Check bundle sizes
pnpm size

# Type checking
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format
```

### Package Structure

```
salahor/
├── packages/
│   ├── core/                 # Core library implementation
│   ├── backend-express/      # Express.js integration
│   ├── backend-fastify/      # Fastify integration
│   ├── frontend-react/       # React integration
│   └── frontend-vue/         # Vue.js integration
├── examples/                 # Usage examples
├── docs/                     # Documentation
└── scripts/                  # Build and deployment scripts
```

## 📊 Performance

- **Bundle Size**: Core package under 50KB gzipped
- **Memory Efficient**: Optimized for low memory usage
- **High Throughput**: Designed for high-frequency event processing
- **Zero Dependencies**: No external dependencies for core functionality

## 🔒 Security & Quality

- **🛡️ Automated Security Audits**: Regular vulnerability scanning
- **🔍 Type Safety**: Full TypeScript coverage with strict mode
- **✅ Comprehensive Testing**: 100% test coverage with edge cases
- **📋 Code Quality**: ESLint, Prettier, and automated CI/CD
- **🔄 Continuous Integration**: Automated testing and deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow conventional commit format
- Ensure all CI checks pass

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🌍 Community & Support

- **Issues**: [GitHub Issues](https://github.com/Gzeu/salahor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Gzeu/salahor/discussions)
- **Author**: [George Pricop](https://github.com/Gzeu) - Blockchain Developer & AI Automation Specialist

## 🚀 Roadmap

- [ ] **Web Workers Support**: Enhanced worker utilities and RPC
- [ ] **Stream Analytics**: Built-in metrics and monitoring
- [ ] **Plugin System**: Extensible architecture for custom operators
- [ ] **WebSocket Connectors**: Real-time bidirectional communication
- [ ] **Performance Optimizations**: Further memory and speed improvements
- [ ] **Documentation Site**: Comprehensive online documentation

---

**Built with ❤️ by [George Pricop](https://github.com/Gzeu)**

*Salahor - Universal Async Stream Processing for Modern Applications*