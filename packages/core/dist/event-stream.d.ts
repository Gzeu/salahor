import { EventListener, EventStream, Operator, Subscriber, Unsubscribe } from './types';
export declare class EventStreamImpl<T> implements EventStream<T> {
    private listeners;
    private completed;
    /**
     * Checks if there are any active listeners on this stream
     * @protected
     */
    protected hasListeners(): boolean;
    subscribe(listener: EventListener<T> | Subscriber<T>): Unsubscribe;
    private isPromise;
    emit(event: T): void;
    complete(): void;
    pipe<U = T>(...operators: Operator<any, any>[]): EventStream<U>;
}
export declare function createEventStream<T = any>(): EventStream<T>;
export declare function fromAsyncIterable<T>(asyncIterable: AsyncIterable<T>): EventStream<T>;
export declare function fromEventEmitter<T = any>(emitter: NodeJS.EventEmitter, eventName: string | symbol): EventStream<T>;
//# sourceMappingURL=event-stream.d.ts.map