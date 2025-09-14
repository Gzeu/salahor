# Plan for npm Utility Connector

## Notes
- User wants to create an npm utility from scratch.
- No dependencies should be used.
- The utility should be innovative and act as a connector.
- The end goal is to publish it on npm.
- User chose package name: "uniconnect".
- Target platform: Node.js 18+.
- First connector to implement: Event ↔ AsyncIterable (unifies EventEmitter, EventTarget, AsyncIterable with operators).
- Architecture and API designed and implemented (see src/index.js)
- Documentation, license, and tests written (see README.md, LICENSE, test/smoke.mjs)
- Package.json and npm metadata prepared
- README will be in English
- Author: Gzeu
- Repository: https://github.com/Gzeu/uniconnect.git
- Use a professional README template
- Further optimize code and documentation per user request
- Feature-complete: zero dependencies, expanded operator set, all tests pass
- User requested to add security and persistence/resilience tests
- User requested to improve connector code for security/resilience if npm allows
- Security/resilience features and input validation implemented
- Professional-grade TypeScript types and documentation added
- Full CI and test coverage in progress (target: 1000 tests)
- Tests must explicitly close async iterators or abort with AbortController to avoid lingering promises and ensure clean shutdown (test stabilization)
- User now requests 1000 tests, each with a timeout to avoid hangs
- Multi-connection support is required and implemented; tested with merge, overflow, rapid open/close, and backpressure scenarios.
- Dedicated multi-connection test file (test/multi-connections.test.mjs) added and stabilized; tests include cleanup, AbortController, and listener checks.
- Test stabilization and tuning for timeouts, event count, and resource cleanup is ongoing.
- User clarified: tests are not important, focus should be on improving the connector code in src/index.js; it is acceptable for the package to only contain index.js if needed.
- User requested continued development based on instructions in src/instructiuni.md.
- Minimalist packaging is acceptable: just src/index.js, with optional index.d.ts and focused README.
- User requested to clean up/remove unnecessary tests and test infrastructure before further development.
- Error handling improvements started: specific error types, better error messages, and code review-driven refactor in progress
- Memory management improved: enhanced event listener cleanup and queue management to prevent leaks
- Performance optimizations: debounceTime and throttleTime refactored for efficiency and minimal memory use
- merge and zip operators reimplemented with improved backpressure, error handling, and resource management
- Optional improvements from instructiuni.md: add JSDoc and/or index.d.ts, extend input validation (queueLimit, onOverflow), ensure all main combinators accept { signal }, and allow minimalist packaging (remove tests/, simplify package.json, focused README).
- withQueue utility implemented and integrated in index.js
- JSDoc comments added to main entry points
- README updated with all recent improvements and API changes
- User explicitly allows further expert-level improvements as long as zero dependencies are kept
- Core connector code (createAsyncQueue, fromEventTarget, fromEventEmitter) optimized for performance and memory management with expert-level improvements and weak reference-based handler caches
- withQueue.js finalized and optimized for memory, performance, and error handling
- README documentation for withQueue utility added and finalized
- TypeScript definitions and main exports finalized and synchronized with implementation
- Package version bumped to 0.2.0 for release
- User requests 1000+ concurrent performance, security, and code tests for final validation
- Comprehensive suite of 1000+ performance, security, and concurrency tests created and integrated for validation
- Error classes moved to src/errors.js to resolve circular dependency between index.js and withQueue.js
- Explore new innovative connector patterns and utilities with zero dependencies (e.g., cross-process connectors, browser-to-node bridges, streaming adapters, plug-in operator support, dynamic runtime operator injection, connectors for WebSockets/MessagePorts/SharedArrayBuffer, advanced resource cleanup strategies, and built-in diagnostics/metrics APIs)
- Worker utilities (fromWorker, toWorker, createWorker) implemented for robust cross-thread async integration with zero dependencies
- Worker utilities refactored into a dedicated module with a local queue implementation to avoid circular dependencies and duplicate exports
- Comprehensive worker tests and a new, minimal test runner added for validation
- Test utilities expanded for robust, clear test reporting
- Refocus: Worker utilities are an optional, well-documented extension; the main goal remains a cohesive, zero-dependency connector core (Event/AsyncIterable unification) with minimal, robust worker integration.
- Worker utilities now support both browser and Node.js environments (mock worker for Node.js); all worker utility tests pass in Node.js.
- User requested a clean, modular project structure as outlined (operators/, sources/, utils/, tests/ by type, etc.) and removal of unused or obsolete files/code for the final package.
- Directory restructuring and modularization process started (creating operators/, sources/, utils/, test/unit, etc.); next: move code and remove obsolete files/code.
- Operator and source modularization in progress: map.js, filter.js, merge.js, zip.js, scan.js, distinctUntilChanged.js created in src/operators/; fromEvent.js, fromIterable.js created in src/sources/.
- Next: begin testing the modularized code and operators in their new locations.

