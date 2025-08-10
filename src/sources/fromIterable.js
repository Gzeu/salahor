/**
 * Creates an async iterable from any iterable or async iterable
 * @param {Iterable|AsyncIterable} source - The source iterable
 * @returns {AsyncIterable} An async iterable that yields values from the source
 */
export function fromIterable(source) {
  // If source is already async iterable, return it directly
  if (source && typeof source[Symbol.asyncIterator] === 'function') {
    return source;
  }

  // For sync iterables, convert to async
  if (source && typeof source[Symbol.iterator] === 'function') {
    return {
      async *[Symbol.asyncIterator]() {
        for (const value of source) {
          yield value;
        }
      }
    };
  }

  throw new Error('Source must be an iterable or async iterable');
}
