/**
 * Pipes a value through a series of functions
 * @param {any} value - The initial value
 * @param {...Function} fns - The functions to apply
 * @returns {any} The result of applying all functions
 */
export function pipe(value, ...fns) {
  return fns.reduce((acc, fn) => fn(acc), value);
}

export default pipe;
