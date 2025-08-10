// Type definitions for salahor
// Project: salahor
// Repository: https://github.com/Gzeu/salahor
// NPM: https://www.npmjs.com/package/salahor

import { EventEmitter } from 'node:events';

/** Queue overflow policy for event buffering. */
export const QUEUE_POLICIES: {
  readonly DROP_OLD: 'drop-old';
  readonly DROP_NEW: 'drop-new';
  readonly THROW: 'throw';
};

/** A standard async iterable stream of values. */
export type AsyncGen<T> = AsyncIterable<T>;

/** Queue overflow policy for event buffering. */
export type OverflowPolicy = 'drop-old' | 'drop-new' | 'throw';

/** Common operator signature: transforms an AsyncIterable<T> to AsyncIterable<R>. */
export type Operator<T, R> = (iterable: AsyncIterable<T>) => AsyncGen<R>;

export interface FromOptions {
  signal?: AbortSignal;
  /** Maximum number of queued items awaiting consumption. Use 0 for no buffering, omit for unlimited. */
  queueLimit?: number;
  /** Strategy when queueLimit is reached. Defaults to unlimited unless queueLimit is set. */
  onOverflow?: OverflowPolicy;
}

/**
 * Connects an EventTarget to an AsyncIterable.
 * @param target Any object supporting addEventListener/removeEventListener.
 * @param eventName Non-empty event name to listen for.
 * @param options Abort signal and queue overflow controls.
 */
export function fromEventTarget<T = Event>(target: EventTarget, eventName: string, options?: FromOptions): AsyncGen<T>;

/**
 * Connects a Node.js EventEmitter to an AsyncIterable.
 * @param emitter Node.js EventEmitter instance.
 * @param eventName Non-empty event name to listen for.
 * @param options Abort signal and queue overflow controls.
 */
export function fromEventEmitter<T = unknown>(emitter: EventEmitter, eventName: string, options?: FromOptions): AsyncGen<T>;

/** Auto-detects source type and returns an AsyncIterable from events. */
export function toAsyncIterable<T = unknown>(source: EventTarget | EventEmitter, eventName: string, options?: FromOptions): AsyncGen<T>;

export function toEventEmitter<T = any>(asyncIterable: AsyncIterable<T>, emitter: EventEmitter, eventName: string): Promise<void>;

// Operators
export function map<T, R>(fn: (value: T, index: number) => R): Operator<T, R>;
export function filter<T>(fn: (value: T, index: number) => boolean): Operator<T, T>;
export function take<T>(n: number): Operator<T, T>;
export function buffer<T>(size: number): Operator<T, T[]>;

// pipe overloads for better type inference
export function pipe<A>(iterable: AsyncIterable<A>): AsyncGen<A>;
export function pipe<A, B>(iterable: AsyncIterable<A>, op1: Operator<A, B>): AsyncGen<B>;
export function pipe<A, B, C>(iterable: AsyncIterable<A>, op1: Operator<A, B>, op2: Operator<B, C>): AsyncGen<C>;
export function pipe<A, B, C, D>(iterable: AsyncIterable<A>, op1: Operator<A, B>, op2: Operator<B, C>, op3: Operator<C, D>): AsyncGen<D>;
export function pipe<A, B, C, D, E>(iterable: AsyncIterable<A>, op1: Operator<A, B>, op2: Operator<B, C>, op3: Operator<C, D>, op4: Operator<D, E>): AsyncGen<E>;
export function pipe(iterable: AsyncIterable<unknown>, ...ops: Array<(it: any) => any>): AsyncGen<unknown>;

// Reliability
export interface RetryOptions { attempts?: number; delay?: number; }
export function retryIterable<T>(factory: () => AsyncIterable<T>, options?: RetryOptions): AsyncGen<T>;

// Additional operators
export function scan<T, R>(reducer: (acc: R, value: T, index: number) => R, seed: R): Operator<T, R>;
export function distinctUntilChanged<T>(equals?: (a: T, b: T) => boolean): Operator<T, T>;
export function debounceTime<T>(ms: number): Operator<T, T>;
export function throttleTime<T>(ms: number, opts?: { leading?: boolean; trailing?: boolean }): Operator<T, T>;
export function timeout<T>(ms: number, opts?: { error?: Error }): Operator<T, T>;

// Combinators
export function merge<T>(...iterables: AsyncIterable<T>[]): AsyncGen<T>;
export function zip<A, B>(a: AsyncIterable<A>, b: AsyncIterable<B>): AsyncGen<[A, B]>;
export function zip<A, B, C>(a: AsyncIterable<A>, b: AsyncIterable<B>, c: AsyncIterable<C>): AsyncGen<[A, B, C]>;
export function zip<T extends any[]>(...iterables: { [K in keyof T]: AsyncIterable<T[K]> }): AsyncGen<T>;

/**
 * Applies backpressure policies to any async iterable with optimized memory usage
 * and performance characteristics. Uses a circular buffer internally for efficient queue operations.
 * @param options Configuration options
 * @returns A function that wraps an async iterable with queue behavior
 */
export function withQueue<T>(options?: {
  queueLimit?: number;
  onOverflow?: 'drop-old' | 'drop-new' | 'throw';
  signal?: AbortSignal;
}): <T>(iterable: AsyncIterable<T>) => AsyncIterable<T>;

// Default export (kept for convenience)
declare const _default: {
  fromEventTarget: typeof fromEventTarget,
  fromEventEmitter: typeof fromEventEmitter,
  toAsyncIterable: typeof toAsyncIterable,
  toEventEmitter: typeof toEventEmitter,
  map: typeof map,
  filter: typeof filter,
  take: typeof take,
  buffer: typeof buffer,
  pipe: typeof pipe;
  retryIterable: typeof retryIterable;
  scan: typeof scan;
  distinctUntilChanged: typeof distinctUntilChanged;
  debounceTime: typeof debounceTime;
  throttleTime: typeof throttleTime;
  timeout: typeof timeout;
  merge: typeof merge;
  zip: typeof zip;
  withQueue: typeof withQueue;
  QUEUE_POLICIES: typeof QUEUE_POLICIES;
};
export default _default;
