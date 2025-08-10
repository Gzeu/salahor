/**
 * Zip operator - combines values from multiple async iterables into tuples
 * @param {...AsyncIterable} sources - The async iterables to zip together
 * @returns {AsyncIterable} A new async iterable that yields arrays of values from each source
 */
export function zip(...sources) {
  return {
    async *[Symbol.asyncIterator]() {
      // Convert each source to an async iterator
      const iterators = sources.map(source => {
        const iterator = source[Symbol.asyncIterator]();
        return {
          next: () => iterator.next(),
          return: () => iterator.return ? iterator.return() : Promise.resolve({ done: true })
        };
      });

      try {
        while (true) {
          // Get the next value from each iterator
          const results = await Promise.all(
            iterators.map(iterator => iterator.next())
          );

          // If any iterator is done, we're done
          if (results.some(({ done }) => done)) {
            break;
          }

          // Yield the array of values
          yield results.map(({ value }) => value);
        }
      } finally {
        // Clean up all iterators
        await Promise.all(
          iterators.map(iterator => iterator.return ? iterator.return() : Promise.resolve())
        );
      }
    }
  };
}
