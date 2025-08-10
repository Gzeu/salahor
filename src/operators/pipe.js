/**
 * Pipes a value through a series of functions
 * @param {any} value - The initial value
 * @param {...Function} fns - The functions to apply
 * @returns {any} The result of applying all functions
 */
function pipe(value, ...fns) {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Creates a pipeline of operators that can be applied to an async iterable
 * @param {...Function} operators - The operators to apply in sequence
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 */
function pipeOperators(...operators) {
  return (source) => {
    return pipe(source, ...operators);
  };
}

export { pipe, pipeOperators };
export default pipeOperators;
