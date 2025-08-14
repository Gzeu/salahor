import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEventStream } from '../../event-stream';
import { skip } from '../skip';

describe('skip operator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip the first N values', async () => {
    const values = [1, 2, 3, 4, 5];
    const source = createEventStream<number>();
    const skipCount = 2;
    
    const result: number[] = [];
    const subscription = source.pipe(skip(skipCount)).subscribe(value => {
      result.push(value);
    });

    // Emit values
    values.forEach(v => source.emit(v));
    
    // Should skip first 2 values (1, 2)
    expect(result).toEqual([3, 4, 5]);
    
    subscription(); // Cleanup
  });

  it('should emit all values if count is 0', async () => {
    const values = [1, 2, 3];
    const source = createEventStream<number>();
    
    const result: number[] = [];
    const subscription = source.pipe(skip(0)).subscribe(value => {
      result.push(value);
    });

    values.forEach(v => source.emit(v));
    
    expect(result).toEqual([1, 2, 3]);
    
    subscription(); // Cleanup
  });

  it('should emit no values if count is greater than total values', async () => {
    const values = [1, 2, 3];
    const source = createEventStream<number>();
    
    const result: number[] = [];
    const subscription = source.pipe(skip(5)).subscribe(value => {
      result.push(value);
    });

    values.forEach(v => source.emit(v));
    
    expect(result).toEqual([]);
    
    subscription(); // Cleanup
  });

  it('should throw error if count is negative', () => {
    const source = createEventStream<number>();
    
    expect(() => {
      source.pipe(skip(-1));
    }).toThrow('Count must be a non-negative number');
  });

  it('should handle completion', () => {
    const source = createEventStream<number>();
    const onComplete = vi.fn();
    
    const subscription = source.pipe(skip(2)).subscribe({
      next: () => {},
      complete: onComplete
    });

    source.complete();
    
    expect(onComplete).toHaveBeenCalled();
    
    subscription(); // Cleanup
  });
});
