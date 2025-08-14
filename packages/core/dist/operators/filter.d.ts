import { Operator } from '../types';
/**
 * Creates an operator that filters values from the source stream based on a predicate function.
 * @param predicate A function that tests each value from the source stream
 * @returns An operator function that can be used with the pipe method
 */
export declare function filter<T>(predicate: (value: T) => boolean): Operator<T, T>;
//# sourceMappingURL=filter.d.ts.map