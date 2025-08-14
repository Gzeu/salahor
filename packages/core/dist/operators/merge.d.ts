import { EventStream, Operator } from '../types';
/**
 * Creates an operator that merges multiple event streams into a single stream.
 * @param sources The event streams to merge
 * @returns An operator function that can be used with the pipe method
 */
export declare function merge<T>(...sources: EventStream<T>[]): Operator<T, T>;
//# sourceMappingURL=merge.d.ts.map