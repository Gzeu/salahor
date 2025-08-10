/**
 * Distinct until changed operator - only emits values that are different from the previous value
 * @param {Function} [equals] - Optional comparison function (a, b) => boolean
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 */
/**
 * Distinct until changed operator - only emits values that are different from the previous value
 * @param {Function} [equals] - Optional comparison function (a, b) => boolean
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 */
function distinctUntilChanged(equals = (a, b) => a === b) {
  return async function* (source) {
    let first = true;
    let previous;
    
    for await (const value of source) {
      if (first || !equals(previous, value)) {
        first = false;
        previous = value;
        yield value;
      }
    }
  };
}

export { distinctUntilChanged };
export default distinctUntilChanged;
