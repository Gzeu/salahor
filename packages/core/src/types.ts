/**
 * Core type definitions for Salahor
 */

export interface EventListener<T = any> {
  (event: T): void | Promise<void>;
}

export interface Unsubscribe {
  (): void;
}

export interface EventStream<T = any> {
  /**
   * Subscribe to events from this stream
   * @param listener The callback to be called when an event is emitted
   * @returns A function to unsubscribe
   */
  subscribe(listener: EventListener<T>): Unsubscribe;
  
  /**
   * Emit an event to all subscribers
   * @param event The event to emit
   */
  emit(event: T): void;
  
  /**
   * Complete the stream, unsubscribing all listeners
   */
  complete(): void;
  
  /**
   * Create a new stream by applying operators to this stream
   */
  pipe<U = T>(...operators: Operator<T, any>[]): EventStream<U>;
}

export interface Operator<T, R> {
  (source: EventStream<T>): EventStream<R>;
}

export interface Subscriber<T> {
  next(value: T): void;
  error?(error: Error): void;
  complete?(): void;
}

export interface Subscription {
  unsubscribe(): void;
}
