import { Operator } from '../types';
/**
 * Creates an operator that skips the first N values from the source stream
 * @param count Number of values to skip
 * @throws {Error} If count is not a non-negative number
 */
export declare function skip<T>(count: number): Operator<T, T>;
//# sourceMappingURL=skip.d.ts.map