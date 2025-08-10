/**
 * Converts an AsyncIterable to a Promise that resolves with the first value
 * @param {AsyncIterable} asyncIterable - The async iterable to convert
 * @returns {Promise} A promise that resolves with the first value
 */
async function toPromise(asyncIterable) {
  for await (const value of asyncIterable) {
    return value;
  }
  return undefined;
}

export default toPromise;
