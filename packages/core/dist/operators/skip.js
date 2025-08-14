import { EventStreamImpl } from '../event-stream';
/**
 * Creates an operator that skips the first N values from the source stream
 * @param count Number of values to skip
 * @throws {Error} If count is not a non-negative number
 */
export function skip(count) {
    if (typeof count !== 'number' || count < 0) {
        throw new Error('Count must be a non-negative number');
    }
    if (count <= 0) {
        return (source) => source;
    }
    return (source) => {
        return new (class extends EventStreamImpl {
            constructor() {
                super();
                this.skipped = 0;
                this.unsubscribeSource = null;
                this.sourceComplete = false;
                this.isCompleted = false;
                this.setupSourceSubscription(source);
            }
            setupSourceSubscription(sourceStream) {
                // Create a wrapper function to handle the subscription
                const handler = (value) => {
                    if (this.skipped < count) {
                        this.skipped++;
                    }
                    else {
                        this.emit(value);
                    }
                };
                // Store the unsubscribe function
                this.unsubscribeSource = sourceStream.subscribe(handler);
                // If the source is already completed, complete this stream
                if (sourceStream instanceof EventStreamImpl && sourceStream.completed) {
                    this.complete();
                }
                else {
                    // Use a type assertion to handle the Subscriber type
                    const completeHandler = {
                        next: () => { },
                        complete: () => this.complete()
                    };
                    // Store the second subscription's unsubscribe function
                    const completeUnsubscribe = sourceStream.subscribe(completeHandler);
                    // Update the unsubscribe function to clean up both subscriptions
                    const originalUnsubscribe = this.unsubscribeSource;
                    this.unsubscribeSource = () => {
                        originalUnsubscribe();
                        completeUnsubscribe();
                    };
                }
            }
            subscribe(listener) {
                // If source already completed, complete new subscribers on next tick
                if (this.sourceComplete) {
                    process.nextTick(() => {
                        if (this.hasListeners()) {
                            this.complete();
                        }
                    });
                }
                // Use the parent class's subscribe method which handles the Set of listeners
                const unsubscribe = super.subscribe(listener);
                return () => {
                    unsubscribe();
                    // Clean up source subscription if no more listeners
                    if (!this.hasListeners() && this.unsubscribeSource) {
                        this.unsubscribeSource();
                        this.unsubscribeSource = null;
                    }
                };
            }
            complete() {
                if (this.isCompleted)
                    return;
                this.isCompleted = true;
                this.sourceComplete = true;
                // Clean up source subscription first
                if (this.unsubscribeSource) {
                    this.unsubscribeSource();
                    this.unsubscribeSource = null;
                }
                // Let the parent class handle the completion of listeners
                super.complete();
            }
        })();
    };
}
//# sourceMappingURL=skip.js.map