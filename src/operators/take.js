import { ValidationError } from '../errors.js';

/**
 * Creates an async iterable that emits only the first n values from the source
 * @param {number} n - The number of values to take
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If n is not a positive integer
 */
export function take(n) {
  if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
    throw new ValidationError('n must be a non-negative integer');
  }
  
  return async function* (source) {
    if (n === 0) return;
    
    let count = 0;
    for await (const value of source) {
      yield value;
      if (++count >= n) break;
    }
  };
}

export default take;
