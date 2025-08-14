import { EventStream, Operator } from '../types';
import { EventStreamImpl } from '../event-stream';

/**
 * Creates an operator that merges multiple event streams into a single stream.
 * @param sources The event streams to merge
 * @returns An operator function that can be used with the pipe method
 */
export function merge<T>(...sources: EventStream<T>[]): Operator<T, T> {
  return (source: EventStream<T>): EventStream<T> => {
    return new (class extends EventStreamImpl<T> {
      private allSources: EventStream<T>[] = [source, ...sources];
      private unsubscribers: (() => void)[] = [];
      private isCompleted = false;
      private activeListeners = new Set<(value: T) => void>();

      subscribe(listener: (value: T) => void): () => void {
        // If already completed, don't subscribe
        if (this.isCompleted) {
          return () => {};
        }

        this.activeListeners.add(listener);

        // If this is the first subscription, set up the source subscriptions
        if (this.activeListeners.size === 1) {
          // Subscribe to all sources
          this.unsubscribers = this.allSources.map((src) => {
            return src.subscribe((value) => {
              this.emit(value);
            });
          });
        }
        
        // Return a function to unsubscribe
        return () => {
          this.activeListeners.delete(listener);
          
          // If this was the last listener, clean up
          if (this.activeListeners.size === 0) {
            this.complete();
          }
        };
      }

      emit(value: T): void {
        if (this.isCompleted) return;
        
        // Convert to array first to avoid downlevelIteration issues
        // and create a copy to handle unsubscriptions during iteration
        const listenersArray = Array.from(this.activeListeners);
        
        for (const listener of listenersArray) {
          try {
            listener(value);
          } catch (error) {
            console.error('Error in merge operator listener:', error);
          }
        }
      }

      complete(): void {
        if (this.isCompleted) return;
        
        this.isCompleted = true;
        
        // Unsubscribe from all sources
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
        this.activeListeners.clear();
        
        super.complete();
      }
    })();
  };
}
