import { test } from '../../test-utils.mjs';
import { filter } from '../../../src/operators/filter.js';
import { fromArray } from '../../test-utils.mjs';

test('filter operator - basic filtering', async (t) => {
  const source = fromArray([1, 2, 3, 4, 5]);
  const filtered = filter(x => x % 2 === 0)(source);
  
  const results = [];
  for await (const value of filtered) {
    results.push(value);
  }
  
  t.deepEqual(results, [2, 4], 'should filter values based on predicate');
});

test('filter operator - with index', async (t) => {
  const source = fromArray(['a', 'b', 'c', 'd']);
  const filtered = filter((_, index) => index % 2 === 0)(source);
  
  const results = await Array.fromAsync(filtered);
  t.deepEqual(results, ['a', 'c'], 'should pass index to predicate function');
});

test('filter operator - empty source', async (t) => {
  const source = fromArray([]);
  const filtered = filter(() => true)(source);
  
  const results = [];
  for await (const value of filtered) {
    results.push(value);
  }
  
  t.deepEqual(results, [], 'should handle empty source');
});

test('filter operator - async predicate', async (t) => {
  const source = fromArray([1, 2, 3, 4, 5]);
  const filtered = filter(async x => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return x > 3;
  })(source);
  
  const results = [];
  for await (const value of filtered) {
    results.push(value);
  }
  
  t.deepEqual(results, [4, 5], 'should handle async predicate functions');
});
