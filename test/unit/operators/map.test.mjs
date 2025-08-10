import { test } from '../../test-utils.mjs';
import { map } from '../../../src/operators/map.js';
import { fromArray } from '../../test-utils.mjs';

test('map operator - basic transformation', async (t) => {
  const source = fromArray([1, 2, 3]);
  const mapped = map(x => x * 2)(source);
  
  const results = [];
  for await (const value of mapped) {
    results.push(value);
  }
  
  t.deepEqual(results, [2, 4, 6], 'should apply transformation to each value');
});

test('map operator - with index', async (t) => {
  const source = fromArray(['a', 'b', 'c']);
  const mapped = map((value, index) => `${value}${index}`)(source);
  
  const results = await Array.fromAsync(mapped);
  t.deepEqual(results, ['a0', 'b1', 'c2'], 'should pass index to mapper function');
});

test('map operator - empty source', async (t) => {
  const source = fromArray([]);
  const mapped = map(x => x * 2)(source);
  
  const results = [];
  for await (const value of mapped) {
    results.push(value);
  }
  
  t.deepEqual(results, [], 'should handle empty source');
});

test('map operator - async mapper', async (t) => {
  const source = fromArray([1, 2, 3]);
  const mapped = map(async x => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return x * 2;
  })(source);
  
  const results = [];
  for await (const value of mapped) {
    results.push(value);
  }
  
  t.deepEqual(results, [2, 4, 6], 'should handle async mapper functions');
});
