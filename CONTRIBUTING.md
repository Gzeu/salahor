# Contributing to Salahor

Thank you for your interest in contributing to Salahor! We appreciate your time and effort in making this project better.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 7 or higher (recommended) or npm 8+
- Git

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally
   ```bash
   git clone https://github.com/your-username/salahor.git
   cd salahor
   ```
3. Install dependencies
   ```bash
   pnpm install
   ```
4. Build the project
   ```bash
   pnpm build
   ```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests for a specific package
cd packages/core && pnpm test
```

### Writing Tests

- Add tests in the `__tests__` directory of each package
- Use `.test.ts` extension for test files
- Follow the existing test patterns
- Ensure tests are deterministic and independent

## 📝 Code Style

- Follow the [TypeScript coding guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
- Use [Prettier](https://prettier.io/) for code formatting
- Use [ESLint](https://eslint.org/) for code quality
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

### Linting

```bash
# Run linter
pnpm lint

# Auto-fix linting issues
pnpm lint --fix
```

## 🚀 Making Changes

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feat/my-awesome-feature
   # or
   git checkout -b fix/annoying-bug
   ```

2. Make your changes and write tests

3. Run tests and linter
   ```bash
   pnpm test
   pnpm lint
   ```

4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push your changes to your fork
   ```bash
   git push origin your-branch-name
   ```

6. Open a Pull Request against the `main` branch

## 📦 Versioning & Release

We use [Changesets](https://github.com/changesets/changesets) for version management.

### For Maintainers

1. Create a changeset for your changes:
   ```bash
   pnpm changeset
   ```
   Follow the prompts to describe your changes and select the appropriate version bump.

2. When ready to release:
   ```bash
   pnpm changeset version
   pnpm install
   git add .
   git commit -m "chore: release"
   git push --follow-tags
   pnpm -r publish --access public
   ```

## 🐛 Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/Gzeu/salahor/issues).

When reporting an issue, please include:

- A clear title and description
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser/Node.js version and OS
- Any relevant error messages or screenshots

## 🤝 Code of Conduct

Please note that this project is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
