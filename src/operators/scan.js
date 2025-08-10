/**
 * Scan operator - applies an accumulator function over the source sequence
 * @param {Function} reducer - The accumulator function (acc, value, index) => newAcc
 * @param {*} seed - The initial accumulator value
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 */
function scan(reducer, seed) {
  return async function* (source) {
    let acc = seed;
    let index = 0;
    
    for await (const value of source) {
      acc = reducer(acc, value, index++);
      yield acc;
    }
  };
}

export { scan };
export default scan;
