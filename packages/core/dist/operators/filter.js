import { EventStreamImpl } from '../event-stream';
/**
 * Creates an operator that filters values from the source stream based on a predicate function.
 * @param predicate A function that tests each value from the source stream
 * @returns An operator function that can be used with the pipe method
 */
export function filter(predicate) {
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
                        if (predicate(value)) {
                            this.emit(value);
                        }
                    }
                    catch (error) {
                        console.error('Error in filter operator:', error);
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
//# sourceMappingURL=filter.js.map