# Salahor

[![Simple CI](https://github.com/Gzeu/salahor/actions/workflows/simple-ci.yml/badge.svg)](https://github.com/Gzeu/salahor/actions/workflows/simple-ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)

A high-performance, zero-dependency library that provides universal connectors between Events, EventTargets, and AsyncIterables. Optimized for both Node.js (v18+) and modern browsers, it's perfect for building reactive applications with minimal overhead.

## ✨ Features

- **Universal Connectors**: Seamlessly connect between different async patterns
- **Cross-Platform**: Works in both browser and Node.js environments  
- **High Performance**: Optimized for maximum throughput and minimal overhead
- **TypeScript First**: Built with TypeScript for excellent type safety
- **Zero Dependencies**: Lightweight and dependency-free
- **Modern CI/CD**: Comprehensive testing and monitoring pipeline
- **Bundle Size Monitoring**: Automated size limit checking
- **Stream Processing**: Advanced async iterable stream processing

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install salahor

# Using yarn
yarn add salahor

# Using pnpm
pnpm add salahor
```

### Basic Usage

```typescript
import { createEventStream } from '@salahor/core';

// Create a stream from DOM events
const stream = createEventStream<MouseEvent>();

// Subscribe to events
stream.subscribe(event => {
  console.log('Event received:', event);
});

// Emit events
stream.emit(new MouseEvent('click'));
```

## 📚 Documentation

For detailed documentation and examples, visit our [GitHub repository](https://github.com/Gzeu/salahor).

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- pnpm 8+

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
```

### Scripts

- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm coverage` - Run tests with coverage
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code
- `pnpm size` - Check bundle sizes
- `pnpm typecheck` - Type check all code

## 📊 Project Status

### CI/CD Pipeline

Our Simple CI workflow provides:

- ✅ **Lint**: ESLint with TypeScript support
- ✅ **Build**: Multi-package build with artifacts
- ✅ **Test & Coverage**: Comprehensive test suite with coverage reports
- ✅ **Size Limit**: Automated bundle size monitoring
- ✅ **Summary**: Detailed build status reporting

### Package Structure

- `packages/core/` - Core library implementation
- `packages/backend-express/` - Express.js integration
- `packages/backend-fastify/` - Fastify integration
- `packages/frontend-react/` - React integration
- `packages/frontend-vue/` - Vue.js integration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Performance

- **Zero Dependencies**: No external dependencies for core functionality
- **Bundle Size**: Core package under 50KB gzipped
- **Memory Efficient**: Optimized for low memory usage
- **High Throughput**: Designed for high-frequency event processing

## 🔒 Security

- **Automated Audits**: Regular security vulnerability scanning
- **Type Safety**: Full TypeScript coverage
- **Best Practices**: Following modern JavaScript security practices

---

**Built with ❤️ by [Gzeu](https://github.com/Gzeu)**
