/**
 * Creates an AsyncIterable from a Promise that resolves with an array of values
 * @param {Promise<Array>} promise - The promise to convert
 * @returns {AsyncIterable} An async iterable that yields the resolved values
 */
export async function* fromPromise(promise) {
  const values = await promise;
  for (const value of values) {
    yield value;
  }
}

export default fromPromise;
