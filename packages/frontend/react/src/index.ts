/**
 * React integration for the Salahor event streaming library
 * 
 * @packageDocumentation
 */

export * from './useEventStream';
export * from './useEventStreamState';
export * from './StreamContext';

export { StreamProvider, useStream, useStreams, useAddStream, WithStream } from './StreamContext';

export type { UseEventStreamOptions, UseEventStreamStateOptions } from './useEventStream';

// Re-export core types for convenience
export type { EventStream, EventListener, Unsubscribe } from '@salahor/core';

// Re-export core utilities for convenience
export { createEventStream, fromArray, fromAsyncIterable } from '@salahor/core';

// Re-export core operators for convenience
export { map, filter, take, debounce, merge } from '@salahor/core';
