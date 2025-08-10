import { test } from '../../test-utils.mjs';
import { merge } from '../../../src/operators/merge.js';
import { fromArray } from '../../test-utils.mjs';

async function* asyncArray(array) {
  for (const item of array) {
    yield item;
  }
}

test('merge operator - basic merging', async (t) => {
  const source1 = fromArray([1, 3, 5]);
  const source2 = fromArray([2, 4, 6]);
  const merged = merge(source1, source2);
  
  const results = [];
  for await (const value of merged) {
    results.push(value);
  }
  
  results.sort((a, b) => a - b);
  t.deepEqual(results, [1, 2, 3, 4, 5, 6], 'should merge values from both sources');
});

test('merge operator - different length sources', async (t) => {
  const source1 = fromArray([1, 3]);
  const source2 = fromArray([2, 4, 5, 6]);
  const merged = merge(source1, source2);
  
  const results = [];
  for await (const value of merged) {
    results.push(value);
  }
  
  results.sort((a, b) => a - b);
  t.deepEqual(results, [1, 2, 3, 4, 5, 6], 'should handle sources of different lengths');
});

test('merge operator - async sources', async (t) => {
  async function* delayedArray(array) {
    for (const item of array) {
      await new Promise(resolve => setTimeout(resolve, 10));
      yield item;
    }
  }
  
  const source1 = delayedArray([1, 3, 5]);
  const source2 = delayedArray([2, 4, 6]);
  const merged = merge(source1, source2);
  
  const results = [];
  for await (const value of merged) {
    results.push(value);
  }
  
  results.sort((a, b) => a - b);
  t.deepEqual(results, [1, 2, 3, 4, 5, 6], 'should handle async sources');
});
