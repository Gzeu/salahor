# Salahor Monorepo - Project Structure

## Overview
This document outlines the structure of the Salahor monorepo, which is a TypeScript/JavaScript project using pnpm workspaces. The project provides zero-dependency universal connectors between Events, EventTargets, and AsyncIterables.

## Root Directory
```
.
├── .github/                  # GitHub workflows and templates
│   └── workflows/           # CI/CD workflows
├── examples/                # Example implementations
│   ├── basic/              # Basic usage examples
│   ├── advanced/           # Advanced usage examples
│   └── integration/        # Integration examples
├── packages/               # Main packages
│   ├── core/               # Core functionality
│   ├── protocol-connectors/# Protocol-specific connectors
│   ├── frontend/           # Frontend-specific packages
│   ├── backend/            # Backend-specific packages
│   └── utils/              # Shared utilities
├── scripts/                # Build and utility scripts
├── src/                    # Source code for root package
├── tests/                  # Integration and E2E tests
├── .eslintrc.js            # ESLint configuration
├── .gitignore             # Git ignore file
├── .npmrc                 # NPM configuration
├── .prettierrc.js         # Prettier configuration
├── CHANGELOG.md           # Project changelog
├── CONTRIBUTING.md        # Contribution guidelines
├── LICENSE                # License file
├── package.json           # Root package.json
├── pnpm-lock.yaml         # PNPM lock file
├── pnpm-workspace.yaml    # PNPM workspace configuration
├── README.md              # Project documentation
├── setup-monorepo.ps1     # Setup script for Windows
├── tsconfig.base.json     # Base TypeScript configuration
└── tsconfig.json          # Root TypeScript configuration
```

## Packages Structure

### Core (`packages/core/`)
```
core/
├── src/
│   ├── event-stream.ts    # Core event stream implementation
│   ├── operators/        # Stream operators (map, filter, etc.)
│   └── utils/            # Utility functions
├── tests/                # Unit tests
├── package.json
└── tsconfig.json
```

### Protocol Connectors (`packages/protocol-connectors/`)
```
protocol-connectors/
├── websocket/            # WebSocket connector
│   ├── src/
│   │   ├── client/      # WebSocket client implementation
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── server/      # WebSocket server implementation
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── utils/       # Shared utilities
│   │   │   ├── logger.ts
│   │   │   └── errors.ts
│   │   └── index.ts     # Main entry point
│   ├── test/            # Tests
│   │   ├── unit/       # Unit tests
│   │   ├── e2e/        # End-to-end tests
│   │   ├── integration/# Integration tests
│   │   └── utils/      # Test utilities
│   ├── package.json
│   └── tsconfig.json
└── sse/                  # Server-Sent Events connector
    ├── src/
    ├── tests/
    ├── package.json
    └── tsconfig.json
```

### Frontend (`packages/frontend/`)
```
frontend/
├── react/               # React bindings
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
└── vue/                 # Vue bindings
    ├── src/
    ├── tests/
    ├── package.json
    └── tsconfig.json
```

### Backend (`packages/backend/`)
```
backend/
├── node/                # Node.js specific implementations
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
└── deno/                # Deno specific implementations
    ├── src/
    ├── tests/
    ├── package.json
    └── tsconfig.json
```

### Utils (`packages/utils/`)
```
utils/
├── logger/             # Logging utilities
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
└── validator/          # Validation utilities
    ├── src/
    ├── tests/
    ├── package.json
    └── tsconfig.json
```

## Development

### Prerequisites
- Node.js >= 18
- pnpm >= 7.0.0

### Setup
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Adding a New Package
1. Create a new directory under `packages/`
2. Initialize with `pnpm init`
3. Add necessary scripts and dependencies
4. Update root `tsconfig.json` and `package.json` if needed

## Testing Strategy
- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components
- **E2E Tests**: Test complete workflows

## Documentation
- Update `README.md` for each package
- Document public APIs with JSDoc
- Keep `CHANGELOG.md` up to date

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
