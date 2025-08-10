# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-08-10

### Added
- **New WebSocket Connector**: Added WebSocket connector for real-time bidirectional communication
  - Supports both client and server modes
  - Automatic reconnection with configurable retry logic
  - Message queuing and backpressure handling
- **New Operators**:
  - `scan`: Applies an accumulator function over the source sequence
  - `zip`: Combines values from multiple async iterables into tuples
- **Dependencies**:
  - Added `ws` as a peer dependency for WebSocket support

### Changed
- **Export/Import**:
  - Fixed export/import patterns for better tree-shaking
  - Resolved circular dependencies in operator exports
  - Improved TypeScript type definitions
- **Documentation**:
  - Updated README with WebSocket connector examples
  - Added JSDoc comments for better IDE support
  - Improved API documentation

### Fixed
- **Memory Leaks**:
  - Improved cleanup of event listeners
  - Better resource management in async iterators
- **Error Handling**:
  - More descriptive error messages
  - Better handling of edge cases in operators
- **Tests**:
  - Added comprehensive tests for WebSocket connector
  - Improved test coverage for operators
  - Fixed flaky tests

### Security
- **Dependencies**:
  - Updated all dependencies to their latest secure versions
  - Added security audit to CI pipeline
- **Input Validation**:
  - Added input validation for all public APIs
  - Improved error handling for invalid inputs

## [0.2.0] - 2025-08-05

### Added
- Initial stable release with core functionality
- Support for Event, EventTarget, and AsyncIterable interop
- Basic set of operators (map, filter, take, etc.)
- Worker utilities for background processing
- Comprehensive test suite

## [0.1.0] - 2025-07-20

### Added
- Initial project setup
- Core connector implementation
- Basic documentation
