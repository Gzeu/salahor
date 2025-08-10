/**
 * Filter operator - filters values from the source based on a predicate
 * @param {Function} predicate - The filter function
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 */
function filter(predicate) {
  return async function* (source) {
    let index = 0;
    for await (const value of source) {
      if (predicate(value, index++)) {
        yield value;
      }
    }
  };
}

export { filter };
export default filter;
