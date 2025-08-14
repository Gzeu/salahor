import { EventStreamImpl } from '../event-stream';
/**
 * Creates an operator that applies a mapping function to each value from the source stream.
 * @param fn The mapping function to apply to each value
 * @returns An operator function that can be used with the pipe method
 */
export function map(fn) {
    return (source) => {
        return new (class extends EventStreamImpl {
            constructor() {
                super(...arguments);
                this.unsubscribeSource = null;
            }
            subscribe(_listener) {
                if (this.unsubscribeSource) {
                    this.unsubscribeSource();
                }
                this.unsubscribeSource = source.subscribe((value) => {
                    try {
                        const result = fn(value);
                        this.emit(result);
                    }
                    catch (error) {
                        console.error('Error in map operator:', error);
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
//# sourceMappingURL=map.js.map