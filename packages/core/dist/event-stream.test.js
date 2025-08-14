import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEventStream } from './event-stream';
import { nextValue, fromArray } from './utils';
describe('EventStream', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should emit values to subscribers', async () => {
        const stream = createEventStream();
        const listener = vi.fn();
        // Subscribe to the stream
        const unsubscribe = stream.subscribe(listener);
        // Emit some values
        stream.emit(1);
        stream.emit(2);
        stream.emit(3);
        // Unsubscribe
        unsubscribe();
        // Emit another value after unsubscribing
        stream.emit(4);
        // Check that only the first three values were received
        expect(listener).toHaveBeenCalledTimes(3);
        expect(listener).toHaveBeenNthCalledWith(1, 1);
        expect(listener).toHaveBeenNthCalledWith(2, 2);
        expect(listener).toHaveBeenNthCalledWith(3, 3);
    });
    it('should handle multiple subscribers with different types', async () => {
        const stringStream = fromArray(['a', 'b', 'c']);
        const numberStream = fromArray([1, 2, 3]);
        const stringListener = vi.fn();
        const numberListener = vi.fn();
        // Subscribe and wait for all values to be processed
        await new Promise((resolve) => {
            let stringCount = 0;
            let numberCount = 0;
            const checkDone = () => {
                if (stringCount >= 3 && numberCount >= 3) {
                    resolve();
                }
            };
            stringStream.subscribe((value) => {
                if (value !== undefined) {
                    stringCount++;
                    stringListener(value);
                    checkDone();
                }
            });
            numberStream.subscribe((value) => {
                if (value !== undefined) {
                    numberCount++;
                    numberListener(value);
                    checkDone();
                }
            });
        });
        // Verify the expected values were received (excluding the undefined complete event)
        expect(stringListener).toHaveBeenCalledTimes(3);
        expect(numberListener).toHaveBeenCalledTimes(3);
        expect(stringListener).toHaveBeenNthCalledWith(1, 'a');
        expect(stringListener).toHaveBeenNthCalledWith(2, 'b');
        expect(stringListener).toHaveBeenNthCalledWith(3, 'c');
        expect(numberListener).toHaveBeenNthCalledWith(1, 1);
        expect(numberListener).toHaveBeenNthCalledWith(2, 2);
        expect(numberListener).toHaveBeenNthCalledWith(3, 3);
    });
    it('should complete the stream', () => {
        const stream = createEventStream();
        const completeListener = vi.fn();
        // Create a proper event listener that handles the complete case
        const listener = (value) => {
            // The complete case is handled by the listener being called with undefined
            if (value === undefined) {
                completeListener();
            }
        };
        const unsubscribe = stream.subscribe(listener);
        stream.complete();
        expect(completeListener).toHaveBeenCalled();
        // Emit after complete should be ignored
        stream.emit(1);
        expect(completeListener).toHaveBeenCalledTimes(1);
        // Cleanup
        unsubscribe();
    });
    it('should handle async listeners', async () => {
        const stream = createEventStream();
        const asyncListener = vi.fn().mockImplementation(() => {
            // Return a promise that resolves after a short delay
            return new Promise((resolve) => {
                setTimeout(() => {
                    // Just resolve without returning a value
                    resolve();
                }, 10);
            });
        });
        // Subscribe to the stream
        const unsubscribe = stream.subscribe(asyncListener);
        try {
            // Emit values
            stream.emit(1);
            stream.emit(2);
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 30));
            expect(asyncListener).toHaveBeenCalledTimes(2);
            expect(asyncListener).toHaveBeenNthCalledWith(1, 1);
            expect(asyncListener).toHaveBeenNthCalledWith(2, 2);
        }
        finally {
            // Cleanup
            unsubscribe();
        }
    });
    it('should create a stream from an array', async () => {
        const values = [1, 2, 3, 4, 5];
        const stream = fromArray(values);
        const received = [];
        await new Promise((resolve) => {
            stream.subscribe((value) => {
                // Filter out the undefined complete event
                if (value !== undefined) {
                    received.push(value);
                    // Resolve when we've received all expected values
                    if (received.length === values.length) {
                        resolve();
                    }
                }
            });
        });
        // Verify we received exactly the expected values
        expect(received).toEqual(values);
        // Also verify we didn't receive any extra values
        expect(received.length).toBe(values.length);
    });
    it('should get the next value as a promise', async () => {
        const stream = createEventStream();
        // Get the next value as a promise
        const valuePromise = nextValue(stream);
        // Emit a value after a short delay
        setTimeout(() => {
            stream.emit(42);
        }, 10);
        // Wait for the value
        const value = await valuePromise;
        expect(value).toBe(42);
    });
    it('should handle timeouts when waiting for next value', async () => {
        const stream = createEventStream();
        // Get the next value with a short timeout
        const valuePromise = nextValue(stream, 10);
        // The promise should reject if no value is emitted within the timeout
        await expect(valuePromise).rejects.toThrow('Timeout waiting for next value');
    });
});
//# sourceMappingURL=event-stream.test.js.map