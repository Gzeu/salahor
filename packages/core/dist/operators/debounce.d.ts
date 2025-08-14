import { Operator } from '../types';
/**
 * Creates an operator that emits a value from the source stream only after a specified duration has passed
 * without any other values being emitted.
 * @param waitMs The number of milliseconds to wait before emitting the last value
 * @returns An operator function that can be used with the pipe method
 */
export declare function debounce<T>(waitMs: number): Operator<T, T>;
//# sourceMappingURL=debounce.d.ts.map