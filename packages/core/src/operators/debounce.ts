import { EventStream, Operator } from '../types';
import { EventStreamImpl } from '../event-stream';

/**
 * Creates an operator that emits a value from the source stream only after a specified duration has passed
 * without any other values being emitted.
 * @param waitMs The number of milliseconds to wait before emitting the last value
 * @returns An operator function that can be used with the pipe method
 */
export function debounce<T>(waitMs: number): Operator<T, T> {
  if (waitMs < 0) {
    throw new Error('Wait time must be a non-negative number');
  }

  return (source: EventStream<T>): EventStream<T> => {
    return new (class extends EventStreamImpl<T> {
      private timeoutId: ReturnType<typeof setTimeout> | null = null;
      private unsubscribeSource: (() => void) | null = null;

      subscribe(_listener: (value: T) => void): () => void {
        if (this.unsubscribeSource) {
          return () => {}; // Already subscribed
        }

        this.unsubscribeSource = source.subscribe((value) => {
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
          }

          this.timeoutId = setTimeout(() => {
            this.emit(value);
            this.timeoutId = null;
          }, waitMs);
        });

        return () => {
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }
          if (this.unsubscribeSource) {
            this.unsubscribeSource();
            this.unsubscribeSource = null;
          }
        };
      }

      complete(): void {
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        if (this.unsubscribeSource) {
          this.unsubscribeSource();
          this.unsubscribeSource = null;
        }
        super.complete();
      }
    })();
  };
}
