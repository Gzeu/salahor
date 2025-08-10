import { ValidationError } from '../errors.js';

/**
 * Buffers a number of values from the source and yields them as arrays
 * @param {number} size - The size of the buffer
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If size is not a positive integer
 */
export function buffer(size) {
  if (typeof size !== 'number' || size <= 0 || !Number.isInteger(size)) {
    throw new ValidationError('size must be a positive integer');
  }
  
  return async function* (source) {
    let buffer = [];
    
    for await (const value of source) {
      buffer.push(value);
      
      if (buffer.length >= size) {
        yield buffer;
        buffer = [];
      }
    }
    
    // Yield any remaining values in the buffer
    if (buffer.length > 0) {
      yield buffer;
    }
  };
}

export default buffer;
