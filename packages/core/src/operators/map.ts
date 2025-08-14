import { EventStream, Operator } from '../types';
import { EventStreamImpl } from '../event-stream';

/**
 * Creates an operator that applies a mapping function to each value from the source stream.
 * @param fn The mapping function to apply to each value
 * @returns An operator function that can be used with the pipe method
 */
export function map<T, R>(fn: (value: T) => R): Operator<T, R> {
  return (source: EventStream<T>): EventStream<R> => {
    return new (class extends EventStreamImpl<R> {
      private unsubscribeSource: (() => void) | null = null;

      subscribe(_listener: (value: R) => void): () => void {
        if (this.unsubscribeSource) {
          this.unsubscribeSource();
        }
        
        this.unsubscribeSource = source.subscribe((value) => {
          try {
            const result = fn(value);
            this.emit(result);
          } catch (error) {
            console.error('Error in map operator:', error);
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