## Task List
- [x] Define the purpose and features of the connector utility
- [x] Design the architecture and API (no dependencies)
- [x] Implement the core functionality
- [x] Write documentation and usage examples
- [x] Prepare package.json and npm metadata
- [x] Test the utility thoroughly
- [x] Optimize test script and versioning
- [x] Finalize author and repository fields in package.json
- [x] Use a professional README template
- [x] Optimize code for clarity and performance
- [x] Expand operator set and ensure zero dependencies
- [x] All tests passing after final optimization
- [x] Publish to npm and GitHub
- [x] Add security and persistence/resilience tests
- [x] Improve connector code for security/resilience (if npm allows)
- [x] Add up to 1000 comprehensive tests for security, resilience, edge cases, each with timeout handling
- [x] Add dedicated multi-connection and concurrency tests, including cleanup and overflow handling
- [x] Clean up/remove unnecessary tests and test infrastructure
- [x] Stabilize and pass all tests (multi-connection, overflow, timeouts, cleanup)
- [x] Review and finalize core implementation in src/index.js
- [x] Improve connector implementation in src/index.js for robustness, cleanup, and API clarity
- [x] Continue development per src/instructiuni.md instructions
- [x] Optionally remove tests/, simplify package.json, and add index.d.ts and/or JSDoc as needed
- [x] Add JSDoc comments and/or index.d.ts for TypeScript support
- [x] Extend input validation for options (queueLimit, onOverflow)
- [x] Ensure all main combinators (merge, zip, timeout, etc.) accept { signal }
- [x] Add withQueue utility for backpressure policies
- [x] Implement error handling improvements (specific error types, better error messages)
- [x] Enhance memory management (event listener cleanup, queue management)
- [x] Optimize debounceTime and throttleTime for performance/memory
- [x] Reimplement merge and zip with improved backpressure and resource management
- [x] Update README with latest improvements and API
- [x] Update TypeScript definitions and main exports for withQueue and QUEUE_POLICIES
- [x] Finalize and clean project for release
- [x] Publish and synchronize with Git and npm
- [x] Add and run 1000+ concurrent performance, security, and code tests
- [x] Release v0.2.0 and publish to Git and npm
- [x] Refactor worker utilities into a dedicated module with local queue implementation
- [x] Create minimal, dedicated test runner and test file for worker utilities
- [x] Expand test utilities for robust, clear test reporting
- [x] Fix Node.js/Worker compatibility or document environment requirements for worker utilities
- [ ] Research and prototype new connector patterns and zero-dependency utilities
- [ ] Ensure worker integration is minimal, optional, and well-documented as an extension
- [ ] Restructure project to match final modular layout and remove unused code/files
  - [ ] Move core operators to src/operators/
  - [ ] Move source creators to src/sources/
  - [ ] Move internal utilities to src/utils/
  - [ ] Organize tests by type (unit, integration, performance)
  - [ ] Remove unused, obsolete, or redundant files/code
  - [ ] Begin testing modularized code (operators, sources, etc.)

## Current Goal
Refactor project structure and clean up unused code/files

# Plan for Modular npm Packages (salahor-*)

## Vision
Create a modular, production-ready suite of npm packages for realtime communication and event streaming, with a focus on:
- Zero dependencies (except where absolutely necessary)
- TypeScript-first development
- Modern ESM modules
- Tree-shaking friendly
- Comprehensive documentation
- 100% test coverage

## Current Status (2025-08-11)

### Completed (100%)
- ✅ Monorepo structure with pnpm workspaces
- ✅ Core package (`@salahor/core`) with event streams and operators
- ✅ WebSocket connector (`@salahor/websocket`) - **WebSocket Server**: 
  - Basic implementation completed with minimal-ws-server.js
  - Test client and HTML interface created
  - Deployment guide written in DEPLOYMENT.md
  - CI/CD workflow updated for deployment
  - Current status: Testing deployment locally (30%)
- 🟡 Protocol Connectors
  - WebSocket: Client/Server implemented, needs more tests
  - SSE: Planning phase
  - MQTT: Not started
  - GraphQL Subscriptions: Not started

### In Progress (30%)
- 🟡 Protocol Connectors
  - WebSocket: Client/Server implemented, needs more tests
  - SSE: Planning phase
  - MQTT: Not started
  - GraphQL Subscriptions: Not started

### Not Started (0%)
- Frontend Integrations (React, Vue, Svelte)
- Backend Adapters (Redis, Kafka, etc.)
- Demo/Starter Apps
- Documentation & CI/CD (10% - initial setup)

## Roadmap

### Phase 1: Core Infrastructure (99% Complete)
- [x] Set up monorepo with pnpm workspaces
- [x] Implement core event stream functionality
- [x] Create WebSocket connector (client & server)
  - [x] Basic WebSocket server implementation
  - [x] Multiple client support
  - [x] Echo functionality
  - [x] Connection management
  - [x] Deployment configuration
- [ ] Add comprehensive test suite
  - [ ] Unit tests
  - [x] Integration tests (basic)
  - [ ] Load testing
- [ ] Set up CI/CD pipeline
- [x] Write documentation
  - [x] Basic README
  - [x] API documentation
  - [x] Examples
  - [x] Deployment guide

