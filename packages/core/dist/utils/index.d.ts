/**
 * Utility functions for working with event streams, files, and environment detection
 */
import { EventStream } from '../types';
export * from './file-utils';
export * from './env-utils';
/**
 * Creates a promise that resolves with the next value from the stream
 * @param stream The event stream to listen to
 * @param timeoutMs Optional timeout in milliseconds
 * @returns A promise that resolves with the next value or rejects on timeout
 */
export declare function nextValue<T>(stream: EventStream<T>, timeoutMs?: number): Promise<T>;
/**
 * Collects all values from a stream into an array
 * @param stream The event stream to collect values from
 * @param count Optional maximum number of values to collect
 * @returns A promise that resolves with the collected values
 */
export declare function collect<T>(source: EventStream<T>, count?: number): Promise<T[]>;
/**
 * Creates a stream that emits values at a fixed interval
 * @param intervalMs Interval in milliseconds
 * @param startValue Optional starting value (default: 0)
 * @param increment Optional increment value (default: 1)
 * @returns A new event stream that emits values at the specified interval
 */
export declare function interval(intervalMs: number, startValue?: number, increment?: number): EventStream<number>;
/**
 * Creates a stream from an array of values
 * @param values Array of values to emit
 * @returns A new event stream that emits each value in the array
 */
export declare function fromArray<T>(values: T[]): EventStream<T>;
//# sourceMappingURL=index.d.ts.map