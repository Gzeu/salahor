/**
 * Merge operator - combines multiple async iterables into one
 * @param {...AsyncIterable} sources - The async iterables to merge
 * @returns {AsyncIterable} A new async iterable that yields values from all sources
 */
function merge(...sources) {
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

      // Array to track active iterators
      const activeIterators = [...iterators];
      
      try {
        // Continue until all iterators are done
        while (activeIterators.length > 0) {
          // Wait for any iterator to yield a value
          const results = await Promise.race(
            activeIterators.map(async (iterator, index) => {
              try {
                const result = await iterator.next();
                return { result, index };
              } catch (error) {
                return { error, index };
              }
            })
          );

          // Handle the result
          if (results.error) {
            // Remove the failed iterator
            activeIterators.splice(activeIterators.indexOf(iterators[results.index]), 1);
            continue;
          }

          const { value, done } = results.result;
          
          if (done) {
            // Remove the completed iterator
            activeIterators.splice(activeIterators.indexOf(iterators[results.index]), 1);
          } else {
            // Yield the value
            yield value;
          }
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

export { merge };
export default merge;
