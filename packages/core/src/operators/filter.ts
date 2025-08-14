import { EventStream, Operator } from '../types';
import { EventStreamImpl } from '../event-stream';

/**
 * Creates an operator that filters values from the source stream based on a predicate function.
 * @param predicate A function that tests each value from the source stream
 * @returns An operator function that can be used with the pipe method
 */
export function filter<T>(
  predicate: (value: T) => boolean
): Operator<T, T> {
  return (source: EventStream<T>): EventStream<T> => {
    return new (class extends EventStreamImpl<T> {
      private unsubscribeSource: (() => void) | null = null;

      subscribe(_listener: (value: T) => void): () => void {
        if (this.unsubscribeSource) {
          this.unsubscribeSource();
        }

        this.unsubscribeSource = source.subscribe((value) => {
          try {
            if (predicate(value)) {
              this.emit(value);
            }
          } catch (error) {
            console.error('Error in filter operator:', error);
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
