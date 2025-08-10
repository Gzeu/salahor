/**
 * Concatenates multiple AsyncIterables into a single AsyncIterable
 * @param {...AsyncIterable} iterables - The iterables to concatenate
 * @returns {AsyncIterable} A new async iterable that yields all values in sequence
 */
async function* concat(...iterables) {
  for (const iterable of iterables) {
    for await (const value of iterable) {
      yield value;
    }
  }
}

export default concat;
