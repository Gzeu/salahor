import { useCallback, useState, useEffect } from 'react';
import { EventStream, Unsubscribe } from '@salahor/core';

/**
 * Options for the useEventStreamState hook
 */
export interface UseEventStreamStateOptions<T> {
  /**
   * Initial value to use before the first event is received
   */
  initialValue?: T;
  
  /**
   * Callback called when an error occurs in the stream
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback called when the stream completes
   */
  onComplete?: () => void;
  
  /**
   * Equality function to determine if the value has changed
   * @default Object.is
   */
  equalityFn?: (a: T, b: T) => boolean;
}

/**
 * React hook that provides a more React-like API for working with event streams
 * 
 * @param stream The event stream to subscribe to
 * @param options Configuration options
 * @returns A tuple containing the current value and a function to emit new values
 * 
 * @example
 * ```tsx
 * const stream = createEventStream<number>();
 * 
 * function Counter() {
 *   const [count, setCount] = useEventStreamState(stream, { initialValue: 0 });
 *   
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button onClick={() => setCount(prev => prev + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventStreamState<T>(
  stream: EventStream<T> | null | undefined,
  options: UseEventStreamStateOptions<T> = {}
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => void] {
  const { 
    initialValue, 
    onError, 
    onComplete, 
    equalityFn = Object.is 
  } = options;
  
  const [value, setValue] = useState<T | undefined>(initialValue);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isMountedRef = useRef(true);
  const streamRef = useRef(stream);
  
  // Handle stream changes
  const subscribe = useCallback(() => {
    // Unsubscribe from previous stream if it exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // If no stream, do nothing
    if (!stream) {
      return;
    }
    
    // Subscribe to the new stream
    try {
      unsubscribeRef.current = stream.subscribe({
        next: (newValue) => {
          if (isMountedRef.current) {
            setValue(prev => {
              // Only update if the value has changed according to the equality function
              return prev === undefined || !equalityFn(prev, newValue) 
                ? newValue 
                : prev;
            });
          }
        },
        error: (error) => {
          if (isMountedRef.current) {
            onError?.(error);
          }
        },
        complete: () => {
          if (isMountedRef.current) {
            onComplete?.();
          }
        }
      });
    } catch (error) {
      console.error('Error subscribing to stream:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [stream, onError, onComplete, equalityFn]);
  
  // Set up subscription when the component mounts or the stream changes
  useEffect(() => {
    isMountedRef.current = true;
    
    // If the stream has changed, update the ref and resubscribe
    if (streamRef.current !== stream) {
      streamRef.current = stream;
      subscribe();
    }
    
    // Clean up subscription when the component unmounts
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [stream, subscribe]);
  
  // Create a setter function that updates the stream
  const setStreamValue = useCallback((newValueOrUpdater: T | ((prev: T | undefined) => T)) => {
    if (!stream) {
      console.warn('Cannot emit to a null or undefined stream');
      return;
    }
    
    if (typeof newValueOrUpdater === 'function') {
      const updater = newValueOrUpdater as (prev: T | undefined) => T;
      setValue(prev => {
        const nextValue = updater(prev);
        stream.emit(nextValue);
        return nextValue;
      });
    } else {
      const nextValue = newValueOrUpdater as T;
      stream.emit(nextValue);
      setValue(nextValue);
    }
  }, [stream]);
  
  return [value, setStreamValue];
}

/**
 * React hook that creates a memoized event stream with state management
 * 
 * @param initialValue Initial value for the stream
 * @param equalityFn Optional equality function to determine if the value has changed
 * @returns A tuple containing the current value, a function to emit new values, and the stream itself
 * 
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount, countStream] = useEventStreamStateFactory(0);
 *   
 *   // Use countStream with other hooks or components
 *   const doubledCount = useEventStream(countStream.pipe(map(x => x * 2)));
 *   
 *   return (
 *     <div>
 *       <p>Count: {count} (Doubled: {doubledCount})</p>
 *       <button onClick={() => setCount(prev => prev + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventStreamStateFactory<T>(
  initialValue: T,
  equalityFn?: (a: T, b: T) => boolean
): [T, (value: T | ((prev: T) => T)) => void, EventStream<T>] {
  const streamRef = useRef<EventStream<T>>();
  const [value, setValue] = useState<T>(initialValue);
  
  // Create the stream once
  if (!streamRef.current) {
    streamRef.current = (() => {
      const stream = new (class extends EventStream<T> {
        emit(event: T): void {
          super.emit(event);
          setValue(event);
        }
      })();
      
      // Set initial value
      setValue(initialValue);
      
      return stream;
    })();
  }
  
  // Create a memoized setter function
  const setStreamValue = useCallback((newValueOrUpdater: T | ((prev: T) => T)) => {
    if (typeof newValueOrUpdater === 'function') {
      const updater = newValueOrUpdater as (prev: T) => T;
      setValue(prev => {
        const nextValue = updater(prev);
        streamRef.current?.emit(nextValue);
        return nextValue;
      });
    } else {
      const nextValue = newValueOrUpdater as T;
      streamRef.current?.emit(nextValue);
      setValue(nextValue);
    }
  }, []);
  
  // Handle equality comparison
  useEffect(() => {
    if (equalityFn && streamRef.current) {
      const subscription = streamRef.current.subscribe({
        next: (newValue) => {
          setValue(prev => equalityFn(prev, newValue) ? prev : newValue);
        }
      });
      
      return () => {
        subscription();
      };
    }
  }, [equalityFn]);
  
  return [value, setStreamValue, streamRef.current];
}
