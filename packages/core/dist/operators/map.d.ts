import { Operator } from '../types';
/**
 * Creates an operator that applies a mapping function to each value from the source stream.
 * @param fn The mapping function to apply to each value
 * @returns An operator function that can be used with the pipe method
 */
export declare function map<T, R>(fn: (value: T) => R): Operator<T, R>;
//# sourceMappingURL=map.d.ts.map