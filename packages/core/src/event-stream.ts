import { EventListener, EventStream, Operator, Subscriber, Unsubscribe } from './types';

export class EventStreamImpl<T> implements EventStream<T> {
  private listeners: Set<EventListener<T> | Subscriber<T>> = new Set();
  private completed: boolean = false;

  /**
   * Checks if there are any active listeners on this stream
   * @protected
   */
  protected hasListeners(): boolean {
    return this.listeners.size > 0;
  }

  subscribe(listener: EventListener<T> | Subscriber<T>): Unsubscribe {
    if (this.completed) {
      if (typeof listener === 'object' && listener.complete) {
        // Call complete immediately if already completed
        Promise.resolve().then(() => {
          try {
            listener.complete?.();
          } catch (error) {
            console.error('Error in complete handler:', error);
          }
        });
      }
      return () => {};
    }

    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private isPromise(value: unknown): value is Promise<unknown> {
    return value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
  }

  emit(event: T): void {
    if (this.completed) {
      return;
    }

    // Convert to array first to avoid downlevelIteration issues
    // and create a copy to handle cases where a listener might unsubscribe during iteration
    const listenersArray = Array.from(this.listeners);
    
    for (const listener of listenersArray) {
      try {
        if (typeof listener === 'function') {
          const result = listener(event);
          if (this.isPromise(result)) {
            result.catch((error) => {
              console.error('Error in event listener:', error);
            });
          }
        } else if (listener.next) {
          const result = listener.next(event);
          if (this.isPromise(result)) {
            result.catch((error) => {
              console.error('Error in event listener next:', error);
              listener.error?.(error instanceof Error ? error : new Error(String(error)));
            });
          }
        }
      } catch (error) {
        console.error('Error in event listener:', error);
        if (typeof listener === 'object' && listener.error) {
          try {
            listener.error(error instanceof Error ? error : new Error(String(error)));
          } catch (err) {
            console.error('Error in error handler:', err);
          }
        }
      }
    }
  }

  complete(): void {
    if (this.completed) return;
    
    this.completed = true;
    
    // Get a copy of all listeners and clear them
    const listeners = Array.from(this.listeners);
    this.listeners.clear();
    
    for (const listener of listeners) {
      try {
        if (typeof listener === 'function') {
          // Call function listeners with undefined to indicate completion
          listener(undefined as T);
        } else if (listener.complete) {
          // Call complete method for subscriber objects
          listener.complete();
        }
      } catch (error) {
        console.error('Error in complete handler:', error);
      }
    }
  }

  pipe<U>(...operators: Operator<unknown, unknown>[]): EventStream<U> {
    return operators.reduce(
      (source, operator) => operator(source),
      this as unknown as EventStream<unknown>
    ) as EventStream<U>;
  }
}

export function createEventStream<T>(): EventStream<T> {
  return new EventStreamImpl<T>();
}

// Helper function to create a stream from an async iterable
export function fromAsyncIterable<T>(
  asyncIterable: AsyncIterable<T>
): EventStream<T> {
  const stream = createEventStream<T>();
  
  (async () => {
    try {
      const iterator = asyncIterable[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        stream.emit(value);
      }
    } catch (error) {
      console.error('Error in async iterable:', error);
    } finally {
      stream.complete();
    }
  })();

  return stream;
}

// Helper function to create a stream from an event emitter
export function fromEventEmitter<T>(
  emitter: NodeJS.EventEmitter,
  eventName: string | symbol
): EventStream<T> {
  const stream = createEventStream<T>();
  
  const listener = (value: T) => {
    stream.emit(value);
  };
  
  emitter.on(eventName, listener);
  
  // Return a stream that will clean up the listener when unsubscribed
  return new (class extends EventStreamImpl<T> {
    private isSubscribed = false;

    subscribe(listener: EventListener<T>): Unsubscribe {
      if (!this.isSubscribed) {
        this.isSubscribed = true;
        emitter.on(eventName, listener);
      }
      
      const unsubscribe = super.subscribe(listener);
      
      return () => {
        unsubscribe();
        // If no more listeners, clean up the emitter listener
        if (!this.hasListeners()) {
          emitter.off(eventName, listener);
          this.isSubscribed = false;
        }
      };
    }

    complete(): void {
      if (this.isSubscribed) {
        emitter.off(eventName, listener);
        this.isSubscribed = false;
      }
      super.complete();
    }
  })();
}
