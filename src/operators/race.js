import { AbortError } from '../errors.js';

/**
 * Returns the first value from multiple AsyncIterables
 * @param {...AsyncIterable} iterables - The iterables to race
 * @returns {AsyncIterable} A new async iterable that yields the first value from any source
 */
async function* race(...iterables) {
  const promises = iterables.map(async (iterable, index) => {
    for await (const value of iterable) {
      return { index, value };
    }
    return { index: -1 };
  });
  
  const { index, value } = await Promise.race(promises);
  if (index !== -1) {
    yield value;
  }
}

export default race;
