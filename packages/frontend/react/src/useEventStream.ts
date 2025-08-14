import { useEffect, useRef, useState, useCallback } from 'react';
import { EventStream, Unsubscribe } from '@salahor/core';

/**
 * Options for the useEventStream hook
 */
export interface UseEventStreamOptions<T> {
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
}

/**
 * React hook that subscribes to an EventStream and returns its current value
 * 
 * @param stream The event stream to subscribe to
 * @param options Configuration options
 * @returns The current value from the stream
 * 
 * @example
 * ```tsx
 * const stream = createEventStream<number>();
 * 
 * function Counter() {
 *   const count = useEventStream(stream, { initialValue: 0 });
 *   
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button onClick={() => stream.emit(count + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventStream<T>(
  stream: EventStream<T> | null | undefined,
  options: UseEventStreamOptions<T> = {}
): T | undefined {
  const { initialValue, onError, onComplete } = options;
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
      unsubscribeRef.current = stream.subscribe((newValue) => {
        if (isMountedRef.current) {
          setValue(newValue);
        }
      });
      
      // Store the error and complete handlers separately
      // since the EventStream interface doesn't support them directly
      const originalEmit = stream.emit.bind(stream);
      const originalComplete = stream.complete.bind(stream);
      
      // Override emit to check for error objects
      stream.emit = (event: any) => {
        if (event instanceof Error) {
          if (isMountedRef.current) {
            onError?.(event);
          }
        } else {
          originalEmit(event);
        }
        return stream;
      };
      
      // Override complete to call the onComplete callback
      stream.complete = () => {
        if (isMountedRef.current) {
          onComplete?.();
        }
        return originalComplete();
      };
    } catch (error) {
      console.error('Error subscribing to stream:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [stream, onError, onComplete]);
  
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
  
  return value;
}

/**
 * React hook that creates a memoized event stream that is automatically cleaned up
 * 
 * @param factory Function that creates the event stream
 * @param deps Dependencies array that triggers recreation of the stream when changed
 * @returns The created event stream
 * 
 * @example
 * ```tsx
 * function createUserStream(userId: string) {
 *   return createEventStream<UserEvent>();
 * }
 * 
 * function UserProfile({ userId }) {
 *   const userStream = useEventStreamFactory(
 *     () => createUserStream(userId),
 *     [userId] // Recreate when userId changes
 *   );
 *   
 *   // ... use userStream with useEventStream
 * }
 * ```
 */
export function useEventStreamFactory<T>(
  factory: () => EventStream<T>,
  deps: React.DependencyList = []
): EventStream<T> {
  const streamRef = useRef<EventStream<T>>();
  
  // Create the stream once and update when deps change
  if (!streamRef.current) {
    streamRef.current = factory();
  }
  
  // Clean up the stream when the component unmounts or deps change
  useEffect(() => {
    const stream = streamRef.current;
    
    return () => {
      if (stream) {
        stream.complete();
      }
    };
  }, deps);
  
  return streamRef.current;
}
