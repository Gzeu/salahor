// Type definitions for @salahor/core

declare module '@salahor/core' {
  // Define the EventStream interface
  export interface EventStream<T> {
    subscribe(observer: {
      next?: (value: T) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }): { unsubscribe: () => void };
    
    next(value: T): void;
    error(error: Error): void;
    complete(): void;
    
    pipe(...operators: any[]): EventStream<any>;
    map<U>(fn: (value: T) => U): EventStream<U>;
    filter(predicate: (value: T) => boolean): EventStream<T>;
    merge<U>(...streams: EventStream<U>[]): EventStream<T | U>;
  }

  // Define the createEventStream function
  export function createEventStream<T>(): EventStream<T>;
  
  // Export other core types and functions as needed
  export * from '@salahor/core/dist/types';
}
