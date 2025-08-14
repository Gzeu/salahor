export class EventStreamImpl {
    constructor() {
        this.listeners = new Set();
        this.completed = false;
    }
    /**
     * Checks if there are any active listeners on this stream
     * @protected
     */
    hasListeners() {
        return this.listeners.size > 0;
    }
    subscribe(listener) {
        if (this.completed) {
            if (typeof listener === 'object' && listener.complete) {
                // Call complete immediately if already completed
                Promise.resolve().then(() => {
                    try {
                        listener.complete?.();
                    }
                    catch (error) {
                        console.error('Error in complete handler:', error);
                    }
                });
            }
            return () => { };
        }
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    isPromise(value) {
        return value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
    }
    emit(event) {
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
                }
                else if (listener.next) {
                    const result = listener.next(event);
                    if (this.isPromise(result)) {
                        result.catch((error) => {
                            console.error('Error in event listener next:', error);
                            listener.error?.(error instanceof Error ? error : new Error(String(error)));
                        });
                    }
                }
            }
            catch (error) {
                console.error('Error in event listener:', error);
                if (typeof listener === 'object' && listener.error) {
                    try {
                        listener.error(error instanceof Error ? error : new Error(String(error)));
                    }
                    catch (err) {
                        console.error('Error in error handler:', err);
                    }
                }
            }
        }
    }
    complete() {
        if (this.completed)
            return;
        this.completed = true;
        // Get a copy of all listeners and clear them
        const listeners = Array.from(this.listeners);
        this.listeners.clear();
        for (const listener of listeners) {
            try {
                if (typeof listener === 'function') {
                    // Call function listeners with undefined to indicate completion
                    listener(undefined);
                }
                else if (listener.complete) {
                    // Call complete method for subscriber objects
                    listener.complete();
                }
            }
            catch (error) {
                console.error('Error in complete handler:', error);
            }
        }
    }
    pipe(...operators) {
        return operators.reduce((source, operator) => operator(source), this);
    }
}
export function createEventStream() {
    return new EventStreamImpl();
}
// Helper function to create a stream from an async iterable
export function fromAsyncIterable(asyncIterable) {
    const stream = createEventStream();
    (async () => {
        try {
            const iterator = asyncIterable[Symbol.asyncIterator]();
            while (true) {
                const { value, done } = await iterator.next();
                if (done)
                    break;
                stream.emit(value);
            }
        }
        catch (error) {
            console.error('Error in async iterable:', error);
        }
        finally {
            stream.complete();
        }
    })();
    return stream;
}
// Helper function to create a stream from an event emitter
export function fromEventEmitter(emitter, eventName) {
    const stream = createEventStream();
    const listener = (value) => {
        stream.emit(value);
    };
    emitter.on(eventName, listener);
    // Return a stream that will clean up the listener when unsubscribed
    return new (class extends EventStreamImpl {
        constructor() {
            super(...arguments);
            this.isSubscribed = false;
        }
        subscribe(listener) {
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
        complete() {
            if (this.isSubscribed) {
                emitter.off(eventName, listener);
                this.isSubscribed = false;
            }
            super.complete();
        }
    })();
}
//# sourceMappingURL=event-stream.js.map