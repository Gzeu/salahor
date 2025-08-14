import { EventStream, Operator } from '../types';
import { EventStreamImpl } from '../event-stream';

/**
 * Creates an operator that takes the first N values from the source stream and then completes.
 * @param count The number of values to take before completing
 * @returns An operator function that can be used with the pipe method
 */
export function take<T>(count: number): Operator<T, T> {
  if (count < 0) {
    throw new Error('Count must be a non-negative number');
  }

  return (source: EventStream<T>): EventStream<T> => {
    return new (class extends EventStreamImpl<T> {
      private taken = 0;
      private unsubscribeSource: (() => void) | null = null;

      subscribe(_listener: (value: T) => void): () => void {
        if (this.unsubscribeSource) {
          throw new Error('This stream has already been subscribed to');
        }

        this.unsubscribeSource = source.subscribe((value) => {
          if (this.taken < count) {
            this.emit(value);
            this.taken++;
            
            if (this.taken >= count) {
              this.complete();
            }
          }
        });

        return () => {
          if (this.unsubscribeSource) {
            this.unsubscribeSource();
            this.unsubscribeSource = null;
          }
        };
      }

      complete(): void {
        if (this.unsubscribeSource) {
          this.unsubscribeSource();
          this.unsubscribeSource = null;
        }
        super.complete();
      }
    })();
  };
}