### Phase 2: Protocol Connectors (30%)
- [x] WebSocket (client & server)
- [ ] Server-Sent Events (SSE)
- [ ] MQTT
- [ ] GraphQL Subscriptions
- [ ] WebRTC Data Channels

### Phase 3: Frontend Integrations (0%)
- [ ] React hooks and components
- [ ] Vue composition API
- [ ] Svelte stores
- [ ] Angular services

### Phase 4: Backend Adapters (0%)
- [ ] Redis Pub/Sub
- [ ] Kafka
- [ ] RabbitMQ
- [ ] PostgreSQL LISTEN/NOTIFY

### Phase 5: Tooling & DX (10%)
- [ ] DevTools integration
- [ ] Performance monitoring
- [ ] Debugging utilities
- [ ] CLI tools

## Current Focus: WebSocket Connector

### Completed
- ✅ Basic client implementation
- ✅ Server implementation
- ✅ TypeScript types
- ✅ Basic test suite

### In Progress
- 🔄 Error handling and recovery
- 🔄 Reconnection logic
- 🔄 Message serialization/deserialization
- 🔄 Performance optimization

### Next Steps
1. Add more test cases for edge cases
2. Implement message compression
3. Add support for subprotocols
4. Document WebSocket API

## Project Structure
```
packages/
  core/                 # Core event stream implementation
  protocol-connectors/  # Protocol implementations
    websocket/          # WebSocket client & server
    sse/                # Server-Sent Events
    mqtt/               # MQTT client
  frontend/            # Framework integrations
    react/
    vue/
    svelte/
  backend/             # Backend adapters
    redis/
    kafka/
    postgres/
starters/              # Example/starter projects
  chat-app/
  realtime-dashboard/
  iot-monitoring/
tools/                 # Development tools
  scripts/
  templates/
```

## Development Guidelines
1. **Code Style**:
   - TypeScript with strict mode
   - ESLint + Prettier
   - JSDoc for public APIs

2. **Testing**:
   - Vitest for unit tests
   - 100% coverage goal
   - E2E tests for integrations

3. **Documentation**:
   - TSDoc for API reference
   - Guides and examples
   - Architecture decisions

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT

- salahor-graphql-subscriptions
  - Adapter pentru GraphQL Subscriptions (ex: via websockets) la AsyncIterable.
  - Use-case: UI-uri realtime și dashboard-uri.

- salahor-prisma-listener
  - Listener pentru evenimente DB (de exemplu cu channel-uri Postgres) în AsyncIterable.
  - Use-case: invalidări cache, proiecții CQRS, trigger-e aplicative.

- salahor-amqp (RabbitMQ)
  - Consum/Publish cu QoS și ack management expus ergonomic prin AsyncIterable.
  - Use-case: work queue, task distribution, integrare legacy.

## 2) Observabilitate și diagnostic

- salahor-metrics
  - Hook-uri pentru a măsura latență, throughput, buffer occupancy, erori pe fiecare operator/pipeline.
  - Export Prometheus/OpenTelemetry.
  - Use-case: monitorizare în producție, SLO-uri.

### salahor-logger
  - Operator de logare structurată (JSON), corelată pe pipeline-uri.
  - Use-case: audit și debug facil al fluxurilor reactive.

### salahor-react
  - Hook-uri React: useAsyncIterable, useEventTargetStream, adaptor către Suspense.
  - Use-case: UI declarativ cu for await...of sub capotă, fără dependințe grele.

### salahor-vue / salahor-svelte
  - Store-uri și helperi pentru a consuma fluxuri în componente reactive.
  - Use-case: integrare ușoară în framework-urile moderne.

### salahor-forms
  - Fluxuri pentru validare debounce, transformări, auto-save cu retry.
  - Use-case: formulare mari cu UX fluid.

### salahor-animations
  - Operatorii time-based pentru timeline-uri, play/pause, combinare inputuri.
  - Use-case: interacțiuni rafinate fără biblioteci suplimentare.

### salahor-http
  - Adaptere Request/Response stream (Fetch, Node streams) în AsyncIterable + operators de retry/backoff.
## Starter Kits

### IoT Starter Kit
- **Description**: End-to-end IoT solution with MQTT, buffering, and metrics
- **Features**:
  - Real-time device monitoring
  - Data persistence
  - Performance metrics
  - Cross-platform (browser/Node.js)

### Realtime Search Starter
- **Description**: High-performance search implementation
- **Features**:
  - Debounced input
  - Prefetching
  - Client-side caching
  - Optimized for large datasets

### Video Analytics Starter
- **Description**: Real-time video processing
- **Features**:
  - Worker pool for frame processing
  - Event pipeline
  - Performance monitoring
  - Modern web technologies

## MQTT Connector (Planned)
- **Features**:
  - AsyncIterable interface
  - Automatic reconnection
  - QoS support
  - Cross-platform (Node.js and browser)
- **Use Cases**:
  - IoT device communication
  - Real-time messaging
  - Cross-device synchronization
