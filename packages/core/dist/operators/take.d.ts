import { Operator } from '../types';
/**
 * Creates an operator that takes the first N values from the source stream and then completes.
 * @param count The number of values to take before completing
 * @returns An operator function that can be used with the pipe method
 */
export declare function take<T>(count: number): Operator<T, T>;
//# sourceMappingURL=take.d.ts.map