/**
 * Map operator - transforms each value from the source
 * @param {Function} fn - The transformation function
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 */
export function map(fn) {
  return async function* (source) {
    let index = 0;
    for await (const value of source) {
      yield fn(value, index++);
    }
  };
}
