import { EventStreamImpl } from '../event-stream';
/**
 * Creates an operator that takes the first N values from the source stream and then completes.
 * @param count The number of values to take before completing
 * @returns An operator function that can be used with the pipe method
 */
export function take(count) {
    if (count < 0) {
        throw new Error('Count must be a non-negative number');
    }
    return (source) => {
        return new (class extends EventStreamImpl {
            constructor() {
                super(...arguments);
                this.taken = 0;
                this.unsubscribeSource = null;
            }
            subscribe(_listener) {
                if (this.unsubscribeSource) {
                    throw new Error('This stream has already been subscribed to');
                }
                this.unsubscribeSource = source.subscribe((value) => {
                    if (this.taken < count) {
                        this.emit(value);
                        this.taken++;
                        if (this.taken >= count) {
                            this.complete();
                        }
                    }
                });
                return () => {
                    if (this.unsubscribeSource) {
                        this.unsubscribeSource();
                        this.unsubscribeSource = null;
                    }
                };
            }
            complete() {
                if (this.unsubscribeSource) {
                    this.unsubscribeSource();
                    this.unsubscribeSource = null;
                }
                super.complete();
            }
        })();
    };
}
//# sourceMappingURL=take.js.map